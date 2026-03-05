import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.min.mjs';
import { getDevicePixelRatio, createElement } from './utils.js';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs';

export class PDFEngine extends EventTarget {
  constructor() {
    super();
    this.pdfDoc = null;
    this.totalPages = 0;
    this.currentPage = 1;
    this.currentScale = 1.5;
    this.rotation = 0;
    this.renderedPages = new Map();
    this.renderTasks = new Map();
    this.pageViewports = new Map();
    this.viewerContainer = null;
    this.observer = null;
  }

  async loadDocument(arrayBuffer) {
    if (this.pdfDoc) {
      this.destroy();
    }

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    this.pdfDoc = await loadingTask.promise;
    this.totalPages = this.pdfDoc.numPages;
    this.currentPage = 1;

    this.emit('documentLoaded', {
      totalPages: this.totalPages,
      fingerprint: this.pdfDoc.fingerprints[0],
    });

    return this.pdfDoc;
  }

  setViewerContainer(container) {
    this.viewerContainer = container;
  }

  async setupPages() {
    if (!this.viewerContainer) return;
    this.viewerContainer.innerHTML = '';
    this.renderedPages.clear();
    this.pageViewports.clear();

    // Create placeholder wrappers for all pages
    for (let i = 1; i <= this.totalPages; i++) {
      const page = await this.pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: this.currentScale, rotation: this.rotation });
      this.pageViewports.set(i, { width: viewport.width, height: viewport.height });

      const wrapper = createElement('div', 'page-wrapper', this.viewerContainer);
      wrapper.dataset.page = i;
      wrapper.style.width = `${viewport.width}px`;
      wrapper.style.height = `${viewport.height}px`;

