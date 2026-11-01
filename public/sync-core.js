// sync-core.js
// Pure sync logic: hybrid logical clocks, operations, domain-aware merges,
// idempotent replay, and resumable delta sync. No browser or Firebase APIs.

const MAX_DRIFT_MS = 60_000; // refuse remote stamps more than 60 s ahead of our clock

// ---------- Hybrid logical clock ----------
// A stamp is { wall, counter, node }.
// wall = largest physical time seen, counter orders events in the same wall time,
// node breaks exact ties.
export function createClock(nodeId, now = () => Date.now()) {
  let wall = 0, counter = 0;

  function tick() {
    const pt = now();
    if (pt > wall) { wall = pt; counter = 0; }
    else { counter += 1; }
    return { wall, counter, node: nodeId };
  }

  function receive(remote) {
    const pt = now();
    if (remote.wall - pt > MAX_DRIFT_MS) {
      throw new Error("remote clock too far ahead: " + remote.node);
    }
    const prev = wall;
    wall = Math.max(prev, remote.wall, pt);
    if (wall === prev && wall === remote.wall) counter = Math.max(counter, remote.counter) + 1;
    else if (wall === prev) counter += 1;
    else if (wall === remote.wall) counter = remote.counter + 1;
    else counter = 0;
    return { wall, counter, node: nodeId };
  }

  return {
    tick,
    receive,
    state: () => ({ wall, counter }),
    restore(s) { wall = s.wall; counter = s.counter; }
  };
}

export function compareStamps(a, b) {
  if (a.wall !== b.wall) return a.wall < b.wall ? -1 : 1;
  if (a.counter !== b.counter) return a.counter < b.counter ? -1 : 1;
  return a.node < b.node ? -1 : a.node > b.node ? 1 : 0;
}

// ---------- Replica state (one per child) ----------
export function emptyReplica(childId) {
  return { childId, applied: {}, profile: {}, vax: {}, entries: {} };
}

// Applies one op. Returns false if it was already applied (idempotent replay).
export function applyOp(rep, op) {
  if (rep.applied[op.id]) return false;

  switch (op.kind) {
    case "set": {
      // Profile field: last-write-wins register ordered by HLC stamp.
      const cur = rep.profile[op.field];
      if (!cur || compareStamps(op.stamp, cur.s) > 0) {
        rep.profile[op.field] = { v: op.value, s: op.stamp };
      }
      break;
    }
    case "vax": {
      // Vaccine dates: OR-set of tagged dates.
      // A correction removes the tags its author had seen. A removed tag stays
      // removed even if its add arrives later, so the result does not depend on order.
      const slot = (rep.vax[op.code] ||= { tags: {}, removed: {} });
      for (const r of op.removes || []) {
        slot.removed[r] = true;
        delete slot.tags[r];
      }
      if (!slot.removed[op.id]) slot.tags[op.id] = { date: op.date, s: op.stamp };
      break;
    }
    case "entry": {
      // Notes and performance entries: grow-only set keyed by entry id.
      if (!rep.entries[op.entryId]) rep.entries[op.entryId] = { data: op.data, s: op.stamp };
      break;
    }
    default:
      throw new Error("unknown op kind: " + op.kind);
  }

  rep.applied[op.id] = true;
  return true;
}

// ---------- Projections (what the pages display) ----------
// Effective vaccine date: earliest recorded date on or after date of birth.
// conflict = true when devices recorded different dates and nobody has corrected them.
export function effectiveVax(slot, dob) {
  const dates = Object.values(slot.tags).map(t => t.date);
  const valid = dates.filter(d => !dob || d >= dob).sort();
  return { date: valid[0] || null, conflict: new Set(dates).size > 1 };
}

export function project(rep, dob) {
  const profile = {}, vaccines = {}, entries = {};
  for (const k of Object.keys(rep.profile)) profile[k] = rep.profile[k].v;
  for (const code of Object.keys(rep.vax)) {
    const e = effectiveVax(rep.vax[code], dob);
    if (e.date) vaccines[code] = e;
  }
  for (const id of Object.keys(rep.entries)) entries[id] = rep.entries[id].data;
  return { profile, vaccines, entries };
}

