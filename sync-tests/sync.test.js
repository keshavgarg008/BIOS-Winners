// sync.test.js  —  run with: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { Device, syncOnce, project } from "./sync-core.js";
import { backupDevice, restoreDevice } from "./sync-crypto.js";
import { createFirestoreTransport } from "../public/sync-firestore.js";

const C = "rahul_2024";
const DOB = "2025-11-01";

// ---------- helpers ----------
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = canon(v[k]);
    return out;
  }
  return v;
}
const view = (d) => JSON.stringify(canon(project(d.replica(C), DOB)));

// Server: stores each op once by id, assigns a global serverSeq.
class MemoryServer {
  constructor() { this.ops = []; this.ids = new Set(); }
  async push(ops) {
    for (const op of ops) {
      if (this.ids.has(op.id)) continue;   // idempotent: duplicates ignored
      this.ids.add(op.id);
      this.ops.push({ ...op, serverSeq: this.ops.length + 1 });
    }
  }
  async pull(after, limit) {
    const ops = this.ops.filter(o => o.serverSeq > after).slice(0, limit);
    return { ops, lastSeq: ops.length ? ops[ops.length - 1].serverSeq : after };
  }
}

// Network simulator. Failures can be switched on per call.
function makeTransport(server) {
  const wire = x => JSON.parse(JSON.stringify(x));   // simulates bytes on the wire
  const t = {
    failPush: 0,      // next N pushes fail before reaching the server
    lostAckPush: 0,   // next N pushes reach the server, but the reply is lost
    failPull: 0,
    rand: null,       // optional random source for random drops
    dropRate: 0,
    drop() { if (t.rand && t.rand() < t.dropRate) throw new Error("network dropped"); },
    async push(ops) {
      t.drop();
      if (t.failPush > 0) { t.failPush--; throw new Error("network down"); }
      await server.push(wire(ops));
      if (t.lostAckPush > 0) { t.lostAckPush--; throw new Error("ack lost"); }
    },
    async pull(after, limit) {
      t.drop();
      if (t.failPull > 0) { t.failPull--; throw new Error("network down"); }
      return wire(await server.pull(after, limit));
    }
  };
  return t;
}

function fleet(n, skews = []) {
  const clock = { t: 1_000_000 };
  const server = new MemoryServer();
  const devices = [], cursors = [], transports = [];
  for (let i = 0; i < n; i++) {
    const skew = skews[i] || 0;
    devices.push(new Device("N" + i, { now: () => clock.t + skew }));
    cursors.push({ pushedSeq: 0, pullSeq: 0 });
    transports.push(makeTransport(server));
  }
  return { clock, server, devices, cursors, transports };
}

async function syncAll(f, rounds = 2) {
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < f.devices.length; i++) {
      await syncOnce(f.devices[i], f.transports[i], f.cursors[i]);
    }
  }
}

// ---------- tests ----------

test("HLC: stamps increase, and a remote stamp moves the clock forward", async () => {
  const { createClock, compareStamps } = await import("./sync-core.js");
  let t = 1000;
  const c = createClock("A", () => t);
  const s1 = c.tick();
  const s2 = c.tick();
  assert.ok(compareStamps(s1, s2) < 0);
  const r = c.receive({ wall: 1500, counter: 3, node: "B" });
  assert.equal(r.wall, 1500);
  assert.equal(r.counter, 4);
  const s3 = c.tick();
  assert.ok(compareStamps(r, s3) < 0);
});

test("HLC: a remote clock more than 60 s ahead is rejected", async () => {
  const { createClock } = await import("./sync-core.js");
  const c = createClock("A", () => 1000);
  assert.throws(() => c.receive({ wall: 1000 + 61_000, counter: 0, node: "B" }), /too far ahead/);
});

