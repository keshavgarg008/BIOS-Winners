// sync-firestore.js
// Firestore transport for sync-core.js.
// Layout:
//   children/{childId}/ops/{opId}        one document per operation (doc id = op id)
//   children/{childId}/meta/counter      { n } last serverSeq handed out
//
// The Firestore functions are passed in (fs), so this file also runs in Node tests.

export function createFirestoreTransport(fs, db, childId) {
  const { doc, collection, runTransaction, getDocs, query, where, orderBy, limit } = fs;

  const counterRef = doc(db, "children", childId, "meta", "counter");
  const opRef = (id) => doc(db, "children", childId, "ops", id);

  async function push(ops) {
    // One transaction per op keeps each transaction small and the counter exact.
    for (const op of ops) {
      await runTransaction(db, async (tx) => {
        const existing = await tx.get(opRef(op.id));
        if (existing.exists()) return;               // already stored: replay is a no-op

        const c = await tx.get(counterRef);
        const next = (c.exists() ? c.data().n : 0) + 1;

        tx.set(counterRef, { n: next });
        tx.set(opRef(op.id), { ...op, serverSeq: next });
      });
    }
  }

  async function pull(after, max) {
    const q = query(
      collection(db, "children", childId, "ops"),
      where("serverSeq", ">", after),
      orderBy("serverSeq"),
      limit(max)
    );
    const snap = await getDocs(q);
    const ops = snap.docs.map((d) => d.data());
    return { ops, lastSeq: ops.length ? ops[ops.length - 1].serverSeq : after };
  }

  return { push, pull };
}
