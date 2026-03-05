import { $, $$, createElement, LABELS } from './utils.js';

export class Sidebar {
  constructor(pdfEngine, storage) {
    this.engine = pdfEngine;
    this.storage = storage;
    this.isOpen = true;
    this.activeTab = 'thumbnails';
    this.thumbnailObserver = null;
    this.renderedThumbnails = new Set();
  }

  init() {
    this.sidebarEl = $('#sidebar');
    this.tabBtns = $$('.sidebar-tab-btn');
    this.panels = {
      thumbnails: $('#panel-thumbnails'),
      outline: $('#panel-outline'),
      bookmarks: $('#panel-bookmarks'),
    };

    // Tab switching
    this.tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // Sidebar toggle from engine
    this.engine.addEventListener('toggleSidebar', () => {
      this.toggle();
    });

    this.engine.addEventListener('documentLoaded', () => {
      this.onDocumentLoaded();
    });

    this.engine.addEventListener('pageChanged', (e) => {
      this.highlightCurrentPage(e.detail.pageNum);
    });

    // Add bookmark button
    const addBookmarkBtn = $('#btn-add-bookmark');
    if (addBookmarkBtn) {
      addBookmarkBtn.addEventListener('click', () => {
        this.addBookmark();
      });
    }
  }

  toggle(forceState) {
    this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
    this.sidebarEl.classList.toggle('collapsed', !this.isOpen);
    document.getElementById('app').classList.toggle('sidebar-collapsed', !this.isOpen);
  }

  switchTab(tabName) {
    this.activeTab = tabName;

    this.tabBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    Object.entries(this.panels).forEach(([name, panel]) => {
      if (panel) panel.classList.toggle('hidden', name !== tabName);
    });

    // Lazy render thumbnails when switching to that tab
    if (tabName === 'thumbnails' && this.engine.pdfDoc) {
      this.setupThumbnailObserver();
    }
  }

  async onDocumentLoaded() {
    this.renderedThumbnails.clear();
    await Promise.all([
      this.setupThumbnails(),
      this.renderOutline(),
      this.renderBookmarks(),
    ]);
  }

  // --- Thumbnails ---
  async setupThumbnails() {
    const panel = this.panels.thumbnails;
    if (!panel) return;
    panel.innerHTML = '';

    for (let i = 1; i <= this.engine.totalPages; i++) {
      const page = await this.engine.pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const thumbWidth = 140;
      const thumbHeight = (viewport.height / viewport.width) * thumbWidth;

      const item = createElement('div', 'thumbnail-item', panel);
      item.dataset.page = i;
      item.addEventListener('click', () => {
        this.engine.scrollToPage(i);
      });

      const canvasWrap = createElement('div', 'thumbnail-canvas-wrap', item);
      canvasWrap.style.width = `${thumbWidth}px`;
      canvasWrap.style.height = `${thumbHeight}px`;

      const label = createElement('span', 'thumbnail-label', item);
      label.textContent = i;
    }

    if (this.activeTab === 'thumbnails') {
      this.setupThumbnailObserver();
    }
    this.highlightCurrentPage(1);
  }

