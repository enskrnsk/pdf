import { PDFEngine } from './pdf-engine.js';
import { Toolbar } from './toolbar.js';
import { Sidebar } from './sidebar.js';
import { SearchController } from './search.js';
import { AnnotationManager } from './annotations.js';
import { StorageManager } from './storage.js';
import { $, debounce } from './utils.js';

class PDFViewerApp {
  constructor() {
    this.engine = new PDFEngine();
    this.storage = new StorageManager();
    this.toolbar = new Toolbar(this.engine);
    this.sidebar = new Sidebar(this.engine, this.storage);
    this.search = new SearchController(this.engine);
    this.annotations = new AnnotationManager(this.engine, this.storage);
    this.fileInput = document.getElementById('file-input');
  }

  init() {
    const viewerContainer = $('#viewer-container');
    this.engine.setViewerContainer(viewerContainer);

    this.toolbar.init();
    this.sidebar.init();
    this.search.init();

    this.setupDragAndDrop();
    this.setupFileSelection();
    this.setupScrollTracking();
    this.setupKeyboardShortcuts();

    this.engine.addEventListener('documentLoaded', (e) => {
      this.onDocumentLoaded(e.detail);
    });
  }

  setupDragAndDrop() {
    const container = $('#viewer-container');

    // Block browser default at window level using capture phase
    // This fires BEFORE any other handlers and prevents navigation
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }, true);

    window.addEventListener('drop', (e) => {
      e.preventDefault();
    }, true);

    // Visual feedback
    container.addEventListener('dragenter', () => {
      container.classList.add('drag-over');
    });
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      container.classList.add('drag-over');
    });
    container.addEventListener('dragleave', (e) => {
      // Only remove if actually leaving the container (not entering a child)
      if (e.target === container) {
        container.classList.remove('drag-over');
      }
    });

    // Handle file drop on the entire window - always route to our app
    window.addEventListener('drop', (e) => {
      container.classList.remove('drag-over');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          this.openFile(file);
        }
      }
    });
  }

  setupFileSelection() {
    // Direct listener on file input (works regardless of how it's triggered)
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.openFile(file);
      }
      e.target.value = '';
    });

    // Welcome screen click
    const welcome = $('#welcome-screen');
    if (welcome) {
      welcome.addEventListener('click', () => {
        this.fileInput.click();
      });
    }

    // Toolbar open button
    const openBtn = $('#btn-open');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        this.fileInput.click();
      });
    }

    // Also listen for engine event (from toolbar)
    this.engine.addEventListener('fileSelected', (e) => {
      this.openFile(e.detail.file);
    });
  }

  setupScrollTracking() {
    const container = $('#viewer-container');
    const updatePage = debounce(() => {
      if (!this.engine.pdfDoc) return;
      const visiblePage = this.engine.getCurrentVisiblePage();
      if (visiblePage !== this.engine.currentPage) {
        this.engine.currentPage = visiblePage;
        this.engine.emit('pageChanged', { pageNum: visiblePage });

        // Auto-save view state
        this.saveViewState();
      }
    }, 150);

    container.addEventListener('scroll', updatePage);
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignore when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          e.target.blur();
          this.toolbar.toggleSearchBar(false);
        }
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            this.toolbar.toggleSearchBar(true);
            break;
          case 'p':
            e.preventDefault();
            this.toolbar.handlePrint();
            break;
          case 'o':
            e.preventDefault();
            this.fileInput.click();
            break;
          case '=':
          case '+':
            e.preventDefault();
            this.engine.setScale(
              Math.round((this.engine.currentScale + 0.25) * 100) / 100
            );
            break;
          case '-':
            e.preventDefault();
            this.engine.setScale(
              Math.round((this.engine.currentScale - 0.25) * 100) / 100
            );
            break;
        }
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          if (this.engine.currentPage > 1) {
            this.engine.scrollToPage(this.engine.currentPage - 1);
          }
          break;
        case 'ArrowRight':
        case 'PageDown':
          if (this.engine.currentPage < this.engine.totalPages) {
            this.engine.scrollToPage(this.engine.currentPage + 1);
          }
          break;
        case 'Home':
          this.engine.scrollToPage(1);
          break;
        case 'End':
          this.engine.scrollToPage(this.engine.totalPages);
          break;
      }
    });
  }

  async openFile(file) {
    if (!file) return;

    // Show loading
    const welcome = $('#welcome-screen');
    if (welcome) welcome.classList.add('hidden');

    try {
      const arrayBuffer = await file.arrayBuffer();
      await this.engine.loadDocument(arrayBuffer);
      document.title = `${file.name} - PDF 뷰어`;
    } catch (err) {
      console.error('Error opening PDF:', err);
      alert('PDF 파일을 열 수 없습니다: ' + err.message);
      if (welcome) welcome.classList.remove('hidden');
    }
  }

  async onDocumentLoaded(detail) {
    await this.engine.setupPages();

    // Init annotations after pages are set up
    this.annotations.setupListeners();
    this.annotations.docKey = detail.fingerprint;
    this.annotations.highlights = this.storage.loadHighlights(detail.fingerprint);
    this.annotations.memos = this.storage.loadMemos(detail.fingerprint);

    // Restore view state
    const viewState = this.storage.loadViewState(detail.fingerprint);
    if (viewState) {
      if (viewState.scale) {
        this.engine.currentScale = viewState.scale;
      }
      if (viewState.sidebarOpen !== undefined) {
        this.sidebar.toggle(viewState.sidebarOpen);
      }
    }

    // Scroll to last page after a brief delay for rendering
    if (viewState && viewState.lastPage) {
      setTimeout(() => {
        this.engine.scrollToPage(viewState.lastPage);
      }, 300);
    }
  }

  saveViewState() {
    if (!this.engine.pdfDoc) return;
    const docKey = this.engine.pdfDoc.fingerprints[0];
    this.storage.saveViewState(docKey, {
      lastPage: this.engine.currentPage,
      scale: this.engine.currentScale,
      sidebarOpen: this.sidebar.isOpen,
      sidebarTab: this.sidebar.activeTab,
    });
  }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  const app = new PDFViewerApp();
  app.init();
});