// ---------- Device ----------
export class Device {
  constructor(nodeId, { now } = {}) {
    this.nodeId = nodeId;
    this.clock = createClock(nodeId, now);
    this.seq = 0;
    this.log = [];        // every op this device created, in order (the outbox)
    this.replicas = {};   // childId -> replica
  }

  replica(childId) { return (this.replicas[childId] ||= emptyReplica(childId)); }

  // Local write: applied immediately, so the device always shows its own change.
  write(childId, kind, payload) {
    const seq = ++this.seq;
    const op = {
      ...payload,
      id: this.nodeId + ":" + seq,
      seq,
      node: this.nodeId,
      childId,
      kind,
      stamp: this.clock.tick()
    };
    this.log.push(op);
    applyOp(this.replica(childId), op);
    return op;
  }

  setField(childId, field, value) {
    return this.write(childId, "set", { field, value });
  }

  // Records a date and removes the dates this device has already seen for that vaccine.
  // A correction therefore replaces the old date everywhere once it syncs.
  setVaccine(childId, code, date) {
    const seen = this.replica(childId).vax[code];
    return this.write(childId, "vax", { code, date, removes: seen ? Object.keys(seen.tags) : [] });
  }

  addEntry(childId, entryId, data) {
    return this.write(childId, "entry", { entryId, data });
  }

  // Applies ops received from the server. Duplicates are skipped.
  receive(ops) {
    let fresh = 0;
    for (const op of ops) {
      this.clock.receive(op.stamp);
      if (applyOp(this.replica(op.childId), op)) fresh++;
    }
    return fresh;
  }

  snapshot() {
    return {
      nodeId: this.nodeId,
      seq: this.seq,
      log: this.log,
      replicas: this.replicas,
      clock: this.clock.state()
    };
  }

  static fromSnapshot(s, opts = {}) {
    const d = new Device(s.nodeId, opts);
    d.seq = s.seq;
    d.log = s.log;
    d.replicas = s.replicas;
    d.clock.restore(s.clock);
    return d;
  }
}

// ---------- Resumable delta sync ----------
// cursor = { pushedSeq, pullSeq }
//   pushedSeq: last local op the server has confirmed
//   pullSeq:   last server sequence number this device has applied
//
// transport.push(ops)            -> resolves when the server stored the ops (throws otherwise)
// transport.pull(after, limit)   -> { ops: [...with serverSeq], lastSeq }
//
// The cursor moves only after each confirmed step, so an interrupted sync resumes
// where it stopped. onProgress(cursor) runs after each step: save the cursor there.
export async function syncOnce(device, transport, cursor, { chunk = 50, onProgress } = {}) {
  const t0 = performance.now();
  const stats = { pushed: 0, pulled: 0, bytes: 0, chunks: 0, ms: 0 };

  const pending = device.log.filter(op => op.seq > cursor.pushedSeq);
  for (let i = 0; i < pending.length; i += chunk) {
    const part = pending.slice(i, i + chunk);
    const json = JSON.stringify(part);
    await transport.push(part);                    // throws on failure; cursor stays put
    cursor.pushedSeq = part[part.length - 1].seq;
    stats.pushed += part.length;
    stats.bytes += json.length;
    stats.chunks++;
    if (onProgress) onProgress(cursor);
  }

  for (;;) {
    const { ops, lastSeq } = await transport.pull(cursor.pullSeq, chunk);
    if (!ops.length) break;
    stats.bytes += JSON.stringify(ops).length;
    device.receive(ops);                           // apply before moving the cursor
    stats.pulled += ops.length;
    cursor.pullSeq = lastSeq;
    if (onProgress) onProgress(cursor);
    if (ops.length < chunk) break;
  }

  stats.ms = performance.now() - t0;
  return stats;
}