  setupThumbnailObserver() {
    if (this.thumbnailObserver) {
      this.thumbnailObserver.disconnect();
    }

    this.thumbnailObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageNum = parseInt(entry.target.dataset.page);
          if (entry.isIntersecting && !this.renderedThumbnails.has(pageNum)) {
            this.renderThumbnail(pageNum, entry.target);
          }
        }
      },
      {
        root: this.panels.thumbnails,
        rootMargin: '100px 0px',
        threshold: 0,
      }
    );

    const items = this.panels.thumbnails.querySelectorAll('.thumbnail-item');
    items.forEach((item) => this.thumbnailObserver.observe(item));
  }

  async renderThumbnail(pageNum, itemEl) {
    if (this.renderedThumbnails.has(pageNum)) return;
    this.renderedThumbnails.add(pageNum);

    try {
      const page = await this.engine.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const thumbWidth = 140;
      const scale = thumbWidth / viewport.width;
      const thumbViewport = page.getViewport({ scale });

      const canvasWrap = itemEl.querySelector('.thumbnail-canvas-wrap');
      const canvas = createElement('canvas', 'thumbnail-canvas', canvasWrap);
      canvas.width = thumbViewport.width;
      canvas.height = thumbViewport.height;
      canvas.style.width = `${thumbViewport.width}px`;
      canvas.style.height = `${thumbViewport.height}px`;

      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: thumbViewport }).promise;
    } catch (err) {
      console.error(`Thumbnail render error for page ${pageNum}:`, err);
    }
  }

  highlightCurrentPage(pageNum) {
    const panel = this.panels.thumbnails;
    if (!panel) return;

    panel.querySelectorAll('.thumbnail-item').forEach((item) => {
      item.classList.toggle('active', parseInt(item.dataset.page) === pageNum);
    });
  }

  // --- Outline ---
  async renderOutline() {
    const panel = this.panels.outline;
    if (!panel) return;
    panel.innerHTML = '';

    const outline = await this.engine.getOutline();
    if (!outline || outline.length === 0) {
      const empty = createElement('div', 'panel-empty', panel);
      empty.textContent = LABELS.noOutline;
      return;
    }

    const list = this.buildOutlineTree(outline);
    panel.appendChild(list);
  }

  buildOutlineTree(items) {
    const ul = document.createElement('ul');
    ul.className = 'outline-list';

    for (const item of items) {
      const li = document.createElement('li');
      li.className = 'outline-item';

      const link = document.createElement('a');
      link.className = 'outline-link';
      link.textContent = item.title;
      link.href = '#';
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const pageNum = await this.engine.getDestinationPage(item.dest);
        if (pageNum) this.engine.scrollToPage(pageNum);
      });
      li.appendChild(link);

      if (item.items && item.items.length > 0) {
        const toggle = createElement('span', 'outline-toggle', li);
        toggle.textContent = '▸';
        const subList = this.buildOutlineTree(item.items);
        subList.classList.add('collapsed');
        li.appendChild(subList);

        toggle.addEventListener('click', () => {
          subList.classList.toggle('collapsed');
          toggle.textContent = subList.classList.contains('collapsed') ? '▸' : '▾';
        });
      }

      ul.appendChild(li);
    }

    return ul;
  }

  // --- Bookmarks ---
  renderBookmarks() {
    const panel = this.panels.bookmarks;
    if (!panel) return;
    panel.innerHTML = '';

    const docKey = this.getDocKey();
    if (!docKey) {
      const empty = createElement('div', 'panel-empty', panel);
      empty.textContent = LABELS.noBookmarks;
      return;
    }

    const bookmarks = this.storage ? this.storage.loadBookmarks(docKey) : [];

    // Add bookmark button
    const addBtn = createElement('button', 'bookmark-add-btn', panel);
    addBtn.textContent = `+ ${LABELS.addBookmark}`;
    addBtn.addEventListener('click', () => this.addBookmark());

    if (bookmarks.length === 0) {
      const empty = createElement('div', 'panel-empty', panel);
      empty.textContent = LABELS.noBookmarks;
      return;
    }

    const list = createElement('ul', 'bookmark-list', panel);
    for (const bm of bookmarks) {
      const li = createElement('li', 'bookmark-item', list);

      const link = createElement('a', 'bookmark-link', li);
      link.href = '#';
      link.textContent = bm.label || `${bm.pageNum} ${LABELS.pageSuffix}`;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.engine.scrollToPage(bm.pageNum);
      });

      const delBtn = createElement('button', 'bookmark-delete', li);
      delBtn.textContent = '×';
      delBtn.title = LABELS.delete;
      delBtn.addEventListener('click', () => {
        this.removeBookmark(bm.id);
      });
    }
  }

  addBookmark() {
    if (!this.engine.pdfDoc || !this.storage) return;
    const docKey = this.getDocKey();
    if (!docKey) return;

    const pageNum = this.engine.getCurrentVisiblePage();
    const label = prompt(LABELS.bookmarkLabel, `${pageNum} ${LABELS.pageSuffix}`);
    if (label === null) return;

    const bookmarks = this.storage.loadBookmarks(docKey);
    bookmarks.push({
      id: `b_${Date.now()}`,
      pageNum,
      label: label || `${pageNum} ${LABELS.pageSuffix}`,
      createdAt: Date.now(),
    });
    this.storage.saveBookmarks(docKey, bookmarks);
    this.renderBookmarks();
  }

  removeBookmark(id) {
    const docKey = this.getDocKey();
    if (!docKey || !this.storage) return;

    let bookmarks = this.storage.loadBookmarks(docKey);
    bookmarks = bookmarks.filter((b) => b.id !== id);
    this.storage.saveBookmarks(docKey, bookmarks);
    this.renderBookmarks();
  }

  getDocKey() {
    if (!this.engine.pdfDoc) return null;
    return this.engine.pdfDoc.fingerprints[0];
  }
}
