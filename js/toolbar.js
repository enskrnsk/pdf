import { $ } from './utils.js';

export class Toolbar {
  constructor(pdfEngine) {
    this.engine = pdfEngine;
    this.elements = {};
  }

  init() {
    this.elements = {
      openBtn: $('#btn-open'),
      fileInput: $('#file-input'),
      prevBtn: $('#btn-prev'),
      nextBtn: $('#btn-next'),
      pageInput: $('#page-input'),
      pageTotal: $('#page-total'),
      zoomOutBtn: $('#btn-zoom-out'),
      zoomInBtn: $('#btn-zoom-in'),
      zoomLevel: $('#zoom-level'),
      fitWidthBtn: $('#btn-fit-width'),
      fitPageBtn: $('#btn-fit-page'),
      rotateBtn: $('#btn-rotate'),
      searchBtn: $('#btn-search'),
      printBtn: $('#btn-print'),
      darkModeBtn: $('#btn-dark-mode'),
      sidebarBtn: $('#btn-sidebar'),
      searchBar: $('#search-bar'),
      searchInput: $('#search-input'),
      searchPrev: $('#search-prev'),
      searchNext: $('#search-next'),
      searchClose: $('#search-close'),
      searchCount: $('#search-count'),
    };

    this.bindEvents();
    this.updateControls(false);
  }

  bindEvents() {
    const { engine } = this;

    // File open is handled by app.js

    // Navigation
    this.elements.prevBtn.addEventListener('click', () => {
      const page = engine.currentPage - 1;
      if (page >= 1) engine.scrollToPage(page);
    });

    this.elements.nextBtn.addEventListener('click', () => {
      const page = engine.currentPage + 1;
      if (page <= engine.totalPages) engine.scrollToPage(page);
    });

    this.elements.pageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const page = parseInt(e.target.value);
        if (page >= 1 && page <= engine.totalPages) {
          engine.scrollToPage(page);
        } else {
          e.target.value = engine.currentPage;
        }
        e.target.blur();
      }
    });

    // Zoom
    this.elements.zoomOutBtn.addEventListener('click', () => {
      engine.setScale(Math.round((engine.currentScale - 0.25) * 100) / 100);
    });

    this.elements.zoomInBtn.addEventListener('click', () => {
      engine.setScale(Math.round((engine.currentScale + 0.25) * 100) / 100);
    });

    this.elements.fitWidthBtn.addEventListener('click', () => {
      engine.fitWidth();
    });

    this.elements.fitPageBtn.addEventListener('click', () => {
      engine.fitPage();
    });

    // Rotate
    this.elements.rotateBtn.addEventListener('click', () => {
      engine.setRotation(engine.rotation + 90);
    });

    // Print
    this.elements.printBtn.addEventListener('click', () => {
      this.handlePrint();
    });

    // Dark mode
    this.elements.darkModeBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('pdfviewer_darkmode', isDark);
      this.updateDarkModeIcon(isDark);
    });

    // Sidebar toggle
    this.elements.sidebarBtn.addEventListener('click', () => {
      engine.emit('toggleSidebar');
    });

    // Search toggle
    this.elements.searchBtn.addEventListener('click', () => {
      this.toggleSearchBar();
    });

    this.elements.searchClose.addEventListener('click', () => {
      this.toggleSearchBar(false);
    });

    // Engine events
    engine.addEventListener('pageChanged', (e) => {
      this.updatePageIndicator(e.detail.pageNum, engine.totalPages);
    });

    engine.addEventListener('scaleChanged', (e) => {
      this.updateZoomDisplay(e.detail.scale);
    });

    engine.addEventListener('documentLoaded', (e) => {
      this.updateControls(true);
      this.updatePageIndicator(1, e.detail.totalPages);
      this.updateZoomDisplay(engine.currentScale);
    });

    // Restore dark mode
    if (localStorage.getItem('pdfviewer_darkmode') === 'true') {
      document.body.classList.add('dark-mode');
      this.updateDarkModeIcon(true);
    }
  }

  updateControls(enabled) {
    const btns = [
      this.elements.prevBtn,
      this.elements.nextBtn,
      this.elements.zoomOutBtn,
      this.elements.zoomInBtn,
      this.elements.fitWidthBtn,
      this.elements.fitPageBtn,
      this.elements.rotateBtn,
      this.elements.searchBtn,
      this.elements.printBtn,
    ];
    btns.forEach((btn) => {
      if (btn) btn.disabled = !enabled;
    });
    if (this.elements.pageInput) this.elements.pageInput.disabled = !enabled;
  }

  updatePageIndicator(current, total) {
    if (this.elements.pageInput) this.elements.pageInput.value = current;
    if (this.elements.pageTotal) this.elements.pageTotal.textContent = `/ ${total}`;
  }

  updateZoomDisplay(scale) {
    if (this.elements.zoomLevel) {
      this.elements.zoomLevel.textContent = `${Math.round(scale * 100)}%`;
    }
  }

  updateDarkModeIcon(isDark) {
    if (this.elements.darkModeBtn) {
      this.elements.darkModeBtn.innerHTML = isDark
        ? '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>';
    }
  }

  toggleSearchBar(forceState) {
    const bar = this.elements.searchBar;
    if (!bar) return;
    const show = forceState !== undefined ? forceState : bar.classList.contains('hidden');
    bar.classList.toggle('hidden', !show);
    if (show) {
      this.elements.searchInput.focus();
    } else {
      this.elements.searchInput.value = '';
      this.elements.searchCount.textContent = '';
      this.engine.emit('searchClear');
    }
  }

  async handlePrint() {
    if (!this.engine.pdfDoc) return;
    window.print();
  }
}