test("profile field: concurrent edits converge to the later HLC stamp", async () => {
  const f = fleet(2);
  const [a, b] = f.devices;
  a.setField(C, "village", "Ropar");     // earlier
  f.clock.t += 1000;
  b.setField(C, "village", "Mohali");    // later, so it wins
  await syncAll(f);
  assert.equal(view(a), view(b));
  assert.equal(JSON.parse(view(a)).profile.village, "Mohali");
});

test("vaccine dates recorded offline on two devices are both kept and flagged", async () => {
  const f = fleet(2);
  const [a, b] = f.devices;
  a.setVaccine(C, "Penta-1", "2026-01-10");
  b.setVaccine(C, "Penta-1", "2026-01-12");
  await syncAll(f);
  assert.deepEqual(project(a.replica(C), DOB).vaccines["Penta-1"], { date: "2026-01-10", conflict: true });
  assert.equal(view(a), view(b));
});

test("vaccine correction after seeing both dates replaces them everywhere", async () => {
  const f = fleet(2);
  const [a, b] = f.devices;
  a.setVaccine(C, "Penta-1", "2026-01-10");
  b.setVaccine(C, "Penta-1", "2026-01-12");
  await syncAll(f);
  a.setVaccine(C, "Penta-1", "2026-01-11");
  await syncAll(f);
  assert.deepEqual(project(b.replica(C), DOB).vaccines["Penta-1"], { date: "2026-01-11", conflict: false });
  assert.equal(view(a), view(b));
});

test("vaccine dates before date of birth are ignored", async () => {
  const f = fleet(2);
  const [a, b] = f.devices;
  a.setVaccine(C, "BCG", "2025-10-01");   // before DOB, invalid
  b.setVaccine(C, "BCG", "2025-11-05");
  await syncAll(f);
  const v = project(a.replica(C), DOB).vaccines["BCG"];
  assert.equal(v.date, "2025-11-05");
});

test("entries from two devices both appear on both devices", async () => {
  const f = fleet(2);
  f.devices[0].addEntry(C, "P-1", { className: "Class 3", attendance: 92 });
  f.devices[1].addEntry(C, "N-1", { note: "Treatment note" });
  await syncAll(f);
  assert.equal(view(f.devices[0]), view(f.devices[1]));
  const p = JSON.parse(view(f.devices[0]));
  assert.ok(p.entries["P-1"] && p.entries["N-1"]);
});

test("idempotent replay: resending the whole log changes nothing", async () => {
  const f = fleet(1);
  const [a] = f.devices;
  a.addEntry(C, "P-1", { className: "Class 3" });
  a.setField(C, "village", "Ropar");
  await syncAll(f, 1);
  const before = view(a);
  const count = f.server.ops.length;
  await f.transports[0].push(a.log);                 // resend everything
  assert.equal(f.server.ops.length, count);          // server stored nothing new
  assert.equal(a.receive(f.server.ops), 0);          // device applied nothing new
  assert.equal(view(a), before);
});

test("interrupted sync resumes from the last confirmed chunk without duplicates", async () => {
  const f = fleet(1);
  const [a] = f.devices;
  const t = f.transports[0];
  const cur = f.cursors[0];
  for (let i = 0; i < 120; i++) a.setField(C, "field" + i, i);

  await assert.rejects(syncOnce(a, t, cur, {
    chunk: 50,
    onProgress: c => { if (c.pushedSeq >= 50) t.failPush = 1; }   // drop the connection after chunk 1
  }));
  assert.equal(cur.pushedSeq, 50);
  assert.equal(f.server.ops.length, 50);

  await syncOnce(a, t, cur, { chunk: 50 });
  assert.equal(f.server.ops.length, 120);
  assert.equal(new Set(f.server.ops.map(o => o.id)).size, 120);
  assert.equal(cur.pushedSeq, 120);
});

test("a lost acknowledgement does not create duplicates on retry", async () => {
  const f = fleet(1);
  const [a] = f.devices;
  const t = f.transports[0];
  const cur = f.cursors[0];
  a.setField(C, "village", "Ropar");
  a.addEntry(C, "P-1", { className: "Class 3" });

  t.lostAckPush = 1;                                 // server stores, client sees an error
  await assert.rejects(syncOnce(a, t, cur));
  assert.equal(cur.pushedSeq, 0);

  await syncOnce(a, t, cur);                         // retry resends the same ids
  assert.equal(f.server.ops.length, 2);
  assert.equal(cur.pushedSeq, 2);
});

