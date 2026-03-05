const PREFIX = 'pdfviewer_';

export class StorageManager {
  // --- Highlights ---
  saveHighlights(docKey, highlights) {
    this._save(docKey, 'highlights', highlights);
  }

  loadHighlights(docKey) {
    return this._load(docKey, 'highlights') || [];
  }

  // --- Memos ---
  saveMemos(docKey, memos) {
    this._save(docKey, 'memos', memos);
  }

  loadMemos(docKey) {
    return this._load(docKey, 'memos') || [];
  }

  // --- Bookmarks ---
  saveBookmarks(docKey, bookmarks) {
    this._save(docKey, 'bookmarks', bookmarks);
  }

  loadBookmarks(docKey) {
    return this._load(docKey, 'bookmarks') || [];
  }

  // --- View State ---
  saveViewState(docKey, state) {
    this._save(docKey, 'viewState', state);
  }

  loadViewState(docKey) {
    return this._load(docKey, 'viewState') || null;
  }

  // --- Internal ---
  _getStore(docKey) {
    try {
      const raw = localStorage.getItem(`${PREFIX}${docKey}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  _setStore(docKey, store) {
    try {
      localStorage.setItem(`${PREFIX}${docKey}`, JSON.stringify(store));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }

  _save(docKey, key, value) {
    const store = this._getStore(docKey);
    store[key] = value;
    this._setStore(docKey, store);
  }

  _load(docKey, key) {
    const store = this._getStore(docKey);
    return store[key];
  }

  // --- Export/Import ---
  exportData(docKey) {
    return JSON.stringify(this._getStore(docKey), null, 2);
  }

  importData(docKey, json) {
    try {
      const data = JSON.parse(json);
      this._setStore(docKey, data);
      return true;
    } catch {
      return false;
    }
  }
}