      // Loading placeholder
      const spinner = createElement('div', 'page-spinner', wrapper);
      spinner.textContent = i;
    }

    this.setupIntersectionObserver();
  }

  setupIntersectionObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageNum = parseInt(entry.target.dataset.page);
          if (entry.isIntersecting) {
            if (!this.renderedPages.has(pageNum)) {
              this.renderPage(pageNum);
            }
          }
        }
      },
      {
        root: this.viewerContainer,
        rootMargin: '200px 0px',
        threshold: 0,
      }
    );

    const wrappers = this.viewerContainer.querySelectorAll('.page-wrapper');
    wrappers.forEach((w) => this.observer.observe(w));
  }

  async renderPage(pageNum) {
    if (!this.pdfDoc || this.renderedPages.get(pageNum) === 'rendering') return;
    this.renderedPages.set(pageNum, 'rendering');

    // Cancel any existing render task
    const existingTask = this.renderTasks.get(pageNum);
    if (existingTask) {
      existingTask.cancel();
      this.renderTasks.delete(pageNum);
    }

    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: this.currentScale, rotation: this.rotation });
      const wrapper = this.viewerContainer.querySelector(`.page-wrapper[data-page="${pageNum}"]`);
      if (!wrapper) return;

      // Clear existing content
      wrapper.innerHTML = '';
      wrapper.style.width = `${viewport.width}px`;
      wrapper.style.height = `${viewport.height}px`;

      // Canvas
      const dpr = getDevicePixelRatio();
      const canvas = createElement('canvas', 'page-canvas', wrapper);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      const renderTask = page.render({ canvasContext: ctx, viewport });
      this.renderTasks.set(pageNum, renderTask);

      await renderTask.promise;
      this.renderTasks.delete(pageNum);

      // Text layer
      const textLayerDiv = createElement('div', 'textLayer', wrapper);
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;
      textLayerDiv.style.setProperty('--scale-factor', this.currentScale);

      const textContent = await page.getTextContent();
      const textLayer = new pdfjsLib.TextLayer({
        container: textLayerDiv,
        textContentSource: textContent,
        viewport,
      });
      await textLayer.render();

      // Custom annotations layer
      const annotLayer = createElement('div', 'custom-annotations', wrapper);
      annotLayer.dataset.page = pageNum;

      this.renderedPages.set(pageNum, 'rendered');
      this.emit('pageRendered', { pageNum });
    } catch (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.error(`Error rendering page ${pageNum}:`, err);
      }
      this.renderedPages.delete(pageNum);
    }
  }

  async reRenderAllVisible() {
    // Clear all rendered state and re-setup
    for (const [pageNum, task] of this.renderTasks) {
      task.cancel();
    }
    this.renderTasks.clear();
    this.renderedPages.clear();

    await this.setupPages();
  }

  setScale(newScale) {
    if (newScale < 0.25 || newScale > 5) return;
    this.currentScale = newScale;
    this.emit('scaleChanged', { scale: newScale });
    this.reRenderAllVisible();
  }

  setRotation(degrees) {
    this.rotation = degrees % 360;
    this.emit('rotationChanged', { rotation: this.rotation });
    this.reRenderAllVisible();
  }

  scrollToPage(pageNum) {
    if (pageNum < 1 || pageNum > this.totalPages) return;
    const wrapper = this.viewerContainer.querySelector(`.page-wrapper[data-page="${pageNum}"]`);
    if (wrapper) {
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.currentPage = pageNum;
      this.emit('pageChanged', { pageNum });
    }
  }

  getCurrentVisiblePage() {
    if (!this.viewerContainer) return 1;
    const wrappers = this.viewerContainer.querySelectorAll('.page-wrapper');
    const containerRect = this.viewerContainer.getBoundingClientRect();
    const containerMid = containerRect.top + containerRect.height / 2;

    let closestPage = 1;
    let closestDist = Infinity;

    for (const w of wrappers) {
      const rect = w.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const dist = Math.abs(mid - containerMid);
      if (dist < closestDist) {
        closestDist = dist;
        closestPage = parseInt(w.dataset.page);
      }
    }

    return closestPage;
  }

  async getPageText(pageNum) {
    const page = await this.pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    return textContent.items.map((item) => item.str).join(' ');
  }

  async getOutline() {
    if (!this.pdfDoc) return null;
    return this.pdfDoc.getOutline();
  }

  async getDestinationPage(dest) {
    if (!this.pdfDoc) return null;
    try {
      let ref;
      if (typeof dest === 'string') {
        ref = await this.pdfDoc.getDestination(dest);
      } else {
        ref = dest;
      }
      if (ref && ref[0]) {
        const pageIndex = await this.pdfDoc.getPageIndex(ref[0]);
        return pageIndex + 1; // 1-based
      }
    } catch (e) {
      console.error('Error resolving destination:', e);
    }
    return null;
  }

  fitWidth() {
    if (!this.viewerContainer || !this.pdfDoc) return;
    const containerWidth = this.viewerContainer.clientWidth - 40; // padding
    // Use first page as reference
    const vp = this.pageViewports.get(1);
    if (!vp) return;
    const baseWidth = vp.width / this.currentScale;
    const newScale = containerWidth / baseWidth;
    this.setScale(Math.round(newScale * 100) / 100);
  }

  fitPage() {
    if (!this.viewerContainer || !this.pdfDoc) return;
    const containerWidth = this.viewerContainer.clientWidth - 40;
    const containerHeight = this.viewerContainer.clientHeight - 20;
    const vp = this.pageViewports.get(1);
    if (!vp) return;
    const baseWidth = vp.width / this.currentScale;
    const baseHeight = vp.height / this.currentScale;
    const scaleW = containerWidth / baseWidth;
    const scaleH = containerHeight / baseHeight;
    const newScale = Math.min(scaleW, scaleH);
    this.setScale(Math.round(newScale * 100) / 100);
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    for (const [, task] of this.renderTasks) {
      task.cancel();
    }
    this.renderTasks.clear();
    this.renderedPages.clear();
    this.pageViewports.clear();
    if (this.pdfDoc) {
      this.pdfDoc.destroy();
      this.pdfDoc = null;
    }
    this.totalPages = 0;
    this.currentPage = 1;
  }

  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
