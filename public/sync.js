// JeevanSetu reliable sync: local outbox + upload + server read-back verification.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, getDocFromServer, writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA0jfGOn0KL_6i5skQuf1s6TWOm5XNyP6w",
  authDomain: "syncedd.firebaseapp.com",
  projectId: "syncedd",
  storageBucket: "syncedd.firebasestorage.app",
  messagingSenderId: "784392339011",
  appId: "1:784392339011:web:36a0ef8994e21d2dda9ef6",
  measurementId: "G-8YVJKBCGFL"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
let db;
try {
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch (e) {
  db = getFirestore(app);
}

const OUTBOX_KEY = "js_outbox";
const STEP_TIMEOUT_MS = 12000;   // max wait per network step
const RETRY_MS = 5000;           // retry interval while anything is waiting

// ---------- outbox (durable local queue) ----------
function readBox() {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]"); } catch (e) { return []; }
}
function writeBox(list) {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(list)); } catch (e) { console.error(e); }
}
function persist(job) {
  const box = readBox();
  const i = box.findIndex(function (j) { return j.id === job.id; });
  if (i >= 0) box[i] = job; else box.push(job);
  writeBox(box);
}

function counts() {
  const c = { pending: 0, uploaded: 0, verified: 0 };
  readBox().forEach(function (j) { c[j.status] = (c[j.status] || 0) + 1; });
  return c;
}

const listeners = [];
function emit() {
  const c = counts();
  const box = readBox();
  listeners.forEach(function (fn) {
    try { fn(c, box); } catch (e) { console.error(e); }
  });
}

function withTimeout(p, ms) {
  let timer;
  const t = new Promise(function (_, rej) {
    timer = setTimeout(function () { rej(new Error("timeout")); }, ms || STEP_TIMEOUT_MS);
  });
  return Promise.race([p, t]).finally(function () { clearTimeout(timer); });
}

// Every field we sent must exist unchanged on the server copy.
function matches(sent, server) {
  if (server === undefined || server === null) return false;
  if (typeof sent !== "object" || sent === null) return sent === server;
  return Object.keys(sent).every(function (k) { return matches(sent[k], server[k]); });
}

// ---------- one job = document writes that must succeed together ----------
// job = { id, label, writes: [ { path, data, merge } ], status, attempts, lastError, fatal, createdAt }
let running = false;
let needsFlush = false;

function refOf(path) {
  return doc(db, ...path.split("/"));
}

async function processJob(job) {
  // STEP 1: upload (skipped if an earlier attempt already got the server's OK)
  if (job.status === "pending") {
    const batch = writeBatch(db);
    job.writes.forEach(function (w) {
      if (w.merge) batch.set(refOf(w.path), w.data, { merge: true });
      else batch.set(refOf(w.path), w.data);
    });
    await withTimeout(batch.commit());  // resolves only after the server accepted the write
    job.status = "uploaded";
    persist(job);
    emit();
  }

  // STEP 2: independent check, read each document back from the SERVER (never the cache)
  for (const w of job.writes) {
    const snap = await withTimeout(getDocFromServer(refOf(w.path)));
    if (!snap.exists() || !matches(w.data, snap.data())) {
      throw new Error("Verification failed for " + w.path);
    }
  }

  job.status = "verified";
  job.verifiedAt = new Date().toISOString();
  persist(job);
  emit();
}

async function flush() {
  if (running) { needsFlush = true; return; }
  running = true;
  try {
    const todo = readBox().filter(function (j) { return j.status !== "verified"; });
    for (const job of todo) {
      job.attempts = (job.attempts || 0) + 1;
      try {
        await processJob(job);
        job.lastError = "";
        job.fatal = false;
        persist(job);
      } catch (err) {
        job.lastError = String((err && err.code) || (err && err.message) || err);
        job.fatal = !!(err && err.code === "permission-denied");
        persist(job);
        console.warn("Sync will retry:", job.label, job.lastError);
      }
    }
  } finally {
    running = false;
    emit();
    pruneVerified();
    scheduleRetry();
    if (needsFlush) { needsFlush = false; flush(); }
  }
}

function pruneVerified() {
  // keep the last 50 verified jobs for display, drop older ones
  const box = readBox();
  const verified = box.filter(function (j) { return j.status === "verified"; });
  if (verified.length <= 50) return;
  const drop = {};
  verified.slice(0, verified.length - 50).forEach(function (j) { drop[j.id] = true; });
  writeBox(box.filter(function (j) { return !drop[j.id]; }));
}

let retryTimer = null;
function scheduleRetry() {
  clearTimeout(retryTimer);
  const waiting = readBox().some(function (j) { return j.status !== "verified" && !j.fatal; });
  if (waiting) retryTimer = setTimeout(flush, RETRY_MS);
}

window.addEventListener("online", flush);
document.addEventListener("visibilitychange", function () { if (!document.hidden) flush(); });

// ---------- public API ----------

// Saves the job to the local outbox FIRST, then starts upload + verify. Returns the job id.
function queue(label, writes) {
  const job = {
    id: "J-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    label: label,
    writes: writes,
    status: "pending",
    attempts: 0,
    lastError: "",
    fatal: false,
    createdAt: new Date().toISOString()
  };
  persist(job);
  emit();
  flush();
  return job.id;
}

// Status of one job: "pending", "uploaded", "verified", "denied", or "missing".
function status(jobId) {
  const j = readBox().find(function (x) { return x.id === jobId; });
  if (!j) return "missing";
  if (j.status === "verified") return "verified";
  if (j.fatal) return "denied";
  return j.status;
}

// Waits until the job is verified, denied, or maxMs passes. Resolves with the status.
function waitFor(jobId, maxMs) {
  return new Promise(function (resolve) {
    const start = Date.now();
    (function check() {
      const s = status(jobId);
      if (s === "verified" || s === "denied" || s === "missing") return resolve(s);
      if (Date.now() - start > (maxMs || 15000)) return resolve(s);
      setTimeout(check, 400);
    })();
  });
}

// Calls fn(counts, box) now and after every change.
function onChange(fn) {
  listeners.push(fn);
  fn(counts(), readBox());
}

// Small status banner any page can mount.
function mountBanner(container) {
  const el = document.createElement("p");
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.style.cssText = "margin:0.5rem 0;padding:0.5rem 0.8rem;border-radius:6px;font-weight:600;font-size:0.92rem;";
  container.prepend(el);
  onChange(function (c) {
    const waiting = c.pending + c.uploaded;
    if (waiting === 0) {
      el.textContent = c.verified ? "All data uploaded and verified in the database." : "";
      el.style.background = c.verified ? "#e3f3e3" : "transparent";
      el.style.color = "#0d5c06";
    } else {
      el.textContent = waiting + " item(s) not yet verified in the database. Keep this app open; it retries automatically.";
      el.style.background = "#fff1de";
      el.style.color = "#8a4b00";
    }
  });
}

window.JSSync = {
  db: db,
  queue: queue,
  status: status,
  waitFor: waitFor,
  flush: flush,
  onChange: onChange,
  counts: counts,
  mountBanner: mountBanner
};

flush(); // resume anything left over from a previous session
