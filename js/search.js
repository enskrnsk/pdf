import { $, createElement } from './utils.js';

export class SearchController {
  constructor(pdfEngine) {
    this.engine = pdfEngine;
    this.textCache = new Map(); // pageNum -> text string
    this.matches = [];          // { pageNum, index (within page text), length }
    this.currentMatchIdx = -1;
    this.query = '';
    this.highlightElements = [];
  }

  init() {
    this.searchInput = $('#search-input');
    this.searchCount = $('#search-count');
    this.searchPrev = $('#search-prev');
    this.searchNext = $('#search-next');

    this.searchInput.addEventListener('input', () => {
      this.search(this.searchInput.value);
    });

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (e.shiftKey) {
          this.prevMatch();
        } else {
          this.nextMatch();
        }
      }
      if (e.key === 'Escape') {
        this.engine.emit('searchClear');
      }
    });

    this.searchPrev.addEventListener('click', () => this.prevMatch());
    this.searchNext.addEventListener('click', () => this.nextMatch());

    this.engine.addEventListener('searchClear', () => {
      this.clearHighlights();
      this.matches = [];
      this.currentMatchIdx = -1;
      this.query = '';
      this.searchCount.textContent = '';
    });

    this.engine.addEventListener('documentLoaded', () => {
      this.textCache.clear();
      this.clearHighlights();
      this.matches = [];
      this.currentMatchIdx = -1;
    });

    // Re-apply highlights when pages re-render
    this.engine.addEventListener('pageRendered', (e) => {
      if (this.query && this.matches.length > 0) {
        this.highlightMatchesOnPage(e.detail.pageNum);
      }
    });
  }

  async search(query) {
    this.clearHighlights();
    this.matches = [];
    this.currentMatchIdx = -1;
    this.query = query;

    if (!query || query.length === 0) {
      this.searchCount.textContent = '';
      return;
    }

    const lowerQuery = query.toLowerCase();

    // Build text cache and find matches
    for (let p = 1; p <= this.engine.totalPages; p++) {
      if (!this.textCache.has(p)) {
        try {
          const text = await this.engine.getPageText(p);
          this.textCache.set(p, text);
        } catch {
          this.textCache.set(p, '');
        }
      }
      const text = this.textCache.get(p).toLowerCase();
      let idx = 0;
      while ((idx = text.indexOf(lowerQuery, idx)) !== -1) {
        this.matches.push({ pageNum: p, index: idx, length: query.length });
        idx += 1;
      }
    }

    if (this.matches.length > 0) {
      this.currentMatchIdx = 0;
      this.updateCount();
      this.goToCurrentMatch();
    } else {
      this.searchCount.textContent = '결과 없음';
    }

    // Highlight on all rendered pages
    for (let p = 1; p <= this.engine.totalPages; p++) {
      if (this.engine.renderedPages.get(p) === 'rendered') {
        this.highlightMatchesOnPage(p);
      }
    }
  }

  highlightMatchesOnPage(pageNum) {
    if (!this.query) return;

    const wrapper = this.engine.viewerContainer.querySelector(
      `.page-wrapper[data-page="${pageNum}"]`
    );
    if (!wrapper) return;

    const textLayer = wrapper.querySelector('.textLayer');
    if (!textLayer) return;

    // Remove old highlights on this page
    textLayer.querySelectorAll('.search-highlight').forEach((el) => el.remove());

    const spans = textLayer.querySelectorAll('span[role="presentation"], span:not([class])');
    if (spans.length === 0) return;

    const lowerQuery = this.query.toLowerCase();
    const pageMatches = this.matches.filter((m) => m.pageNum === pageNum);
    if (pageMatches.length === 0) return;

    // Build a concatenated text from spans to map indices
    let runningText = '';
    const spanRanges = []; // { start, end, span }
    for (const span of spans) {
      const start = runningText.length;
      runningText += span.textContent;
      spanRanges.push({ start, end: runningText.length, span });
    }

    const lowerRunning = runningText.toLowerCase();
    // Find matches within the concatenated text
    let searchIdx = 0;
    while (true) {
      const matchIdx = lowerRunning.indexOf(lowerQuery, searchIdx);
      if (matchIdx === -1) break;

      const matchEnd = matchIdx + this.query.length;

      // Find which spans overlap with this match
      for (const { start, end, span } of spanRanges) {
        if (start >= matchEnd || end <= matchIdx) continue;

        // This span overlaps with the match
        const spanRect = span.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();

        const highlight = createElement('div', 'search-highlight');
        highlight.style.position = 'absolute';
        highlight.style.left = `${spanRect.left - wrapperRect.left}px`;
        highlight.style.top = `${spanRect.top - wrapperRect.top}px`;
        highlight.style.width = `${spanRect.width}px`;
        highlight.style.height = `${spanRect.height}px`;
        highlight.style.backgroundColor = 'rgba(255, 200, 0, 0.35)';
        highlight.style.pointerEvents = 'none';
        highlight.style.zIndex = '3';
        highlight.style.mixBlendMode = 'multiply';
        highlight.style.borderRadius = '2px';

        textLayer.appendChild(highlight);
        this.highlightElements.push(highlight);
      }

      searchIdx = matchIdx + 1;
    }
  }

  clearHighlights() {
    this.highlightElements.forEach((el) => el.remove());
    this.highlightElements = [];
    // Also remove from DOM in case references were lost
    if (this.engine.viewerContainer) {
      this.engine.viewerContainer
        .querySelectorAll('.search-highlight')
        .forEach((el) => el.remove());
    }
  }

  nextMatch() {
    if (this.matches.length === 0) return;
    this.currentMatchIdx = (this.currentMatchIdx + 1) % this.matches.length;
    this.updateCount();
    this.goToCurrentMatch();
  }

  prevMatch() {
    if (this.matches.length === 0) return;
    this.currentMatchIdx =
      (this.currentMatchIdx - 1 + this.matches.length) % this.matches.length;
    this.updateCount();
    this.goToCurrentMatch();
  }

  goToCurrentMatch() {
    const match = this.matches[this.currentMatchIdx];
    if (!match) return;
    this.engine.scrollToPage(match.pageNum);
  }

  updateCount() {
    if (this.matches.length === 0) {
      this.searchCount.textContent = '결과 없음';
    } else {
      this.searchCount.textContent = `${this.currentMatchIdx + 1} / ${this.matches.length} 일치`;
    }
  }
}
