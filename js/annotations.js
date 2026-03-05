import { $, createElement, generateId, HIGHLIGHT_COLORS, LABELS } from './utils.js';

export class AnnotationManager {
  constructor(pdfEngine, storage) {
    this.engine = pdfEngine;
    this.storage = storage;
    this.highlights = [];
    this.memos = [];
    this.activeHighlightToolbar = null;
    this.docKey = null;
  }

  init() {
    this.engine.addEventListener('documentLoaded', (e) => {
      this.docKey = e.detail.fingerprint;
      this.highlights = this.storage.loadHighlights(this.docKey);
      this.memos = this.storage.loadMemos(this.docKey);
    });

    this.engine.addEventListener('pageRendered', (e) => {
      this.renderAnnotationsForPage(e.detail.pageNum);
    });

    // Listen for text selection
    this.engine.viewerContainer?.addEventListener('mouseup', (e) => {
      this.handleSelectionEnd(e);
    });

    // Context menu for memos
    this.engine.viewerContainer?.addEventListener('contextmenu', (e) => {
      this.handleContextMenu(e);
    });
  }

  setupListeners() {
    if (!this.engine.viewerContainer) return;

    this.engine.viewerContainer.addEventListener('mouseup', (e) => {
      this.handleSelectionEnd(e);
    });

    this.engine.viewerContainer.addEventListener('contextmenu', (e) => {
      this.handleContextMenu(e);
    });
  }

  // --- Highlights ---
  handleSelectionEnd(e) {
    this.removeHighlightToolbar();

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

    const range = selection.getRangeAt(0);
    const pageWrapper = range.startContainer.parentElement?.closest('.page-wrapper');
    if (!pageWrapper) return;

    const pageNum = parseInt(pageWrapper.dataset.page);
    const rects = this.getSelectionRects(range, pageWrapper);
    if (rects.length === 0) return;

    const text = selection.toString();

    // Show color picker toolbar near selection
    this.showHighlightToolbar(e.clientX, e.clientY, pageNum, rects, text);
  }

  getSelectionRects(range, pageWrapper) {
    const clientRects = range.getClientRects();
    const wrapperRect = pageWrapper.getBoundingClientRect();
    const rects = [];

    for (const cr of clientRects) {
      if (cr.width < 1 || cr.height < 1) continue;
      rects.push({
        left: (cr.left - wrapperRect.left) / wrapperRect.width,
        top: (cr.top - wrapperRect.top) / wrapperRect.height,
        width: cr.width / wrapperRect.width,
        height: cr.height / wrapperRect.height,
      });
    }

    return rects;
  }

