// Archivio locale su IndexedDB.
// Nota: iOS può svuotare i dati dei siti poco usati. Per questo l'app
// insiste sul backup su file e, più avanti, sulla sincronizzazione cloud.

const DB_NAME = 'tessere';
const DB_VERSION = 1;
const STORE = 'cards';
const META = 'meta';

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(storeName, mode);
        const store = t.objectStore(storeName);
        let out;
        try {
          out = fn(store);
        } catch (err) {
          reject(err);
          return;
        }
        t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export async function allCards() {
  const rows = await tx(STORE, 'readonly', (s) => s.getAll());
  return (rows || []).filter((c) => !c.deletedAt);
}


export async function getCard(id) {
  return tx(STORE, 'readonly', (s) => s.get(id));
}

export async function putCard(card) {
  const now = Date.now();
  const row = { ...card, updatedAt: now };
  if (!row.id) row.id = newId();
  if (!row.createdAt) row.createdAt = now;
  if (row.uses == null) row.uses = 0;
  await tx(STORE, 'readwrite', (s) => s.put(row));
  return row;
}

export async function deleteCard(id) {
  await tx(STORE, 'readwrite', (s) => s.delete(id));
}

export async function touchCard(id) {
  const card = await getCard(id);
  if (!card) return null;
  card.lastUsedAt = Date.now();
  card.uses = (card.uses || 0) + 1;
  await tx(STORE, 'readwrite', (s) => s.put(card));
  return card;
}

export async function getMeta(key, fallback = null) {
  const row = await tx(META, 'readonly', (s) => s.get(key));
  return row ? row.value : fallback;
}

export async function setMeta(key, value) {
  await tx(META, 'readwrite', (s) => s.put({ key, value }));
}

// --- Backup ------------------------------------------------------------

export async function exportBackup() {
  const cards = await allCards();
  return {
    app: 'tessere',
    version: 1,
    exportedAt: new Date().toISOString(),
    count: cards.length,
    cards,
  };
}

// Unione non distruttiva: le tessere già presenti vengono aggiornate solo
// se la copia nel file è più recente. Niente viene cancellato.
export async function importBackup(data) {
  if (!data || !Array.isArray(data.cards)) {
    throw new Error('Il file non contiene un backup di Tessere.');
  }
  const existing = new Map((await allCards()).map((c) => [c.id, c]));
  let added = 0;
  let updated = 0;
  for (const raw of data.cards) {
    if (!raw || !raw.code) continue;
    const card = {
      id: raw.id || newId(),
      name: String(raw.name || 'Senza nome').slice(0, 80),
      sub: String(raw.sub || '').slice(0, 80),
      code: String(raw.code).slice(0, 200),
      format: String(raw.format || 'code128'),
      color: /^#[0-9a-f]{6}$/i.test(raw.color || '') ? raw.color : '#2E2E38',
      note: String(raw.note || '').slice(0, 300),
      cat: String(raw.cat || 'Altro'),
      createdAt: Number(raw.createdAt) || Date.now(),
      updatedAt: Number(raw.updatedAt) || Date.now(),
      lastUsedAt: Number(raw.lastUsedAt) || 0,
      uses: Number(raw.uses) || 0,
    };
    const prev = existing.get(card.id);
    if (!prev) {
      await tx(STORE, 'readwrite', (s) => s.put(card));
      added++;
    } else if (card.updatedAt > (prev.updatedAt || 0)) {
      await tx(STORE, 'readwrite', (s) => s.put(card));
      updated++;
    }
  }
  return { added, updated };
}

// Chiede a iOS/Android di non buttare via i dati alla prima stretta di spazio.
// Non è garantito: il backup su file resta la vera rete di sicurezza.
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch (_) {
    /* ignora */
  }
  return false;
}

export async function storageInfo() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      return { usage: est.usage || 0, quota: est.quota || 0, persisted };
    }
  } catch (_) {
    /* ignora */
  }
  return null;
}
