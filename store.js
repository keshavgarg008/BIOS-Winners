/* Gaon Setu: offline store for child and vaccination records (localStorage only).
   Every vaccine change is a new entry that points to the entries it replaces (parents).
   If two devices change the same vaccine without seeing each other, two "heads" exist.
   If their dates match, they are treated as one. If they differ, it is a conflict and
   the worker must choose. Nothing is ever deleted. */
(function (global) {
  "use strict";

  var K_CHILDREN = "gs_children"; // { childId: child }
  var K_VAX = "gs_vax";           // [ entry, ... ]
  var K_DEVICE = "gs_device";
  var K_PENDING = "gs_pending";   // read by healthworker.html

  var VACCINES = [
    "BCG", "Hepatitis B-0", "OPV-0", "Pentavalent-1", "OPV-1",
    "Pentavalent-2", "OPV-2", "Pentavalent-3", "OPV-3", "Measles-Rubella-1"
  ];

  // No easily confused characters (0/O, 1/I/L)
  var ALPHA = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

  function randomChars(n) {
    var bytes = new Uint8Array(n), out = "", i;
    if (global.crypto && global.crypto.getRandomValues) {
      global.crypto.getRandomValues(bytes);
    } else {
      for (i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    for (i = 0; i < n; i++) out += ALPHA[bytes[i] % ALPHA.length];
    return out;
  }

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function deviceId() {
    var d = read(K_DEVICE, null);
    if (!d) {
      d = "DEV-" + randomChars(4);
      write(K_DEVICE, d);
    }
    return d;
  }

  function newChildId() {
    var children = read(K_CHILDREN, {}), id;
    do {
      id = "CH-" + randomChars(4) + "-" + randomChars(4);
    } while (children[id]);
    return id;
  }

  function updatePending() {
    var children = read(K_CHILDREN, {}), vax = read(K_VAX, []), n = 0;
    Object.keys(children).forEach(function (id) {
      if (!children[id].synced) n++;
    });
    vax.forEach(function (e) {
      if (!e.synced) n++;
    });
    localStorage.setItem(K_PENDING, String(n));
    return n;
  }

  function addChild(data) {
    var children = read(K_CHILDREN, {});
    var id = newChildId();
    children[id] = {
      id: id,
      name: data.name,
      dob: data.dob,
      sex: data.sex,
      guardianName: data.guardianName,
      guardianMobile: data.guardianMobile,
      village: data.village,
      createdBy: deviceId(),
      createdAt: nowIso(),
      synced: false
    };
    write(K_CHILDREN, children);
    updatePending();
    return id;
  }

  function getChild(id) {
    return read(K_CHILDREN, {})[id] || null;
  }

  // Matches the exact Child ID, or any part of the name (case-insensitive)
  function findChildren(query) {
    var q = String(query || "").trim().toLowerCase();
    if (!q) return [];
    var children = read(K_CHILDREN, {});
    return Object.keys(children)
      .map(function (k) { return children[k]; })
      .filter(function (c) {
        return c.id.toLowerCase() === q || c.name.toLowerCase().indexOf(q) !== -1;
      });
  }

  // Heads = entries for this child and vaccine that no other entry lists as a parent
  function headsFor(childId, vaccine, all) {
    var same = all.filter(function (e) {
      return e.childId === childId && e.vaccine === vaccine;
    });
    var replaced = {};
    same.forEach(function (e) {
      (e.parents || []).forEach(function (p) { replaced[p] = true; });
    });
    return same.filter(function (e) { return !replaced[e.id]; });
  }

  function vaccineStatus(childId, vaccine) {
    var heads = headsFor(childId, vaccine, read(K_VAX, []));
    if (heads.length === 0) return { state: "none", heads: [] };
    var dates = {};
    heads.forEach(function (h) { dates[h.date] = true; });
    var distinct = Object.keys(dates);
    if (distinct.length === 1) return { state: "ok", date: distinct[0], heads: heads };
    return { state: "conflict", heads: heads };
  }

  // Records a date for a vaccine. If the vaccine is in conflict, this resolves it,
  // because the new entry replaces all current heads. Returns false if nothing changed.
  function setVaccine(childId, vaccine, date) {
    var all = read(K_VAX, []);
    var st = vaccineStatus(childId, vaccine);
    if (st.state === "ok" && st.date === date) return false;
    var heads = headsFor(childId, vaccine, all);
    all.push({
      id: randomChars(6) + Date.now().toString(36),
      childId: childId,
      vaccine: vaccine,
      date: date,
      parents: heads.map(function (h) { return h.id; }),
      deviceId: deviceId(),
      ts: nowIso(),
      synced: false
    });
    write(K_VAX, all);
    updatePending();
    return true;
  }

  function vaxHistory(childId, vaccine) {
    return read(K_VAX, [])
      .filter(function (e) { return e.childId === childId && e.vaccine === vaccine; })
      .sort(function (a, b) { return a.ts < b.ts ? -1 : 1; });
  }

  // Adds remote records without overwriting or deleting local ones (union by ID)
  function mergeRemote(remote) {
    var children = read(K_CHILDREN, {});
    Object.keys(remote.children || {}).forEach(function (id) {
      if (!children[id]) {
        children[id] = Object.assign({}, remote.children[id], { synced: true });
      }
    });
    write(K_CHILDREN, children);

    var all = read(K_VAX, []), have = {};
    all.forEach(function (e) { have[e.id] = true; });
    (remote.vax || []).forEach(function (e) {
      if (!have[e.id]) {
        all.push(Object.assign({}, e, { synced: true }));
        have[e.id] = true;
      }
    });
    write(K_VAX, all);
    updatePending();
  }

  global.GSStore = {
    VACCINES: VACCINES,
    deviceId: deviceId,
    addChild: addChild,
    getChild: getChild,
    findChildren: findChildren,
    vaccineStatus: vaccineStatus,
    setVaccine: setVaccine,
    vaxHistory: vaxHistory,
    mergeRemote: mergeRemote,
    updatePending: updatePending
  };

  updatePending();
})(window);
