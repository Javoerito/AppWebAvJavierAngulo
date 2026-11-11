'use strict';

/** Persistencia de mensajes en Firestore. */
function createMessageStore({ db, collectionName }) {
  const collection = db.collection(collectionName);

  const toIso = (value) => {
    const date = value && typeof value.toDate === 'function' ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  };

  return {
    async save({ userId, username, text }) {
      const ref = collection.doc();
      const createdAt = new Date();
      await ref.set({ userId, username, text, createdAt });
      return { id: ref.id, timestamp: createdAt.toISOString() };
    },

    async loadRecent(limit) {
      const snap = await collection.orderBy('createdAt', 'desc').limit(limit).get();
      return snap.docs
        .map((doc) => {
          const d = doc.data();
          return {
            type: 'chat',
            id: doc.id,
            userId: d.userId,
            username: d.username,
            text: d.text,
            timestamp: toIso(d.createdAt)
          };
        })
        .reverse(); // más antiguos primero
    }
  };
}

module.exports = { createMessageStore };
