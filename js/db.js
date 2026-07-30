/**
 * 牛慧慧专属一体化工作台 - IndexedDB 本地存储层
 * 提供离线缓存、图片存储、CRUD基础能力
 */

const DB_NAME = 'NiuHuihuiWorkstationDB';
const DB_VERSION = 2;

const DB_STORES = [
  'plans',
  'fitness',
  'bodyRecords',
  'transactions',
  'budget',
  'englishSpeaking',
  'englishListening',
  'englishVocab',
  'readingNotes',
  'reflections',
  'reviews',
  'jobProfile',
  'jobs',
  'interviewMaterials',
  'growthLogs',
  'periodRecords',
  'newsPodcast',
  'newsCoffee',
  'newsFinance',
  'settings',
  'autoFetchLogs'
];

const DB = {
  instance: null,

  async init() {
    if (this.instance) return this.instance;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { this.instance = req.result; resolve(this.instance); };
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        DB_STORES.forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        });
      };
    });
  },

  async tx(store, mode = 'readonly') {
    const db = await this.init();
    return db.transaction(store, mode).objectStore(store);
  },

  async get(store, id) {
    const s = await this.tx(store);
    return new Promise((resolve, reject) => {
      const req = s.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async getAll(store) {
    const s = await this.tx(store);
    return new Promise((resolve, reject) => {
      const req = s.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async put(store, data) {
    const s = await this.tx(store, 'readwrite');
    if (!data.id) data.id = Utils.generateId();
    data.updatedAt = Date.now();
    if (!data.createdAt) data.createdAt = Date.now();
    return new Promise((resolve, reject) => {
      const req = s.put(data);
      req.onsuccess = () => resolve(data);
      req.onerror = () => reject(req.error);
    });
  },

  async delete(store, id) {
    const s = await this.tx(store, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = s.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  async clear(store) {
    const s = await this.tx(store, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = s.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  async getSettings(key, defaultValue = null) {
    const s = await this.tx('settings');
    return new Promise((resolve, reject) => {
      const req = s.get(key);
      req.onsuccess = () => {
        const r = req.result;
        resolve(r ? r.value : defaultValue);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async setSettings(key, value) {
    return await this.put('settings', { id: key, value });
  },

  // 批量导出全部数据
  async exportAll() {
    const out = {};
    for (const store of DB_STORES) {
      out[store] = await this.getAll(store);
    }
    return out;
  },

  // 批量导入（可选清空）
  async importAll(data, clearFirst = false) {
    for (const store of DB_STORES) {
      if (clearFirst) await this.clear(store);
      const items = data[store] || [];
      for (const item of items) {
        await this.put(store, item);
      }
    }
  },

  // 图片转 base64 存储
  async saveImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};