test("device loss: encrypted backup restores unsynced work with no data loss", async () => {
  const f = fleet(1);
  const [a] = f.devices;
  const t = f.transports[0];
  const cur = f.cursors[0];

  for (let i = 0; i < 30; i++) a.setField(C, "f" + i, i);
  await syncOnce(a, t, cur);                         // 30 ops reach the server

  a.setVaccine(C, "Penta-1", "2026-02-01");          // not synced yet
  a.addEntry(C, "P-9", { className: "Class 5" });    // not synced yet
  const box = await backupDevice(a, cur, "4821");

  // The phone is lost here. Only the encrypted backup survives.
  const r = await restoreDevice(box, "4821", { now: () => f.clock.t });
  await syncOnce(r.device, t, r.cursor);
  assert.equal(f.server.ops.length, 32);

  // A brand-new device with no local state recovers the same data from the server.
  const fresh = new Device("NEW", { now: () => f.clock.t });
  await syncOnce(fresh, t, { pushedSeq: 0, pullSeq: 0 });
  assert.equal(view(r.device), view(fresh));
  assert.equal(JSON.parse(view(fresh)).entries["P-9"].className, "Class 5");
});

test("backup is encrypted: wrong PIN fails and plaintext is not visible", async () => {
  const f = fleet(1);
  const [a] = f.devices;
  a.setField(C, "village", "Ropar");
  const box = await backupDevice(a, f.cursors[0], "4821");
  assert.equal(JSON.stringify(box).includes("Ropar"), false);
  await assert.rejects(restoreDevice(box, "0000", {}), /wrong PIN/);
  const ok = await restoreDevice(box, "4821", {});
  assert.equal(ok.device.replica(C).profile.village.v, "Ropar");
});

test("randomized fleet: 4 devices, clock skew, dropped networks and retries converge with zero loss", async () => {
  const rand = (seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let x = Math.imul(seed ^ seed >>> 15, 1 | seed);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  })(42);

  const f = fleet(4, [0, 300, -250, 120]);
  for (const t of f.transports) { t.rand = rand; t.dropRate = 0.15; }

  const VAX = ["BCG", "Penta-1", "Penta-2", "MR-1"];
  const VILL = ["Ropar", "Mohali", "Chandigarh"];
  let created = 0, failures = 0;

  for (let step = 0; step < 400; step++) {
    f.clock.t += Math.floor(rand() * 5);
    const i = Math.floor(rand() * 4);
    const d = f.devices[i];
    const r = rand();
    if (r < 0.3) {
      d.setField(C, "village", VILL[Math.floor(rand() * 3)]);
    } else if (r < 0.55) {
      const month = 1 + Math.floor(rand() * 3), day = 1 + Math.floor(rand() * 28);
      const date = "2026-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
      d.setVaccine(C, VAX[Math.floor(rand() * 4)], date);
    } else {
      d.addEntry(C, "E-" + step, { className: "Class " + (1 + Math.floor(rand() * 5)) });
    }
    created++;

    if (rand() < 0.4) {
      try {
        await syncOnce(d, f.transports[i], f.cursors[i], { chunk: 5 });
      } catch (e) {
        failures++;
      }
    }
  }

  // Network heals: every device syncs until nothing is pending
  for (const t of f.transports) t.dropRate = 0;
  await syncAll(f, 3);

  assert.ok(failures > 0, "the test must actually exercise failures");
  const views = new Set(f.devices.map(d => view(d)));
  assert.equal(views.size, 1, "all devices must converge to the same state");
  assert.equal(f.server.ops.length, created, "zero lost ops");
  assert.equal(new Set(f.server.ops.map(o => o.id)).size, created, "no duplicate ops");
});

