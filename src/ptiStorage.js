/**
 * PTI (Project) 저장/불러오기 - IndexedDB + .pti 파일
 */
const DB_NAME = 'Pdf2PptV2_PTI';
const STORE_NAME = 'projects';
const PTI_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export function saveProjectToIndexedDB(projectName, data) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const payload = {
        id: /\.(his|pti)$/i.test(projectName) ? projectName : `${projectName}.his`,
        name: /\.(his|pti)$/i.test(projectName) ? projectName : `${projectName}.his`,
        savedAt: new Date().toISOString(),
        data: { ...data, version: PTI_VERSION },
      };
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(payload);
      req.onsuccess = () => resolve(payload.name);
      req.onerror = () => reject(req.error);
      tx.complete;
    });
  });
}

export function listProjectsFromIndexedDB() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  });
}

export function loadProjectFromIndexedDB(id) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result?.data || null);
      req.onerror = () => reject(req.error);
    });
  });
}

export function deleteProjectFromIndexedDB(id) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

/** PTI 파일용 직렬화 (다운로드용) */
export function serializePTI(data) {
  return JSON.stringify({
    version: PTI_VERSION,
    savedAt: new Date().toISOString(),
    ...data,
  }, null, 0);
}

/** .pti 파일 내용 파싱 */
export function parsePTI(jsonString) {
  try {
    const raw = JSON.parse(jsonString);
    if (raw && typeof raw.data === 'object') return raw.data;
    return raw;
  } catch (e) {
    throw new Error('PTI 파일 형식이 올바르지 않습니다.');
  }
}