  showHighlightToolbar(x, y, pageNum, rects, text) {
    this.removeHighlightToolbar();

    const toolbar = createElement('div', 'highlight-toolbar');
    toolbar.style.position = 'fixed';
    toolbar.style.left = `${x}px`;
    toolbar.style.top = `${y - 45}px`;
    toolbar.style.zIndex = '10000';

    Object.entries(HIGHLIGHT_COLORS).forEach(([name, color]) => {
      const btn = createElement('button', 'highlight-color-btn', toolbar);
      btn.style.backgroundColor = color.replace('0.4', '0.8');
      btn.title = LABELS.colors[name];
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.createHighlight(pageNum, rects, name, text);
        this.removeHighlightToolbar();
        window.getSelection().removeAllRanges();
      });
    });

    document.body.appendChild(toolbar);
    this.activeHighlightToolbar = toolbar;

    // Remove on click outside
    const handler = (e) => {
      if (!toolbar.contains(e.target)) {
        this.removeHighlightToolbar();
        document.removeEventListener('mousedown', handler);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 10);
  }

  removeHighlightToolbar() {
    if (this.activeHighlightToolbar) {
      this.activeHighlightToolbar.remove();
      this.activeHighlightToolbar = null;
    }
  }

  createHighlight(pageNum, rects, colorName, text) {
    const highlight = {
      id: generateId('h'),
      pageNum,
      rects,
      color: colorName,
      text,
      createdAt: Date.now(),
    };

    this.highlights.push(highlight);
    this.save();
    this.renderHighlight(highlight);
  }

  renderHighlight(highlight) {
    const wrapper = this.engine.viewerContainer.querySelector(
      `.page-wrapper[data-page="${highlight.pageNum}"]`
    );
    if (!wrapper) return;

    const annotLayer = wrapper.querySelector('.custom-annotations');
    if (!annotLayer) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const color = HIGHLIGHT_COLORS[highlight.color] || HIGHLIGHT_COLORS.yellow;

    const group = createElement('div', 'highlight-group', annotLayer);
    group.dataset.highlightId = highlight.id;

    for (const rect of highlight.rects) {
      const div = createElement('div', 'highlight-overlay', group);
      div.style.position = 'absolute';
      div.style.left = `${rect.left * 100}%`;
      div.style.top = `${rect.top * 100}%`;
      div.style.width = `${rect.width * 100}%`;
      div.style.height = `${rect.height * 100}%`;
      div.style.backgroundColor = color;
      div.style.mixBlendMode = 'multiply';
      div.style.borderRadius = '2px';
      div.style.pointerEvents = 'auto';
      div.style.cursor = 'pointer';
    }

    // Delete on right-click
    group.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm(`형광펜을 삭제하시겠습니까?\n"${highlight.text.substring(0, 50)}..."`)) {
        this.removeHighlight(highlight.id);
      }
    });
  }

  removeHighlight(id) {
    this.highlights = this.highlights.filter((h) => h.id !== id);
    this.save();

    // Remove from DOM
    const el = this.engine.viewerContainer.querySelector(`[data-highlight-id="${id}"]`);
    if (el) el.remove();
  }

  // --- Memos ---
  handleContextMenu(e) {
    // Only create memo if not on a highlight
    const target = e.target;
    if (target.closest('.highlight-group') || target.closest('.memo-icon')) return;

    const pageWrapper = target.closest('.page-wrapper');
    if (!pageWrapper) return;

    e.preventDefault();

    const pageNum = parseInt(pageWrapper.dataset.page);
    const rect = pageWrapper.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    this.createMemo(pageNum, x, y);
  }

  createMemo(pageNum, x, y) {
    const memo = {
      id: generateId('m'),
      pageNum,
      x,
      y,
      text: '',
      color: 'yellow',
      createdAt: Date.now(),
    };

    this.memos.push(memo);
    this.save();
    this.renderMemo(memo);

    // Auto-open the popover
    setTimeout(() => {
      const icon = this.engine.viewerContainer.querySelector(`[data-memo-id="${memo.id}"] .memo-icon`);
      if (icon) icon.click();
    }, 50);
  }

  renderMemo(memo) {
    const wrapper = this.engine.viewerContainer.querySelector(
      `.page-wrapper[data-page="${memo.pageNum}"]`
    );
    if (!wrapper) return;

    const annotLayer = wrapper.querySelector('.custom-annotations');
    if (!annotLayer) return;

    const container = createElement('div', 'memo-container', annotLayer);
    container.dataset.memoId = memo.id;
    container.style.position = 'absolute';
    container.style.left = `${memo.x * 100}%`;
    container.style.top = `${memo.y * 100}%`;
    container.style.zIndex = '5';

    const icon = createElement('div', 'memo-icon', container);
    icon.innerHTML = '📝';
    icon.title = LABELS.memo;

    const popover = createElement('div', 'memo-popover hidden', container);
    const textarea = createElement('textarea', 'memo-textarea', popover);
    textarea.value = memo.text;
    textarea.placeholder = '메모를 입력하세요...';
    textarea.addEventListener('input', () => {
      memo.text = textarea.value;
      this.save();
    });

    const deleteBtn = createElement('button', 'memo-delete-btn', popover);
    deleteBtn.textContent = LABELS.delete;
    deleteBtn.addEventListener('click', () => {
      this.removeMemo(memo.id);
    });

    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.classList.toggle('hidden');
      if (!popover.classList.contains('hidden')) {
        textarea.focus();
      }
    });

    // Close popover when clicking outside
    document.addEventListener('mousedown', (e) => {
      if (!container.contains(e.target)) {
        popover.classList.add('hidden');
      }
    });
  }

  removeMemo(id) {
    this.memos = this.memos.filter((m) => m.id !== id);
    this.save();

    const el = this.engine.viewerContainer.querySelector(`[data-memo-id="${id}"]`);
    if (el) el.remove();
  }

  // --- Render all for a page ---
  renderAnnotationsForPage(pageNum) {
    for (const h of this.highlights.filter((h) => h.pageNum === pageNum)) {
      this.renderHighlight(h);
    }
    for (const m of this.memos.filter((m) => m.pageNum === pageNum)) {
      this.renderMemo(m);
    }
  }

  // --- Persistence ---
  save() {
    if (!this.docKey) return;
    this.storage.saveHighlights(this.docKey, this.highlights);
    this.storage.saveMemos(this.docKey, this.memos);
  }
}