// ---------- Firestore transport tests (fake Firestore) ----------

function fakeFirestore() {
  const store = new Map();   // "path" -> data
  const key = (...parts) => parts.join("/");
  const fs = {
    doc: (db, ...parts) => ({ path: key(...parts) }),
    collection: (db, ...parts) => ({ coll: key(...parts) }),
    where: (field, op, value) => ({ t: "where", field, op, value }),
    orderBy: (field) => ({ t: "orderBy", field }),
    limit: (n) => ({ t: "limit", n }),
    query: (coll, ...parts) => ({ coll: coll.coll, parts }),
    async runTransaction(db, fn) {
      const writes = [];
      const tx = {
        async get(ref) {
          const has = store.has(ref.path);
          return { exists: () => has, data: () => JSON.parse(JSON.stringify(store.get(ref.path))) };
        },
        set(ref, data) { writes.push([ref.path, JSON.parse(JSON.stringify(data))]); }
      };
      await fn(tx);
      for (const [p, d] of writes) store.set(p, d);   // commit all writes together
    },
    async getDocs(q) {
      const prefix = q.coll + "/";
      let rows = [...store.entries()]
        .filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"))
        .map(([, d]) => d);
      let max = Infinity;
      for (const part of q.parts) {
        if (part.t === "where") rows = rows.filter(r => r[part.field] > part.value);
        if (part.t === "orderBy") rows.sort((a, b) => a[part.field] - b[part.field]);
        if (part.t === "limit") max = part.n;
      }
      return { docs: rows.slice(0, max).map(d => ({ data: () => d })) };
    }
  };
  return { fs, store };
}

test("firestore transport: push stores ops with serverSeq, replay stores nothing new", async () => {
  const { fs, store } = fakeFirestore();
  const t = createFirestoreTransport(fs, {}, "rahul_2024");
  const a = new Device("N0", { now: () => 5000 });
  a.setField(C, "village", "Ropar");
  a.addEntry(C, "P-1", { className: "Class 3" });

  await t.push(a.log);
  await t.push(a.log);                                   // replay
  assert.equal(store.get("children/rahul_2024/meta/counter").n, 2);
  assert.equal(store.get("children/rahul_2024/ops/N0:1").serverSeq, 1);
  assert.equal(store.get("children/rahul_2024/ops/N0:2").serverSeq, 2);
});

test("firestore transport: pull returns only ops after the cursor, in order", async () => {
  const { fs } = fakeFirestore();
  const t = createFirestoreTransport(fs, {}, "rahul_2024");
  const a = new Device("N0", { now: () => 5000 });
  for (let i = 0; i < 7; i++) a.setField(C, "f" + i, i);
  await t.push(a.log);

  const first = await t.pull(0, 5);
  assert.equal(first.ops.length, 5);
  assert.equal(first.lastSeq, 5);
  const second = await t.pull(first.lastSeq, 5);
  assert.equal(second.ops.length, 2);
  assert.equal(second.ops[0].serverSeq, 6);
});

test("firestore transport: two devices converge through the transport", async () => {
  const { fs } = fakeFirestore();
  const clock = { t: 1_000_000 };
  const a = new Device("N0", { now: () => clock.t });
  const b = new Device("N1", { now: () => clock.t });
  const ca = { pushedSeq: 0, pullSeq: 0 };
  const cb = { pushedSeq: 0, pullSeq: 0 };
  const ta = createFirestoreTransport(fs, {}, C);
  const tb = createFirestoreTransport(fs, {}, C);

  a.setVaccine(C, "Penta-1", "2026-01-10");
  b.setVaccine(C, "Penta-1", "2026-01-12");
  a.addEntry(C, "P-1", { className: "Class 3" });
  b.addEntry(C, "N-1", { note: "Treatment note" });

  await syncOnce(a, ta, ca);
  await syncOnce(b, tb, cb);
  await syncOnce(a, ta, ca);
  assert.equal(view(a), view(b));
});
