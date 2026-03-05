/**
 * PDF Viewer - Bundled (no ES modules, works with file:// protocol)
 */
(function () {
  'use strict';

  // ==================== utils.js ====================
  const LABELS = {
    openFile: '파일 열기',
    prevPage: '이전',
    nextPage: '다음',
    pageOf: '/',
    pageSuffix: '페이지',
    zoomIn: '확대',
    zoomOut: '축소',
    fitWidth: '너비 맞춤',
    fitPage: '페이지 맞춤',
    rotate: '회전',
    print: '인쇄',
    search: '검색',
    searchPlaceholder: '검색어 입력...',
    matchOf: '/',
    matchSuffix: '일치',
    noMatches: '결과 없음',
    thumbnails: '미리보기',
    outline: '목차',
    bookmarks: '북마크',
    addBookmark: '북마크 추가',
    darkMode: '다크 모드',
    highlight: '형광펜',
    memo: '메모',
    delete: '삭제',
    noOutline: '목차가 없습니다',
    noBookmarks: '북마크가 없습니다',
    noMemos: '메모가 없습니다',
    dragDropTitle: 'PDF 파일을 여기에 끌어다 놓으세요',
    dragDropSub: '또는 클릭하여 파일 선택',
    loading: '로딩 중...',
    errorEncrypted: '암호화된 PDF 파일입니다',
    errorLoad: 'PDF 파일을 열 수 없습니다',
    bookmarkLabel: '북마크 이름',
    close: '닫기',
    colors: {
      yellow: '노랑',
      green: '초록',
      blue: '파랑',
      pink: '분홍',
      red: '빨강',
    },
  };

  const HIGHLIGHT_COLORS = {
    yellow: 'rgba(255, 235, 59, 0.4)',
    green: 'rgba(76, 175, 80, 0.4)',
    blue: 'rgba(33, 150, 243, 0.4)',
    pink: 'rgba(233, 30, 99, 0.4)',
    red: 'rgba(244, 67, 54, 0.4)',
    'yellow-outline': 'rgba(255, 235, 59, 0.9)',
    'green-outline': 'rgba(76, 175, 80, 0.9)',
    'blue-outline': 'rgba(33, 150, 243, 0.9)',
    'pink-outline': 'rgba(233, 30, 99, 0.9)',
    'red-outline': 'rgba(244, 67, 54, 0.9)',
  };

  // Base RGB values for box colors (opacity applied dynamically)
  var COLOR_RGB = {
    yellow: [255, 235, 59],
    green: [76, 175, 80],
    blue: [33, 150, 243],
    pink: [233, 30, 99],
    red: [244, 67, 54],
  };

  function colorWithOpacity(colorName, opacity) {
    // If it starts with '#', it's a hex color from eyedropper
    if (colorName && colorName.charAt(0) === '#') {
      var r = parseInt(colorName.substr(1, 2), 16);
      var g = parseInt(colorName.substr(3, 2), 16);
      var b = parseInt(colorName.substr(5, 2), 16);
      return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + opacity + ')';
    }
    var rgb = COLOR_RGB[colorName];
    if (!rgb) return null;
    return 'rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', ' + opacity + ')';
  }

  function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add('toast-show');
    });
    setTimeout(function () {
      toast.classList.add('toast-hide');
      toast.addEventListener('animationend', function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      });
    }, 1200);
  }

  function hashCode(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  var BOX_COLORS = {
    yellow: 'rgba(255, 235, 59, 0.4)',
    green: 'rgba(76, 175, 80, 0.4)',
    blue: 'rgba(33, 150, 243, 0.4)',
    pink: 'rgba(233, 30, 99, 0.4)',
    red: 'rgba(244, 67, 54, 0.4)',
  };

  var BOX_BORDER_COLORS = {
    yellow: 'rgba(255, 235, 59, 0.9)',
    green: 'rgba(76, 175, 80, 0.9)',
    blue: 'rgba(33, 150, 243, 0.9)',
    pink: 'rgba(233, 30, 99, 0.9)',
    red: 'rgba(244, 67, 54, 0.9)',
  };

  var UNDERLINE_COLORS = {
    red: 'rgba(244, 67, 54, 0.9)',
    blue: 'rgba(33, 150, 243, 0.9)',
    green: 'rgba(76, 175, 80, 0.9)',
    yellow: 'rgba(255, 235, 59, 0.9)',
    pink: 'rgba(233, 30, 99, 0.9)',
  };

  function isOutlineColor(colorName) {
    return colorName && colorName.indexOf('-outline') !== -1;
  }

  function debounce(fn, delay) {
    var timer;
    return function () {
      var args = arguments;
      var self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, delay);
    };
  }

  function throttle(fn, limit) {
    var inThrottle = false;
    return function () {
      var args = arguments;
      var self = this;
      if (!inThrottle) {
        fn.apply(self, args);
        inThrottle = true;
        setTimeout(function () { inThrottle = false; }, limit);
      }
    };
  }

  function generateId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  function getDevicePixelRatio() {
    return window.devicePixelRatio || 1;
  }

  function $(selector, parent) {
    return (parent || document).querySelector(selector);
  }

  function $$(selector, parent) {
    return (parent || document).querySelectorAll(selector);
  }

  function createElement(tag, className, parent) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
    return el;
  }

  // ==================== storage.js ====================
  var STORAGE_PREFIX = 'pdfviewer_';

  function StorageManager() {}

  StorageManager.prototype.saveHighlights = function (docKey, highlights) {
    this._save(docKey, 'highlights', highlights);
  };
  StorageManager.prototype.loadHighlights = function (docKey) {
    return this._load(docKey, 'highlights') || [];
  };
  StorageManager.prototype.saveMemos = function (docKey, memos) {
    this._save(docKey, 'memos', memos);
  };
  StorageManager.prototype.loadMemos = function (docKey) {
    return this._load(docKey, 'memos') || [];
  };
  StorageManager.prototype.saveBoxes = function (docKey, boxes) {
    this._save(docKey, 'boxes', boxes);
  };
  StorageManager.prototype.loadBoxes = function (docKey) {
    return this._load(docKey, 'boxes') || [];
  };
  StorageManager.prototype.saveUnderlines = function (docKey, underlines) {
    this._save(docKey, 'underlines', underlines);
  };
  StorageManager.prototype.loadUnderlines = function (docKey) {
    return this._load(docKey, 'underlines') || [];
  };
  StorageManager.prototype.saveEmojis = function (docKey, emojis) {
    this._save(docKey, 'emojis', emojis);
  };
  StorageManager.prototype.loadEmojis = function (docKey) {
    return this._load(docKey, 'emojis') || [];
  };
  StorageManager.prototype.saveBookmarks = function (docKey, bookmarks) {
    this._save(docKey, 'bookmarks', bookmarks);
  };
  StorageManager.prototype.loadBookmarks = function (docKey) {
    return this._load(docKey, 'bookmarks') || [];
  };
  StorageManager.prototype.saveViewState = function (docKey, state) {
    this._save(docKey, 'viewState', state);
  };
  StorageManager.prototype.loadViewState = function (docKey) {
    return this._load(docKey, 'viewState') || null;
  };
  StorageManager.prototype._getStore = function (docKey) {
    try {
      var raw = localStorage.getItem(STORAGE_PREFIX + docKey);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  };
  StorageManager.prototype._setStore = function (docKey, store) {
    try {
      localStorage.setItem(STORAGE_PREFIX + docKey, JSON.stringify(store));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  };
  StorageManager.prototype._save = function (docKey, key, value) {
    var store = this._getStore(docKey);
    store[key] = value;
    this._setStore(docKey, store);
  };
  StorageManager.prototype._load = function (docKey, key) {
    var store = this._getStore(docKey);
    return store[key];
  };

  // ==================== pdf-engine.js ====================
  // pdfjsLib is loaded as a global from the <script> tag

  pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';

  function PDFEngine() {
    this._listeners = {};
    this.pdfDoc = null;
    this.totalPages = 0;
    this.currentPage = 1;
    this.currentScale = 1.5;
    this.rotation = 0;
    this.spreadMode = false;
    this.comicMode = false;
    this.renderedPages = new Map();
    this.renderTasks = new Map();
    this.pageViewports = new Map();
    this.viewerContainer = null;
    this.observer = null;
    this.isImageMode = false;
    this.imageData = null;
  }

  PDFEngine.prototype.addEventListener = function (type, fn) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(fn);
  };

  PDFEngine.prototype.removeEventListener = function (type, fn) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter(function (f) { return f !== fn; });
  };

  PDFEngine.prototype.emit = function (type, detail) {
    var event = { detail: detail || {} };
    var fns = this._listeners[type];
    if (fns) {
      fns.forEach(function (fn) { fn(event); });
    }
  };

  PDFEngine.prototype.loadDocument = function (arrayBuffer) {
    var self = this;
    if (this.pdfDoc) {
      this.destroy();
    }
    var loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    return loadingTask.promise.then(function (pdfDoc) {
      self.pdfDoc = pdfDoc;
      self.totalPages = pdfDoc.numPages;
      self.currentPage = 1;
      self.emit('documentLoaded', {
        totalPages: self.totalPages,
        fingerprint: pdfDoc.fingerprints[0],
      });
      return pdfDoc;
    });
  };

  // Image mode: display image as a single virtual page
  PDFEngine.prototype.setupImageMode = function (img, fileName, fileSize) {
    if (this.pdfDoc) this.destroy();
    this.isImageMode = true;
    this.imageData = img;
    this.pdfDoc = null;
    this.totalPages = 1;
    this.currentPage = 1;

    var docKey = 'img_' + hashCode(fileName + fileSize);
    var width = img.naturalWidth * this.currentScale;
    var height = img.naturalHeight * this.currentScale;

    this.viewerContainer.innerHTML = '';
    // Remove any existing iframe
    var existingIframe = document.getElementById('url-iframe-container');
    if (existingIframe) existingIframe.remove();

    var wrapper = document.createElement('div');
    wrapper.className = 'page-wrapper';
    wrapper.dataset.page = '1';
    wrapper.style.width = width + 'px';
    wrapper.style.height = height + 'px';
    this.viewerContainer.appendChild(wrapper);

    var dpr = window.devicePixelRatio || 1;
    var canvas = document.createElement('canvas');
    canvas.className = 'page-canvas';
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    wrapper.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.drawImage(img, 0, 0, width, height);

    var annotLayer = document.createElement('div');
    annotLayer.className = 'custom-annotations';
    annotLayer.dataset.page = '1';
    wrapper.appendChild(annotLayer);

    this.renderedPages = this.renderedPages || new Map();
    this.renderedPages.set(1, 'rendered');
    this.pageViewports = this.pageViewports || new Map();
    this.pageViewports.set(1, { width: width, height: height, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });

    this.emit('documentLoaded', {
      totalPages: 1,
      fingerprint: docKey,
    });
    this.emit('pageRendered', { pageNum: 1 });
  };

  PDFEngine.prototype.setViewerContainer = function (container) {
    this.viewerContainer = container;
  };

  PDFEngine.prototype.setupPages = function () {
    var self = this;
    if (!this.viewerContainer) return Promise.resolve();
    this.viewerContainer.innerHTML = '';
    this.renderedPages.clear();
    this.pageViewports.clear();

    // Toggle spread-mode class on container
    this.viewerContainer.classList.toggle('spread-mode', this.spreadMode);

    var chain = Promise.resolve();
    var currentRow = null;
    var pagesInRow = 0;

    for (var i = 1; i <= this.totalPages; i++) {
      (function (pageNum) {
        chain = chain.then(function () {
          return self.pdfDoc.getPage(pageNum).then(function (page) {
            var viewport = page.getViewport({ scale: self.currentScale, rotation: self.rotation });
            self.pageViewports.set(pageNum, { width: viewport.width, height: viewport.height });

            var parent;
            if (self.spreadMode) {
              // First page alone as cover, then pairs
              var needNewRow = false;
              if (pageNum === 1) {
                needNewRow = true;
                pagesInRow = 0;
              } else if (pagesInRow >= 2) {
                needNewRow = true;
                pagesInRow = 0;
              }
              if (needNewRow || !currentRow) {
                currentRow = createElement('div', 'page-spread-row', self.viewerContainer);
                pagesInRow = 0;
              }
              parent = currentRow;
              pagesInRow++;
            } else {
              parent = self.viewerContainer;
            }

            var wrapper = createElement('div', 'page-wrapper', parent);
            wrapper.dataset.page = pageNum;
            wrapper.style.width = viewport.width + 'px';
            wrapper.style.height = viewport.height + 'px';

            var spinner = createElement('div', 'page-spinner', wrapper);
            spinner.textContent = pageNum;
          });
        });
      })(i);
    }

    return chain.then(function () {
      self.setupIntersectionObserver();
      self.viewerContainer.classList.toggle('comic-mode', self.comicMode);
      if (self.comicMode) {
        self.comicShowCurrent();
      }
    });
  };

  PDFEngine.prototype.setupIntersectionObserver = function () {
    var self = this;
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          var pageNum = parseInt(entry.target.dataset.page);
          if (entry.isIntersecting) {
            if (!self.renderedPages.has(pageNum)) {
              self.renderPage(pageNum);
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

    var wrappers = this.viewerContainer.querySelectorAll('.page-wrapper');
    wrappers.forEach(function (w) { self.observer.observe(w); });
  };

  PDFEngine.prototype.renderPage = function (pageNum) {
    var self = this;
    if (!this.pdfDoc || this.renderedPages.get(pageNum) === 'rendering') return Promise.resolve();
    this.renderedPages.set(pageNum, 'rendering');

    var existingTask = this.renderTasks.get(pageNum);
    if (existingTask) {
      existingTask.cancel();
      this.renderTasks.delete(pageNum);
    }

    return this.pdfDoc.getPage(pageNum).then(function (page) {
      var viewport = page.getViewport({ scale: self.currentScale, rotation: self.rotation });
      var wrapper = self.viewerContainer.querySelector('.page-wrapper[data-page="' + pageNum + '"]');
      if (!wrapper) return;

      wrapper.innerHTML = '';
      wrapper.style.width = viewport.width + 'px';
      wrapper.style.height = viewport.height + 'px';

      var dpr = getDevicePixelRatio();
      var canvas = createElement('canvas', 'page-canvas', wrapper);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';

      var ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      var renderTask = page.render({ canvasContext: ctx, viewport: viewport });
      self.renderTasks.set(pageNum, renderTask);

      return renderTask.promise.then(function () {
        self.renderTasks.delete(pageNum);

        // Text layer
        var textLayerDiv = createElement('div', 'textLayer', wrapper);
        textLayerDiv.style.width = viewport.width + 'px';
        textLayerDiv.style.height = viewport.height + 'px';
        textLayerDiv.style.setProperty('--scale-factor', self.currentScale);

        return page.getTextContent().then(function (textContent) {
          return pdfjsLib.renderTextLayer({
            textContent: textContent,
            container: textLayerDiv,
            viewport: viewport,
            textDivs: [],
          }).promise;
        });
      }).then(function () {
        var annotLayer = createElement('div', 'custom-annotations', wrapper);
        annotLayer.dataset.page = pageNum;

        self.renderedPages.set(pageNum, 'rendered');
        self.emit('pageRendered', { pageNum: pageNum });
      });
    }).catch(function (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Error rendering page ' + pageNum + ':', err);
      }
      self.renderedPages.delete(pageNum);
    });
  };

  PDFEngine.prototype.reRenderAllVisible = function () {
    var self = this;
    this.renderTasks.forEach(function (task) { task.cancel(); });
    this.renderTasks.clear();
    this.renderedPages.clear();
    return this.setupPages();
  };

  PDFEngine.prototype.setScale = function (newScale) {
    if (newScale < 0.25 || newScale > 5) return;
    this.currentScale = newScale;
    this.emit('scaleChanged', { scale: newScale });
    this.reRenderAllVisible();
  };

  PDFEngine.prototype.toggleSpreadMode = function () {
    this.spreadMode = !this.spreadMode;
    this.emit('spreadModeChanged', { spreadMode: this.spreadMode });
    if (this.comicMode) {
      this.fitPage();
    } else {
      this.reRenderAllVisible();
    }
  };

  PDFEngine.prototype.toggleComicMode = function () {
    this.comicMode = !this.comicMode;
    this.emit('comicModeChanged', { comicMode: this.comicMode });
    if (!this.pdfDoc) return;
    if (this.comicMode) {
      this.viewerContainer.classList.add('comic-mode');
      this.fitPage();
    } else {
      var savedPage = this.currentPage;
      this.viewerContainer.classList.remove('comic-mode');
      var els = this.viewerContainer.querySelectorAll('.comic-visible');
      for (var i = 0; i < els.length; i++) els[i].classList.remove('comic-visible');
      var self = this;
      this.reRenderAllVisible().then(function () {
        var wrapper = self.viewerContainer.querySelector('.page-wrapper[data-page="' + savedPage + '"]');
        if (wrapper) {
          wrapper.scrollIntoView({ block: 'start' });
        }
      });
    }
  };

  PDFEngine.prototype.comicShowCurrent = function () {
    if (!this.comicMode || !this.viewerContainer) return;
    var self = this;
    var visible = this.viewerContainer.querySelectorAll('.comic-visible');
    for (var i = 0; i < visible.length; i++) visible[i].classList.remove('comic-visible');

    if (this.spreadMode) {
      var wrapper = this.viewerContainer.querySelector('.page-wrapper[data-page="' + this.currentPage + '"]');
      if (wrapper) {
        var row = wrapper.closest('.page-spread-row');
        if (row) {
          row.classList.add('comic-visible');
          var pages = row.querySelectorAll('.page-wrapper');
          for (var j = 0; j < pages.length; j++) {
            var pn = parseInt(pages[j].dataset.page);
            if (!self.renderedPages.has(pn)) {
              self.renderPage(pn);
            }
          }
        }
      }
    } else {
      var wrapper = this.viewerContainer.querySelector('.page-wrapper[data-page="' + this.currentPage + '"]');
      if (wrapper) {
        wrapper.classList.add('comic-visible');
        if (!self.renderedPages.has(this.currentPage)) {
          self.renderPage(this.currentPage);
        }
      }
    }
  };

  PDFEngine.prototype.comicNext = function () {
    if (!this.comicMode) return;
    if (this.spreadMode) {
      var wrapper = this.viewerContainer.querySelector('.page-wrapper[data-page="' + this.currentPage + '"]');
      if (wrapper) {
        var row = wrapper.closest('.page-spread-row');
        if (row && row.nextElementSibling) {
          var firstPage = row.nextElementSibling.querySelector('.page-wrapper');
          if (firstPage) {
            this.scrollToPage(parseInt(firstPage.dataset.page));
          }
        }
      }
    } else {
      if (this.currentPage < this.totalPages) {
        this.scrollToPage(this.currentPage + 1);
      }
    }
  };

  PDFEngine.prototype.comicPrev = function () {
    if (!this.comicMode) return;
    if (this.spreadMode) {
      var wrapper = this.viewerContainer.querySelector('.page-wrapper[data-page="' + this.currentPage + '"]');
      if (wrapper) {
        var row = wrapper.closest('.page-spread-row');
        if (row && row.previousElementSibling) {
          var firstPage = row.previousElementSibling.querySelector('.page-wrapper');
          if (firstPage) {
            this.scrollToPage(parseInt(firstPage.dataset.page));
          }
        }
      }
    } else {
      if (this.currentPage > 1) {
        this.scrollToPage(this.currentPage - 1);
      }
    }
  };

  PDFEngine.prototype.setRotation = function (degrees) {
    this.rotation = degrees % 360;
    this.emit('rotationChanged', { rotation: this.rotation });
    this.reRenderAllVisible();
  };

  PDFEngine.prototype.scrollToPage = function (pageNum) {
    if (pageNum < 1 || pageNum > this.totalPages) return;
    this.currentPage = pageNum;
    this.emit('pageChanged', { pageNum: pageNum });
    if (this.comicMode) {
      this.comicShowCurrent();
      return;
    }
    var wrapper = this.viewerContainer.querySelector('.page-wrapper[data-page="' + pageNum + '"]');
    if (wrapper) {
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  PDFEngine.prototype.getCurrentVisiblePage = function () {
    if (!this.viewerContainer) return 1;
    var wrappers = this.viewerContainer.querySelectorAll('.page-wrapper');
    var containerRect = this.viewerContainer.getBoundingClientRect();
    var containerMid = containerRect.top + containerRect.height / 2;

    var closestPage = 1;
    var closestDist = Infinity;

    for (var i = 0; i < wrappers.length; i++) {
      var w = wrappers[i];
      var rect = w.getBoundingClientRect();
      var mid = rect.top + rect.height / 2;
      var dist = Math.abs(mid - containerMid);
      if (dist < closestDist) {
        closestDist = dist;
        closestPage = parseInt(w.dataset.page);
      }
    }

    return closestPage;
  };

  PDFEngine.prototype.getPageText = function (pageNum) {
    return this.pdfDoc.getPage(pageNum).then(function (page) {
      return page.getTextContent().then(function (textContent) {
        return textContent.items.map(function (item) { return item.str; }).join(' ');
      });
    });
  };

  PDFEngine.prototype.getOutline = function () {
    if (!this.pdfDoc) return Promise.resolve(null);
    return this.pdfDoc.getOutline();
  };

  PDFEngine.prototype.getDestinationPage = function (dest) {
    var self = this;
    if (!this.pdfDoc) return Promise.resolve(null);
    try {
      var prom;
      if (typeof dest === 'string') {
        prom = this.pdfDoc.getDestination(dest);
      } else {
        prom = Promise.resolve(dest);
      }
      return prom.then(function (ref) {
        if (ref && ref[0]) {
          return self.pdfDoc.getPageIndex(ref[0]).then(function (pageIndex) {
            return pageIndex + 1;
          });
        }
        return null;
      });
    } catch (e) {
      console.error('Error resolving destination:', e);
      return Promise.resolve(null);
    }
  };

  PDFEngine.prototype.fitWidth = function () {
    if (!this.viewerContainer || !this.pdfDoc) return;
    var containerWidth = this.viewerContainer.clientWidth - 40;
    var vp = this.pageViewports.get(1);
    if (!vp) return;
    var baseWidth = vp.width / this.currentScale;
    if (this.spreadMode) {
      // In spread mode, 2 pages + gap (16px) must fit
      var newScale = (containerWidth - 16) / (baseWidth * 2);
      this.setScale(Math.round(newScale * 100) / 100);
    } else {
      var newScale = containerWidth / baseWidth;
      this.setScale(Math.round(newScale * 100) / 100);
    }
  };

  PDFEngine.prototype.fitPage = function () {
    if (!this.viewerContainer || !this.pdfDoc) return;
    var containerWidth = this.viewerContainer.clientWidth - 40;
    var containerHeight = this.viewerContainer.clientHeight - 20;
    var vp = this.pageViewports.get(1);
    if (!vp) return;
    var baseWidth = vp.width / this.currentScale;
    var baseHeight = vp.height / this.currentScale;
    var scaleW, scaleH;
    if (this.spreadMode) {
      scaleW = (containerWidth - 16) / (baseWidth * 2);
    } else {
      scaleW = containerWidth / baseWidth;
    }
    scaleH = containerHeight / baseHeight;
    var newScale = Math.min(scaleW, scaleH);
    this.setScale(Math.round(newScale * 100) / 100);
  };

  PDFEngine.prototype.destroy = function () {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.renderTasks.forEach(function (task) { task.cancel(); });
    this.renderTasks.clear();
    this.renderedPages.clear();
    this.pageViewports.clear();
    if (this.pdfDoc) {
      this.pdfDoc.destroy();
      this.pdfDoc = null;
    }
    this.totalPages = 0;
    this.currentPage = 1;
  };

  // ==================== toolbar.js ====================
  function Toolbar(pdfEngine) {
    this.engine = pdfEngine;
    this.elements = {};
  }

  Toolbar.prototype.init = function () {
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
      spreadBtn: $('#btn-spread'),
      comicBtn: $('#btn-comic'),
      rotateBtn: $('#btn-rotate'),
      memoColorBtn: $('#btn-memo-color'),
      memoColorIndicator: $('#memo-color-indicator'),
      memoColorDropdown: $('#memo-color-dropdown'),
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
      toggleLabelsBtn: $('#btn-toggle-labels'),
      boxDrawBtn: $('#btn-box-draw'),
      boxColorBtn: $('#btn-box-color'),
      boxColorDropdown: $('#box-color-dropdown'),
      boxColorIndicator: $('#box-color-indicator'),
      underlineBtn: $('#btn-underline'),
      underlineDropdown: $('#underline-dropdown'),
      underlineIndicator: $('#underline-indicator'),
      saveBtn: $('#btn-save'),
      urlBtn: $('#btn-url'),
      urlBar: $('#url-bar'),
      urlInput: $('#url-input'),
      urlGo: $('#url-go'),
      urlClose: $('#url-close'),
      deleteSelectedBtn: $('#btn-delete-selected'),
    };

    this.bindEvents();
    this.updateControls(false);
  };

  Toolbar.prototype.bindEvents = function () {
    var self = this;
    var engine = this.engine;

    // Navigation
    this.elements.prevBtn.addEventListener('click', function () {
      if (engine.comicMode) {
        engine.comicPrev();
      } else {
        var page = engine.currentPage - 1;
        if (page >= 1) engine.scrollToPage(page);
      }
    });

    this.elements.nextBtn.addEventListener('click', function () {
      if (engine.comicMode) {
        engine.comicNext();
      } else {
        var page = engine.currentPage + 1;
        if (page <= engine.totalPages) engine.scrollToPage(page);
      }
    });

    this.elements.pageInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var page = parseInt(e.target.value);
        if (page >= 1 && page <= engine.totalPages) {
          engine.scrollToPage(page);
        } else {
          e.target.value = engine.currentPage;
        }
        e.target.blur();
      }
    });

    // Zoom
    this.elements.zoomOutBtn.addEventListener('click', function () {
      engine.setScale(Math.round((engine.currentScale - 0.25) * 100) / 100);
    });

    this.elements.zoomInBtn.addEventListener('click', function () {
      engine.setScale(Math.round((engine.currentScale + 0.25) * 100) / 100);
    });

    this.elements.fitWidthBtn.addEventListener('click', function () {
      engine.fitWidth();
    });

    this.elements.fitPageBtn.addEventListener('click', function () {
      engine.fitPage();
    });

    // Spread mode (2-page view)
    this.elements.spreadBtn.addEventListener('click', function () {
      engine.toggleSpreadMode();
    });

    engine.addEventListener('spreadModeChanged', function (e) {
      self.updateSpreadButton(e.detail.spreadMode);
    });

    // Comic mode
    this.elements.comicBtn.addEventListener('click', function () {
      engine.toggleComicMode();
    });

    engine.addEventListener('comicModeChanged', function (e) {
      self.updateComicButton(e.detail.comicMode);
    });

    // Rotate
    this.elements.rotateBtn.addEventListener('click', function () {
      engine.setRotation(engine.rotation + 90);
    });

    // Print
    this.elements.printBtn.addEventListener('click', function () {
      self.handlePrint();
    });

    // Dark mode
    this.elements.darkModeBtn.addEventListener('click', function () {
      document.body.classList.toggle('dark-mode');
      var isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('pdfviewer_darkmode', isDark);
      self.updateDarkModeIcon(isDark);
    });

    // Memo color palette
    if (this.elements.memoColorBtn) {
      this.elements.memoColorBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        self.toggleMemoColorDropdown();
      });
    }
    if (this.elements.memoColorDropdown) {
      var swatches = this.elements.memoColorDropdown.querySelectorAll('.memo-color-swatch');
      swatches.forEach(function (swatch) {
        swatch.addEventListener('click', function (e) {
          e.stopPropagation();
          engine.emit('memoColorChanged', { color: swatch.dataset.color });
          self.updateMemoColorIndicator(swatch.dataset.color);
          self.toggleMemoColorDropdown(false);
        });
      });
      // Close dropdown when clicking outside
      document.addEventListener('mousedown', function (e) {
        if (!self.elements.memoColorBtn.parentElement.contains(e.target)) {
          self.toggleMemoColorDropdown(false);
        }
      });
      // Set default active
      this.updateMemoColorIndicator('yellow');
    }

    // Label toggle ("한" button)
    if (this.elements.toggleLabelsBtn) {
      this.elements.toggleLabelsBtn.addEventListener('click', function () {
        self.toggleLabelsMode();
      });
      // Restore from localStorage
      if (localStorage.getItem('pdfviewer_labelsMode') === 'true') {
        $('#toolbar').classList.add('toolbar-labels-mode');
      }
    }

    // Box draw toggle
    if (this.elements.boxDrawBtn) {
      this.elements.boxDrawBtn.addEventListener('click', function () {
        var current = engine._activeDrawTool || 'none';
        if (current === 'box') {
          engine.emit('setDrawTool', { tool: 'none' });
        } else {
          engine.emit('setDrawTool', { tool: 'box' });
        }
      });
    }

    // Box color dropdown
    if (this.elements.boxColorBtn) {
      this.elements.boxColorBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        self.toggleBoxColorDropdown();
      });
    }
    if (this.elements.boxColorDropdown) {
      var boxSwatches = this.elements.boxColorDropdown.querySelectorAll('.box-color-swatch');
      boxSwatches.forEach(function (swatch) {
        swatch.addEventListener('click', function (e) {
          e.stopPropagation();
          var type = swatch.dataset.type;
          var color = swatch.dataset.color;
          engine.emit('boxColorChanged', { type: type, color: color });
          // Update active state
          var row = swatch.parentElement;
          row.querySelectorAll('.box-color-swatch').forEach(function (s) {
            s.classList.toggle('active', s === swatch);
          });
          self.updateBoxColorIndicator();
        });
      });

      // Eyedropper
      var eyedropperBtn = $('#btn-box-eyedropper');
      if (eyedropperBtn) {
        eyedropperBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (window.EyeDropper) {
            var ed = new EyeDropper();
            ed.open().then(function (result) {
              var hexColor = result.sRGBHex;
              var targetSelect = $('#eyedropper-target');
              var targetType = targetSelect ? targetSelect.value : 'fill';
              engine.emit('boxColorChanged', { type: targetType, color: hexColor });
              // Show in eyedropper preview swatch
              var previewSwatch = self.elements.boxColorDropdown.querySelector('.eyedropper-preview[data-type="' + targetType + '"]');
              if (previewSwatch) {
                previewSwatch.style.background = hexColor;
                previewSwatch.dataset.color = hexColor;
                previewSwatch.classList.remove('hidden');
                // Set active
                var row = previewSwatch.parentElement;
                row.querySelectorAll('.box-color-swatch').forEach(function (s) {
                  s.classList.toggle('active', s === previewSwatch);
                });
              }
              self.updateBoxColorIndicator();
            }).catch(function () { /* cancelled */ });
          } else {
            alert('스포이드는 Chrome/Edge에서만 지원됩니다.');
          }
        });
      }

      // Opacity sliders
      var opacitySliders = self.elements.boxColorDropdown.querySelectorAll('.box-opacity-slider');
      opacitySliders.forEach(function (slider) {
        slider.addEventListener('input', function () {
          var type = slider.dataset.type;
          var val = parseInt(slider.value);
          var label = self.elements.boxColorDropdown.querySelector('.box-opacity-value[data-type="' + type + '"]');
          if (label) label.textContent = val + '%';
          engine.emit('boxOpacityChanged', { type: type, opacity: val / 100 });
        });
      });

      // Close on outside click
      document.addEventListener('mousedown', function (e) {
        if (self.elements.boxColorBtn && !self.elements.boxColorBtn.parentElement.contains(e.target)) {
          self.toggleBoxColorDropdown(false);
        }
      });
      this.updateBoxColorIndicator();
    }

    // Underline dropdown
    if (this.elements.underlineBtn) {
      this.elements.underlineBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        self.toggleUnderlineDropdown();
      });
    }
    if (this.elements.underlineDropdown) {
      // Mode buttons
      var modeBtns = this.elements.underlineDropdown.querySelectorAll('.underline-mode-btn');
      modeBtns.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          modeBtns.forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          var mode = btn.dataset.mode;
          engine.emit('setDrawTool', { tool: 'underline-' + mode });
          self.toggleUnderlineDropdown(false);
          self.updateUnderlineIndicator();
        });
      });

      // Color swatches
      var ulColorSwatches = this.elements.underlineDropdown.querySelectorAll('.underline-color-swatch');
      ulColorSwatches.forEach(function (swatch) {
        swatch.addEventListener('click', function (e) {
          e.stopPropagation();
          ulColorSwatches.forEach(function (s) { s.classList.remove('active'); });
          swatch.classList.add('active');
          engine.emit('underlineColorChanged', { color: swatch.dataset.color });
          self.updateUnderlineIndicator();
        });
      });

      // Width buttons
      var widthBtns = this.elements.underlineDropdown.querySelectorAll('.underline-width-btn');
      widthBtns.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          widthBtns.forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          engine.emit('underlineWidthChanged', { width: parseInt(btn.dataset.width) });
          self.updateUnderlineIndicator();
        });
      });

      // Close on outside click
      document.addEventListener('mousedown', function (e) {
        if (self.elements.underlineBtn && !self.elements.underlineBtn.parentElement.contains(e.target)) {
          self.toggleUnderlineDropdown(false);
        }
      });
    }

    // Listen for draw tool changes to update button states
    engine.addEventListener('drawToolChanged', function (e) {
      var tool = e.detail.tool;
      if (self.elements.boxDrawBtn) {
        self.elements.boxDrawBtn.classList.toggle('active-toggle', tool === 'box');
      }
      if (self.elements.underlineBtn) {
        self.elements.underlineBtn.classList.toggle('active-toggle', tool.indexOf('underline') === 0);
      }
    });

    // Sidebar toggle
    this.elements.sidebarBtn.addEventListener('click', function () {
      engine.emit('toggleSidebar');
    });

    // Search toggle
    this.elements.searchBtn.addEventListener('click', function () {
      self.toggleSearchBar();
    });

    this.elements.searchClose.addEventListener('click', function () {
      self.toggleSearchBar(false);
    });

    // Engine events
    engine.addEventListener('pageChanged', function (e) {
      self.updatePageIndicator(e.detail.pageNum, engine.totalPages);
    });

    engine.addEventListener('scaleChanged', function (e) {
      self.updateZoomDisplay(e.detail.scale);
    });

    engine.addEventListener('documentLoaded', function (e) {
      self.updateControls(true);
      self.updatePageIndicator(1, e.detail.totalPages);
      self.updateZoomDisplay(engine.currentScale);
    });

    // Restore dark mode
    if (localStorage.getItem('pdfviewer_darkmode') === 'true') {
      document.body.classList.add('dark-mode');
      this.updateDarkModeIcon(true);
    }

    // Save button
    if (this.elements.saveBtn) {
      this.elements.saveBtn.addEventListener('click', function () {
        engine.emit('explicitSave');
      });
    }

    // Delete selected button
    if (this.elements.deleteSelectedBtn) {
      this.elements.deleteSelectedBtn.addEventListener('click', function () {
        engine.emit('deleteSelected');
      });
    }

    // Show/hide delete button based on selection
    engine.addEventListener('selectionChanged', function (e) {
      var btn = self.elements.deleteSelectedBtn;
      if (btn) {
        btn.classList.toggle('hidden', e.detail.count === 0);
      }
    });

    // URL opener
    if (this.elements.urlBtn) {
      this.elements.urlBtn.addEventListener('click', function () {
        self.toggleUrlBar();
      });
    }
    if (this.elements.urlGo) {
      this.elements.urlGo.addEventListener('click', function () {
        var url = self.elements.urlInput.value.trim();
        if (url) engine.emit('openUrl', { url: url });
      });
    }
    if (this.elements.urlInput) {
      this.elements.urlInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var url = e.target.value.trim();
          if (url) engine.emit('openUrl', { url: url });
        }
        if (e.key === 'Escape') self.toggleUrlBar(false);
      });
    }
    if (this.elements.urlClose) {
      this.elements.urlClose.addEventListener('click', function () {
        self.toggleUrlBar(false);
      });
    }

    // Initialize underline indicator
    this.updateUnderlineIndicator();
  };

  Toolbar.prototype.updateControls = function (enabled) {
    var btns = [
      this.elements.prevBtn, this.elements.nextBtn,
      this.elements.zoomOutBtn, this.elements.zoomInBtn,
      this.elements.fitWidthBtn, this.elements.fitPageBtn,
      this.elements.spreadBtn, this.elements.comicBtn,
      this.elements.rotateBtn,
      this.elements.searchBtn, this.elements.printBtn,
    ];
    btns.forEach(function (btn) { if (btn) btn.disabled = !enabled; });
    if (this.elements.pageInput) this.elements.pageInput.disabled = !enabled;
  };

  Toolbar.prototype.updateSpreadButton = function (isSpread) {
    if (this.elements.spreadBtn) {
      this.elements.spreadBtn.classList.toggle('active-toggle', isSpread);
      this.elements.spreadBtn.title = isSpread ? '1페이지 보기' : '2페이지 보기';
    }
  };

  Toolbar.prototype.updateComicButton = function (isComic) {
    if (this.elements.comicBtn) {
      this.elements.comicBtn.classList.toggle('active-toggle', isComic);
      this.elements.comicBtn.title = isComic ? '만화책 보기 끄기' : '만화책 보기';
    }
  };

  Toolbar.prototype.toggleMemoColorDropdown = function (forceState) {
    var dd = this.elements.memoColorDropdown;
    if (!dd) return;
    var show = forceState !== undefined ? forceState : dd.classList.contains('hidden');
    dd.classList.toggle('hidden', !show);
  };

  Toolbar.prototype.updateMemoColorIndicator = function (colorName) {
    var indicator = this.elements.memoColorIndicator;
    if (!indicator) return;
    var colorMap = {
      yellow: 'rgba(255, 235, 59, 0.8)',
      green: 'rgba(76, 175, 80, 0.8)',
      blue: 'rgba(33, 150, 243, 0.8)',
      pink: 'rgba(233, 30, 99, 0.8)',
      red: 'rgba(244, 67, 54, 0.8)',
      'yellow-outline': 'rgba(255, 235, 59, 0.9)',
      'green-outline': 'rgba(76, 175, 80, 0.9)',
      'blue-outline': 'rgba(33, 150, 243, 0.9)',
      'pink-outline': 'rgba(233, 30, 99, 0.9)',
      'red-outline': 'rgba(244, 67, 54, 0.9)',
    };
    var resolvedColor = colorMap[colorName] || colorMap.yellow;
    if (isOutlineColor(colorName)) {
      indicator.style.background = 'transparent';
      indicator.style.borderColor = resolvedColor;
      indicator.style.borderWidth = '3px';
    } else {
      indicator.style.background = resolvedColor;
      indicator.style.borderColor = 'rgba(255,255,255,0.8)';
      indicator.style.borderWidth = '1.5px';
    }
    // Update active swatch
    var dd = this.elements.memoColorDropdown;
    if (dd) {
      dd.querySelectorAll('.memo-color-swatch').forEach(function (s) {
        s.classList.toggle('active', s.dataset.color === colorName);
      });
    }
  };

  Toolbar.prototype.updatePageIndicator = function (current, total) {
    if (this.elements.pageInput) this.elements.pageInput.value = current;
    if (this.elements.pageTotal) this.elements.pageTotal.textContent = '/ ' + total;
  };

  Toolbar.prototype.updateZoomDisplay = function (scale) {
    if (this.elements.zoomLevel) {
      this.elements.zoomLevel.textContent = Math.round(scale * 100) + '%';
    }
  };

  Toolbar.prototype.updateDarkModeIcon = function (isDark) {
    if (this.elements.darkModeBtn) {
      // Only replace the SVG, preserve .btn-label span
      var svg = this.elements.darkModeBtn.querySelector('svg');
      var newSvg = isDark
        ? '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>';
      if (svg) {
        var temp = document.createElement('div');
        temp.innerHTML = newSvg;
        svg.replaceWith(temp.firstChild);
      }
    }
  };

  Toolbar.prototype.toggleLabelsMode = function () {
    var toolbar = $('#toolbar');
    toolbar.classList.toggle('toolbar-labels-mode');
    var isOn = toolbar.classList.contains('toolbar-labels-mode');
    localStorage.setItem('pdfviewer_labelsMode', isOn);
  };

  Toolbar.prototype.toggleBoxColorDropdown = function (forceState) {
    var dd = this.elements.boxColorDropdown;
    if (!dd) return;
    var show = forceState !== undefined ? forceState : dd.classList.contains('hidden');
    dd.classList.toggle('hidden', !show);
  };

  Toolbar.prototype.updateBoxColorIndicator = function () {
    var indicator = this.elements.boxColorIndicator;
    if (!indicator) return;
    var dd = this.elements.boxColorDropdown;
    if (!dd) return;
    var activeBorder = dd.querySelector('.box-color-swatch.active[data-type="border"]');
    var activeFill = dd.querySelector('.box-color-swatch.active[data-type="fill"]');
    var borderColor = activeBorder ? activeBorder.dataset.color : 'none';
    var fillColor = activeFill ? activeFill.dataset.color : 'none';

    // Show fill as background
    if (fillColor !== 'none') {
      indicator.style.background = colorWithOpacity(fillColor, 0.6) || 'transparent';
    } else {
      indicator.style.background = 'transparent';
    }
    // Show border as border-color
    if (borderColor !== 'none') {
      indicator.style.borderColor = colorWithOpacity(borderColor, 0.9) || 'rgba(255,255,255,0.5)';
      indicator.style.borderWidth = '2px';
      indicator.style.borderStyle = 'solid';
    } else {
      indicator.style.borderColor = 'rgba(255,255,255,0.3)';
      indicator.style.borderWidth = '1px';
      indicator.style.borderStyle = 'dashed';
    }
  };

  Toolbar.prototype.toggleUrlBar = function (forceState) {
    var bar = this.elements.urlBar;
    if (!bar) return;
    var show = forceState !== undefined ? forceState : bar.classList.contains('hidden');
    bar.classList.toggle('hidden', !show);
    if (show) this.elements.urlInput.focus();
  };

  Toolbar.prototype.updateUnderlineIndicator = function () {
    var indicator = this.elements.underlineIndicator;
    if (!indicator) return;
    var dd = this.elements.underlineDropdown;
    if (!dd) return;
    var activeColor = dd.querySelector('.underline-color-swatch.active');
    var colorName = activeColor ? activeColor.dataset.color : 'red';
    var color = UNDERLINE_COLORS[colorName] || UNDERLINE_COLORS.red;
    var activeWidth = dd.querySelector('.underline-width-btn.active');
    var width = activeWidth ? parseInt(activeWidth.dataset.width) : 2;
    var activeMode = dd.querySelector('.underline-mode-btn.active');
    var mode = activeMode ? activeMode.dataset.mode : 'straight';

    indicator.style.height = Math.max(2, width) + 'px';
    if (mode === 'freehand') {
      indicator.style.background = 'transparent';
      indicator.style.borderBottom = width + 'px dotted ' + color;
    } else {
      indicator.style.background = color;
      indicator.style.borderBottom = 'none';
    }
  };

  Toolbar.prototype.toggleUnderlineDropdown = function (forceState) {
    var dd = this.elements.underlineDropdown;
    if (!dd) return;
    var show = forceState !== undefined ? forceState : dd.classList.contains('hidden');
    dd.classList.toggle('hidden', !show);
  };

  Toolbar.prototype.toggleSearchBar = function (forceState) {
    var bar = this.elements.searchBar;
    if (!bar) return;
    var show = forceState !== undefined ? forceState : bar.classList.contains('hidden');
    bar.classList.toggle('hidden', !show);
    if (show) {
      this.elements.searchInput.focus();
    } else {
      this.elements.searchInput.value = '';
      this.elements.searchCount.textContent = '';
      this.engine.emit('searchClear');
    }
  };

  Toolbar.prototype.handlePrint = function () {
    if (!this.engine.pdfDoc) return;
    window.print();
  };

  // ==================== sidebar.js ====================
  function Sidebar(pdfEngine, storage) {
    this.engine = pdfEngine;
    this.storage = storage;
    this.isOpen = true;
    this.activeTab = 'thumbnails';
    this.thumbnailObserver = null;
    this.renderedThumbnails = new Set();
  }

  Sidebar.prototype.init = function () {
    var self = this;
    this.sidebarEl = $('#sidebar');
    this.tabBtns = $$('.sidebar-tab-btn');
    this.panels = {
      thumbnails: $('#panel-thumbnails'),
      outline: $('#panel-outline'),
      bookmarks: $('#panel-bookmarks'),
      memos: $('#panel-memos'),
      decorations: $('#panel-decorations'),
      capture: $('#panel-capture'),
      emoji: $('#panel-emoji'),
    };

    this.tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        self.switchTab(btn.dataset.tab);
      });
    });

    this.engine.addEventListener('toggleSidebar', function () {
      self.toggle();
    });

    this.engine.addEventListener('documentLoaded', function () {
      self.onDocumentLoaded();
    });

    this.engine.addEventListener('pageChanged', function (e) {
      self.highlightCurrentPage(e.detail.pageNum);
    });

    var addBookmarkBtn = $('#btn-add-bookmark');
    if (addBookmarkBtn) {
      addBookmarkBtn.addEventListener('click', function () {
        self.addBookmark();
      });
    }

    // Re-render memo list and decorations when memos change
    this.engine.addEventListener('memosChanged', function () {
      self.renderMemos();
      self.renderDecorations();
    });

    // Render emoji panel
    this.renderEmojiPanel();

    // Setup sidebar resize handle
    this.setupResizeHandle();
  };

  Sidebar.prototype.toggle = function (forceState) {
    this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
    this.sidebarEl.classList.toggle('collapsed', !this.isOpen);
    document.getElementById('app').classList.toggle('sidebar-collapsed', !this.isOpen);
  };

  Sidebar.prototype.switchTab = function (tabName) {
    this.activeTab = tabName;
    this.tabBtns.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    Object.keys(this.panels).forEach(function (name) {
      var panel = this.panels[name];
      if (panel) panel.classList.toggle('hidden', name !== tabName);
    }.bind(this));

    if (tabName === 'thumbnails' && this.engine.pdfDoc) {
      this.setupThumbnailObserver();
    }
  };

  Sidebar.prototype.onDocumentLoaded = function () {
    this.renderedThumbnails.clear();
    return Promise.all([
      this.setupThumbnails(),
      this.renderOutline(),
      this.renderBookmarks(),
    ]).then(function () {
      // Memos render is deferred until annotations are loaded
    });
  };

  Sidebar.prototype.setupThumbnails = function () {
    var self = this;
    var panel = this.panels.thumbnails;
    if (!panel) return Promise.resolve();
    panel.innerHTML = '';

    var chain = Promise.resolve();
    for (var i = 1; i <= this.engine.totalPages; i++) {
      (function (pageNum) {
        chain = chain.then(function () {
          return self.engine.pdfDoc.getPage(pageNum).then(function (page) {
            var viewport = page.getViewport({ scale: 1 });
            var thumbWidth = 140;
            var thumbHeight = (viewport.height / viewport.width) * thumbWidth;

            var item = createElement('div', 'thumbnail-item', panel);
            item.dataset.page = pageNum;
            item.addEventListener('click', function () {
              self.engine.scrollToPage(pageNum);
            });

            var canvasWrap = createElement('div', 'thumbnail-canvas-wrap', item);
            canvasWrap.style.width = thumbWidth + 'px';
            canvasWrap.style.height = thumbHeight + 'px';

            var label = createElement('span', 'thumbnail-label', item);
            label.textContent = pageNum;
          });
        });
      })(i);
    }

    return chain.then(function () {
      if (self.activeTab === 'thumbnails') {
        self.setupThumbnailObserver();
      }
      self.highlightCurrentPage(1);
    });
  };

  Sidebar.prototype.setupThumbnailObserver = function () {
    var self = this;
    if (this.thumbnailObserver) {
      this.thumbnailObserver.disconnect();
    }

    this.thumbnailObserver = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          var pageNum = parseInt(entry.target.dataset.page);
          if (entry.isIntersecting && !self.renderedThumbnails.has(pageNum)) {
            self.renderThumbnail(pageNum, entry.target);
          }
        }
      },
      {
        root: this.panels.thumbnails,
        rootMargin: '100px 0px',
        threshold: 0,
      }
    );

    var items = this.panels.thumbnails.querySelectorAll('.thumbnail-item');
    items.forEach(function (item) { self.thumbnailObserver.observe(item); });
  };

  Sidebar.prototype.renderThumbnail = function (pageNum, itemEl) {
    if (this.renderedThumbnails.has(pageNum)) return Promise.resolve();
    this.renderedThumbnails.add(pageNum);

    return this.engine.pdfDoc.getPage(pageNum).then(function (page) {
      var viewport = page.getViewport({ scale: 1 });
      var thumbWidth = 140;
      var scale = thumbWidth / viewport.width;
      var thumbViewport = page.getViewport({ scale: scale });

      var canvasWrap = itemEl.querySelector('.thumbnail-canvas-wrap');
      var canvas = createElement('canvas', 'thumbnail-canvas', canvasWrap);
      canvas.width = thumbViewport.width;
      canvas.height = thumbViewport.height;
      canvas.style.width = thumbViewport.width + 'px';
      canvas.style.height = thumbViewport.height + 'px';

      var ctx = canvas.getContext('2d');
      return page.render({ canvasContext: ctx, viewport: thumbViewport }).promise;
    }).catch(function (err) {
      console.error('Thumbnail render error for page ' + pageNum + ':', err);
    });
  };

  Sidebar.prototype.highlightCurrentPage = function (pageNum) {
    var panel = this.panels.thumbnails;
    if (!panel) return;
    panel.querySelectorAll('.thumbnail-item').forEach(function (item) {
      item.classList.toggle('active', parseInt(item.dataset.page) === pageNum);
    });
  };

  Sidebar.prototype.renderOutline = function () {
    var self = this;
    var panel = this.panels.outline;
    if (!panel) return Promise.resolve();
    panel.innerHTML = '';

    return this.engine.getOutline().then(function (outline) {
      if (!outline || outline.length === 0) {
        var empty = createElement('div', 'panel-empty', panel);
        empty.textContent = LABELS.noOutline;
        return;
      }
      var list = self.buildOutlineTree(outline);
      panel.appendChild(list);
    });
  };

  Sidebar.prototype.buildOutlineTree = function (items) {
    var self = this;
    var ul = document.createElement('ul');
    ul.className = 'outline-list';

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var li = document.createElement('li');
      li.className = 'outline-item';

      var link = document.createElement('a');
      link.className = 'outline-link';
      link.textContent = item.title;
      link.href = '#';
      (function (dest) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          self.engine.getDestinationPage(dest).then(function (pageNum) {
            if (pageNum) self.engine.scrollToPage(pageNum);
          });
        });
      })(item.dest);
      li.appendChild(link);

      if (item.items && item.items.length > 0) {
        var toggle = createElement('span', 'outline-toggle', li);
        toggle.textContent = '▸';
        var subList = this.buildOutlineTree(item.items);
        subList.classList.add('collapsed');
        li.appendChild(subList);

        (function (t, sl) {
          t.addEventListener('click', function () {
            sl.classList.toggle('collapsed');
            t.textContent = sl.classList.contains('collapsed') ? '▸' : '▾';
          });
        })(toggle, subList);
      }

      ul.appendChild(li);
    }

    return ul;
  };

  Sidebar.prototype.renderBookmarks = function () {
    var self = this;
    var panel = this.panels.bookmarks;
    if (!panel) return;
    panel.innerHTML = '';

    var docKey = this.getDocKey();
    if (!docKey) {
      var empty = createElement('div', 'panel-empty', panel);
      empty.textContent = LABELS.noBookmarks;
      return;
    }

    var bookmarks = this.storage ? this.storage.loadBookmarks(docKey) : [];

    var addBtn = createElement('button', 'bookmark-add-btn', panel);
    addBtn.textContent = '+ ' + LABELS.addBookmark;
    addBtn.addEventListener('click', function () { self.addBookmark(); });

    if (bookmarks.length === 0) {
      var empty2 = createElement('div', 'panel-empty', panel);
      empty2.textContent = LABELS.noBookmarks;
      return;
    }

    var list = createElement('ul', 'bookmark-list', panel);
    for (var i = 0; i < bookmarks.length; i++) {
      (function (bm) {
        var li = createElement('li', 'bookmark-item', list);

        var link = createElement('a', 'bookmark-link', li);
        link.href = '#';
        link.textContent = bm.label || bm.pageNum + ' ' + LABELS.pageSuffix;
        link.addEventListener('click', function (e) {
          e.preventDefault();
          self.engine.scrollToPage(bm.pageNum);
        });

        var delBtn = createElement('button', 'bookmark-delete', li);
        delBtn.textContent = '×';
        delBtn.title = LABELS.delete;
        delBtn.addEventListener('click', function () {
          self.removeBookmark(bm.id);
        });
      })(bookmarks[i]);
    }
  };

  Sidebar.prototype.addBookmark = function () {
    if (!this.engine.pdfDoc || !this.storage) return;
    var docKey = this.getDocKey();
    if (!docKey) return;

    var pageNum = this.engine.getCurrentVisiblePage();
    var label = prompt(LABELS.bookmarkLabel, pageNum + ' ' + LABELS.pageSuffix);
    if (label === null) return;

    var bookmarks = this.storage.loadBookmarks(docKey);
    bookmarks.push({
      id: 'b_' + Date.now(),
      pageNum: pageNum,
      label: label || pageNum + ' ' + LABELS.pageSuffix,
      createdAt: Date.now(),
    });
    this.storage.saveBookmarks(docKey, bookmarks);
    this.renderBookmarks();
  };

  Sidebar.prototype.removeBookmark = function (id) {
    var docKey = this.getDocKey();
    if (!docKey || !this.storage) return;
    var bookmarks = this.storage.loadBookmarks(docKey);
    bookmarks = bookmarks.filter(function (b) { return b.id !== id; });
    this.storage.saveBookmarks(docKey, bookmarks);
    this.renderBookmarks();
  };

  Sidebar.prototype.getDocKey = function () {
    if (!this.engine.pdfDoc) return null;
    return this.engine.pdfDoc.fingerprints[0];
  };

  Sidebar.prototype.renderMemos = function () {
    var self = this;
    var panel = this.panels.memos;
    if (!panel) return;
    panel.innerHTML = '';

    var am = this.annotations;
    if (!am || !am.memos || am.memos.length === 0) {
      var empty = createElement('div', 'panel-empty', panel);
      empty.textContent = LABELS.noMemos;
      return;
    }

    // Sort: page number ascending, then top position ascending
    var sorted = am.memos.slice().sort(function (a, b) {
      if (a.pageNum !== b.pageNum) return a.pageNum - b.pageNum;
      var aTop = a.rect ? a.rect.top : (a.y || 0);
      var bTop = b.rect ? b.rect.top : (b.y || 0);
      return aTop - bTop;
    });

    var list = createElement('ul', 'memo-list', panel);
    for (var i = 0; i < sorted.length; i++) {
      (function (memo) {
        var li = createElement('li', 'memo-list-item', list);

        // Color indicator
        var colorDot = createElement('div', 'memo-list-color', li);
        var baseColor = HIGHLIGHT_COLORS[memo.color] || HIGHLIGHT_COLORS.yellow;
        if (isOutlineColor(memo.color)) {
          colorDot.classList.add('outline-type');
          colorDot.style.borderColor = baseColor;
        } else {
          colorDot.style.background = baseColor.replace('0.4', '0.8');
        }

        // Body (page + text preview)
        var body = createElement('div', 'memo-list-body', li);
        var pageLine = createElement('div', 'memo-list-page', body);
        pageLine.textContent = memo.pageNum + ' ' + LABELS.pageSuffix;
        var textLine = createElement('div', 'memo-list-text', body);
        if (memo.text) {
          textLine.textContent = memo.text;
        } else {
          textLine.textContent = '메모를 입력하세요...';
          textLine.classList.add('empty');
        }

        // Click → navigate and open popover
        li.addEventListener('click', function () {
          self.engine.scrollToPage(memo.pageNum);
          setTimeout(function () {
            self.openMemoById(memo.id);
          }, 350);
        });

        // Delete button
        var delBtn = createElement('button', 'memo-list-delete', li);
        delBtn.textContent = '×';
        delBtn.title = LABELS.delete;
        delBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          am.removeAreaMemo(memo.id);
        });
      })(sorted[i]);
    }
  };

  // ---- Capture panel ----
  Sidebar.prototype.renderCapturePanel = function () {
    var self = this;
    var panel = this.panels.capture;
    if (!panel) return;
    panel.innerHTML = '';

    var iframeContainer = document.getElementById('url-iframe-container');
    if (iframeContainer) {
      var captureBtn = createElement('button', 'capture-webpage-btn', panel);
      captureBtn.textContent = '\uC6F9\uD398\uC774\uC9C0 \uCEA1\uCCD0';
      captureBtn.addEventListener('click', function () {
        self.engine.emit('captureWebpage');
      });
    }

    // Show captured pages list
    if (this.app && this.app.capturedPages && this.app.capturedPages.length > 0) {
      var countLabel = createElement('div', 'capture-count', panel);
      countLabel.textContent = '\uCEA1\uCCD0 ' + this.app.capturedPages.length + '\uD398\uC774\uC9C0';
      this.app.capturedPages.forEach(function (canvas, idx) {
        var item = createElement('div', 'capture-thumbnail-item', panel);
        var thumbCanvas = createElement('canvas', 'capture-thumbnail', item);
        var thumbWidth = 140;
        var ratio = canvas.height / canvas.width;
        var thumbHeight = Math.round(thumbWidth * ratio);
        thumbCanvas.width = thumbWidth;
        thumbCanvas.height = thumbHeight;
        thumbCanvas.style.width = thumbWidth + 'px';
        thumbCanvas.style.height = thumbHeight + 'px';
        var ctx = thumbCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0, thumbWidth, thumbHeight);
        var label = createElement('span', 'capture-thumbnail-label', item);
        label.textContent = (idx + 1) + '';
      });
    } else if (!iframeContainer) {
      var empty = createElement('div', 'panel-empty', panel);
      empty.textContent = '\uCEA1\uCCD0\uB41C \uD398\uC774\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4';
    }
  };

  // ---- Emoji panel ----
  Sidebar.prototype.renderEmojiPanel = function () {
    var self = this;
    var panel = this.panels.emoji;
    if (!panel) return;
    if (panel.querySelector('.emoji-grid')) return; // already rendered
    panel.innerHTML = '';

    var emojis = [
      '\uD83D\uDE00', '\uD83D\uDE02', '\uD83D\uDE0D', '\uD83E\uDD70', '\uD83D\uDE0E', '\uD83E\uDD14', '\uD83D\uDE22', '\uD83D\uDE21',
      '\uD83D\uDC4D', '\uD83D\uDC4E', '\uD83D\uDC4F', '\u2764\uFE0F', '\u2B50', '\uD83D\uDD25', '\u2705', '\u274C',
      '\u26A0\uFE0F', '\uD83D\uDCA1', '\uD83D\uDCCC', '\uD83D\uDCCE', '\uD83C\uDFAF', '\uD83C\uDFC6', '\uD83C\uDF89', '\uD83D\uDCAC',
      '\u2753', '\u2757', '\u27A1\uFE0F', '\u2B05\uFE0F', '\u2B06\uFE0F', '\u2B07\uFE0F', '\uD83D\uDD34', '\uD83D\uDFE2',
      '\uD83D\uDFE1', '\uD83D\uDD35', '\u26AB', '\u26AA', '\uD83D\uDFE4', '\uD83D\uDFE0', '\uD83D\uDFE3', '\uD83D\uDC9C',
    ];

    var grid = createElement('div', 'emoji-grid', panel);
    emojis.forEach(function (emoji) {
      var btn = createElement('button', 'emoji-grid-btn', grid);
      btn.textContent = emoji;
      btn.title = emoji;
      btn.addEventListener('click', function () {
        self.engine.emit('placeEmoji', { emoji: emoji });
      });
    });
  };

  // ---- Sidebar resize handle ----
  Sidebar.prototype.setupResizeHandle = function () {
    var self = this;
    var handle = this.sidebarEl.querySelector('.sidebar-resize-handle');
    if (!handle) return;

    var isDragging = false;
    var startX = 0;
    var startWidth = 0;

    handle.addEventListener('mousedown', function (e) {
      e.preventDefault();
      isDragging = true;
      startX = e.clientX;
      startWidth = self.sidebarEl.offsetWidth;
      handle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      var diff = e.clientX - startX;
      var newWidth = Math.max(120, Math.min(500, startWidth + diff));
      document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
    });

    document.addEventListener('mouseup', function () {
      if (!isDragging) return;
      isDragging = false;
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Save to localStorage
      var currentWidth = self.sidebarEl.offsetWidth;
      localStorage.setItem('pdfviewer_sidebarWidth', currentWidth);
    });

    // Restore saved width
    var savedWidth = localStorage.getItem('pdfviewer_sidebarWidth');
    if (savedWidth) {
      document.documentElement.style.setProperty('--sidebar-width', savedWidth + 'px');
    }
  };

  // ---- Decorations panel (꾸밈) ----
  Sidebar.prototype.renderDecorations = function () {
    var self = this;
    var panel = this.panels.decorations;
    if (!panel) return;
    panel.innerHTML = '';

    var am = this.annotations;
    if (!am) return;

    var hasItems = (am.boxes && am.boxes.length > 0) || (am.underlines && am.underlines.length > 0);

    // Clear all button
    var clearAllBtn = createElement('button', 'deco-clear-all-btn', panel);
    clearAllBtn.textContent = '전체 삭제 (메모+상자+밑줄)';
    clearAllBtn.addEventListener('click', function () {
      if (!confirm('모든 메모, 상자, 밑줄을 삭제하시겠습니까?')) return;
      am.memos = [];
      am.boxes = [];
      am.underlines = [];
      am.highlights = [];
      am.save();
      // Re-render all visible pages
      var wrappers = am.engine.viewerContainer.querySelectorAll('.page-wrapper');
      wrappers.forEach(function (w) {
        var annotLayer = w.querySelector('.custom-annotations');
        if (annotLayer) annotLayer.innerHTML = '';
      });
    });

    if (!hasItems) {
      var empty = createElement('div', 'panel-empty', panel);
      empty.textContent = '꾸밈 항목이 없습니다';
      return;
    }

    // Combine boxes and underlines, sort by createdAt
    var items = [];
    if (am.boxes) {
      am.boxes.forEach(function (b) { items.push({ type: 'box', data: b }); });
    }
    if (am.underlines) {
      am.underlines.forEach(function (u) { items.push({ type: 'underline', data: u }); });
    }
    items.sort(function (a, b) { return a.data.createdAt - b.data.createdAt; });

    var list = createElement('ul', 'deco-list', panel);
    var decoSelectedIds = new Set();

    // Drag selection state for list
    var isDragSelecting = false;

    items.forEach(function (item) {
      var li = createElement('li', 'deco-list-item', list);
      li.dataset.decoId = item.data.id;
      li.dataset.decoType = item.type;

      // Color preview
      var colorPreview = createElement('div', 'deco-list-color', li);
      if (item.type === 'box') {
        var fillColor = item.data.fillColor;
        var borderColor = item.data.borderColor;
        var fillOpacity = item.data.fillOpacity !== undefined ? item.data.fillOpacity : 0.4;
        var borderOpacity = item.data.borderOpacity !== undefined ? item.data.borderOpacity : 0.9;
        if (fillColor !== 'none') {
          colorPreview.style.background = colorWithOpacity(fillColor, fillOpacity) || BOX_COLORS[fillColor] || 'transparent';
        }
        if (borderColor !== 'none') {
          colorPreview.style.border = '2px solid ' + (colorWithOpacity(borderColor, borderOpacity) || BOX_BORDER_COLORS[borderColor] || 'transparent');
        }
      } else {
        colorPreview.classList.add('underline-type');
        colorPreview.style.background = UNDERLINE_COLORS[item.data.color] || UNDERLINE_COLORS.red;
      }

      // Info
      var info = createElement('div', 'deco-list-info', li);
      var pageTxt = createElement('span', 'deco-list-page', info);
      pageTxt.textContent = item.data.pageNum + '페이지';
      var typeTxt = document.createTextNode(' · ' + (item.type === 'box' ? '상자' : (item.data.type === 'straight' ? '직선' : '자유선')));
      info.appendChild(typeTxt);

      // Click → navigate + select annotation on page
      li.addEventListener('click', function (e) {
        if (e.target.classList.contains('deco-list-delete')) return;
        var id = item.data.id;
        // Ctrl+click = multi-select
        if (!e.ctrlKey && !e.metaKey) {
          decoSelectedIds.clear();
          list.querySelectorAll('.deco-list-item').forEach(function (el) { el.classList.remove('selected'); });
        }
        if (decoSelectedIds.has(id)) {
          decoSelectedIds.delete(id);
          li.classList.remove('selected');
        } else {
          decoSelectedIds.add(id);
          li.classList.add('selected');
        }
        // Navigate to page and select on viewer
        self.engine.scrollToPage(item.data.pageNum);
        if (am.selectAnnotation) {
          setTimeout(function () { am.selectAnnotation(id, e.ctrlKey || e.metaKey); }, 300);
        }
      });

      // Drag select on list
      li.addEventListener('mousedown', function (e) {
        if (e.button !== 0 || e.ctrlKey || e.metaKey) return;
        isDragSelecting = true;
      });
      li.addEventListener('mouseenter', function () {
        if (!isDragSelecting) return;
        decoSelectedIds.add(item.data.id);
        li.classList.add('selected');
      });

      // Delete button
      var delBtn = createElement('button', 'deco-list-delete', li);
      delBtn.textContent = '×';
      delBtn.title = '삭제';
      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (item.type === 'box') {
          am.removeBox(item.data.id);
        } else {
          am.removeUnderline(item.data.id);
        }
      });
    });

    // End drag select
    document.addEventListener('mouseup', function () { isDragSelecting = false; });

    // Del key for list selection
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        decoSelectedIds.forEach(function (id) {
          var found = items.find(function (it) { return it.data.id === id; });
          if (found) {
            if (found.type === 'box') am.removeBox(id);
            else am.removeUnderline(id);
          }
        });
        decoSelectedIds.clear();
      }
    });
    panel.tabIndex = 0; // Make focusable for keydown
  };

  Sidebar.prototype.openMemoById = function (id) {
    // Close all popovers first
    var allPopovers = this.engine.viewerContainer.querySelectorAll('.area-memo-popover');
    allPopovers.forEach(function (p) { p.classList.add('hidden'); });

    var group = this.engine.viewerContainer.querySelector('[data-memo-id="' + id + '"]');
    if (!group) return;

    var popover = group.querySelector('.area-memo-popover');
    if (popover) {
      popover.classList.remove('hidden');
      var textarea = popover.querySelector('textarea');
      if (textarea) textarea.focus();
    }
  };

  // ==================== search.js ====================
  function SearchController(pdfEngine) {
    this.engine = pdfEngine;
    this.textCache = new Map();
    this.matches = [];
    this.currentMatchIdx = -1;
    this.query = '';
    this.highlightElements = [];
  }

  SearchController.prototype.init = function () {
    var self = this;
    this.searchInput = $('#search-input');
    this.searchCount = $('#search-count');
    this.searchPrev = $('#search-prev');
    this.searchNext = $('#search-next');

    this.searchInput.addEventListener('input', function () {
      self.search(self.searchInput.value);
    });

    this.searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        if (e.shiftKey) { self.prevMatch(); } else { self.nextMatch(); }
      }
      if (e.key === 'Escape') {
        self.engine.emit('searchClear');
      }
    });

    this.searchPrev.addEventListener('click', function () { self.prevMatch(); });
    this.searchNext.addEventListener('click', function () { self.nextMatch(); });

    this.engine.addEventListener('searchClear', function () {
      self.clearHighlights();
      self.matches = [];
      self.currentMatchIdx = -1;
      self.query = '';
      self.searchCount.textContent = '';
    });

    this.engine.addEventListener('documentLoaded', function () {
      self.textCache.clear();
      self.clearHighlights();
      self.matches = [];
      self.currentMatchIdx = -1;
    });

    this.engine.addEventListener('pageRendered', function (e) {
      if (self.query && self.matches.length > 0) {
        self.highlightMatchesOnPage(e.detail.pageNum);
      }
    });
  };

  SearchController.prototype.search = function (query) {
    var self = this;
    this.clearHighlights();
    this.matches = [];
    this.currentMatchIdx = -1;
    this.query = query;

    if (!query || query.length === 0) {
      this.searchCount.textContent = '';
      return Promise.resolve();
    }

    var lowerQuery = query.toLowerCase();

    var chain = Promise.resolve();
    for (var p = 1; p <= this.engine.totalPages; p++) {
      (function (pageNum) {
        chain = chain.then(function () {
          if (!self.textCache.has(pageNum)) {
            return self.engine.getPageText(pageNum).then(function (text) {
              self.textCache.set(pageNum, text);
            }).catch(function () {
              self.textCache.set(pageNum, '');
            });
          }
        }).then(function () {
          var text = self.textCache.get(pageNum).toLowerCase();
          var idx = 0;
          while ((idx = text.indexOf(lowerQuery, idx)) !== -1) {
            self.matches.push({ pageNum: pageNum, index: idx, length: query.length });
            idx += 1;
          }
        });
      })(p);
    }

    return chain.then(function () {
      if (self.matches.length > 0) {
        self.currentMatchIdx = 0;
        self.updateCount();
        self.goToCurrentMatch();
      } else {
        self.searchCount.textContent = '결과 없음';
      }

      for (var p = 1; p <= self.engine.totalPages; p++) {
        if (self.engine.renderedPages.get(p) === 'rendered') {
          self.highlightMatchesOnPage(p);
        }
      }
    });
  };

  SearchController.prototype.highlightMatchesOnPage = function (pageNum) {
    if (!this.query) return;

    var wrapper = this.engine.viewerContainer.querySelector(
      '.page-wrapper[data-page="' + pageNum + '"]'
    );
    if (!wrapper) return;

    var textLayer = wrapper.querySelector('.textLayer');
    if (!textLayer) return;

    textLayer.querySelectorAll('.search-highlight').forEach(function (el) { el.remove(); });

    var spans = textLayer.querySelectorAll('span[role="presentation"], span:not([class])');
    if (spans.length === 0) return;

    var pageMatches = this.matches.filter(function (m) { return m.pageNum === pageNum; });
    if (pageMatches.length === 0) return;

    var runningText = '';
    var spanRanges = [];
    for (var i = 0; i < spans.length; i++) {
      var span = spans[i];
      var start = runningText.length;
      runningText += span.textContent;
      spanRanges.push({ start: start, end: runningText.length, span: span });
    }

    var lowerRunning = runningText.toLowerCase();
    var lowerQuery = this.query.toLowerCase();
    var searchIdx = 0;
    while (true) {
      var matchIdx = lowerRunning.indexOf(lowerQuery, searchIdx);
      if (matchIdx === -1) break;

      var matchEnd = matchIdx + this.query.length;

      for (var j = 0; j < spanRanges.length; j++) {
        var sr = spanRanges[j];
        if (sr.start >= matchEnd || sr.end <= matchIdx) continue;

        var spanRect = sr.span.getBoundingClientRect();
        var wrapperRect = wrapper.getBoundingClientRect();

        var highlight = createElement('div', 'search-highlight');
        highlight.style.position = 'absolute';
        highlight.style.left = (spanRect.left - wrapperRect.left) + 'px';
        highlight.style.top = (spanRect.top - wrapperRect.top) + 'px';
        highlight.style.width = spanRect.width + 'px';
        highlight.style.height = spanRect.height + 'px';
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
  };

  SearchController.prototype.clearHighlights = function () {
    this.highlightElements.forEach(function (el) { el.remove(); });
    this.highlightElements = [];
    if (this.engine.viewerContainer) {
      this.engine.viewerContainer.querySelectorAll('.search-highlight').forEach(function (el) { el.remove(); });
    }
  };

  SearchController.prototype.nextMatch = function () {
    if (this.matches.length === 0) return;
    this.currentMatchIdx = (this.currentMatchIdx + 1) % this.matches.length;
    this.updateCount();
    this.goToCurrentMatch();
  };

  SearchController.prototype.prevMatch = function () {
    if (this.matches.length === 0) return;
    this.currentMatchIdx = (this.currentMatchIdx - 1 + this.matches.length) % this.matches.length;
    this.updateCount();
    this.goToCurrentMatch();
  };

  SearchController.prototype.goToCurrentMatch = function () {
    var match = this.matches[this.currentMatchIdx];
    if (!match) return;
    this.engine.scrollToPage(match.pageNum);
  };

  SearchController.prototype.updateCount = function () {
    if (this.matches.length === 0) {
      this.searchCount.textContent = '결과 없음';
    } else {
      this.searchCount.textContent = (this.currentMatchIdx + 1) + ' / ' + this.matches.length + ' 일치';
    }
  };

  // ==================== annotations.js ====================
  function AnnotationManager(pdfEngine, storage) {
    this.engine = pdfEngine;
    this.storage = storage;
    this.highlights = [];
    this.memos = [];
    this.boxes = [];
    this.underlines = [];
    this.activeHighlightToolbar = null;
    this.docKey = null;
    // Area memo drawing state
    this.selectedMemoColor = 'yellow';
    this.isDrawingArea = false;
    this.drawStartPos = null;
    this.drawOverlayEl = null;
    this.drawPageWrapper = null;
    // Drawing tool state
    this.activeDrawTool = 'none'; // 'none' | 'box' | 'underline-straight' | 'underline-freehand'
    // Left-click drag state (for box/underline)
    this.isLeftDrawing = false;
    this.leftDrawStartPos = null;
    this.leftDrawOverlayEl = null;
    this.leftDrawPageWrapper = null;
    // Box settings
    this.boxFillColor = 'none';
    this.boxBorderColor = 'blue';
    this.boxFillOpacity = 0.4;
    this.boxBorderOpacity = 0.9;
    // Underline settings
    this.underlineColor = 'red';
    this.underlineWidth = 2;
    this.freehandPoints = [];
    this.freehandSvgPath = null;
    // Emoji annotations
    this.emojis = [];
    this.emojiDragState = null;
    // Selection state
    this.selectedAnnotations = new Set();
    // Selection drag state
    this.isSelectionDragging = false;
    this.selectionStartPos = null;
    this.selectionRectEl = null;
    this.selectionPageWrapper = null;
  }

  AnnotationManager.prototype.setupListeners = function () {
    var self = this;
    if (!this.engine.viewerContainer) return;

    // Text highlight on selection (only when no draw tool active)
    this.engine.viewerContainer.addEventListener('mouseup', function (e) {
      if (e.button === 0 && self.activeDrawTool === 'none') self.handleSelectionEnd(e);
    });

    // Prevent context menu on page (we use right-click for area memo)
    this.engine.viewerContainer.addEventListener('contextmenu', function (e) {
      var pw = e.target.closest('.page-wrapper');
      if (pw) e.preventDefault();
    });

    // Right-click drag for area memos
    this.engine.viewerContainer.addEventListener('mousedown', function (e) {
      if (e.button === 2) self.handleRightMouseDown(e);
    });
    document.addEventListener('mousemove', function (e) {
      if (self.isDrawingArea) self.handleMouseMove(e);
      if (self.isLeftDrawing) self.handleLeftMouseMove(e);
    });
    document.addEventListener('mouseup', function (e) {
      if (e.button === 2 && self.isDrawingArea) self.handleRightMouseUp(e);
      if (e.button === 0 && self.isLeftDrawing) self.handleLeftMouseUp(e);
    });

    // Left-click drag for box/underline tools
    this.engine.viewerContainer.addEventListener('mousedown', function (e) {
      if (e.button === 0 && self.activeDrawTool !== 'none') self.handleLeftMouseDown(e);
    });

    // Listen for color changes from toolbar
    this.engine.addEventListener('memoColorChanged', function (e) {
      self.selectedMemoColor = e.detail.color;
    });

    // Listen for draw tool changes
    this.engine.addEventListener('setDrawTool', function (e) {
      self.setActiveDrawTool(e.detail.tool);
    });

    // Listen for box color changes (supports named colors and hex values)
    this.engine.addEventListener('boxColorChanged', function (e) {
      if (e.detail.type === 'fill') self.boxFillColor = e.detail.color;
      if (e.detail.type === 'border') self.boxBorderColor = e.detail.color;
    });

    // Listen for underline color/width changes
    this.engine.addEventListener('underlineColorChanged', function (e) {
      self.underlineColor = e.detail.color;
    });
    this.engine.addEventListener('underlineWidthChanged', function (e) {
      self.underlineWidth = e.detail.width;
    });

    // Listen for opacity changes
    this.engine.addEventListener('boxOpacityChanged', function (e) {
      if (e.detail.type === 'fill') self.boxFillOpacity = e.detail.opacity;
      if (e.detail.type === 'border') self.boxBorderOpacity = e.detail.opacity;
    });

    // Selection: left-click when tool is 'none' → click select or drag select
    this.engine.viewerContainer.addEventListener('mousedown', function (e) {
      if (e.button !== 0 || self.activeDrawTool !== 'none') return;
      // Check if clicking on an annotation
      var annotEl = e.target.closest('.box-annotation, .area-memo-group, .highlight-group');
      var svgEl = e.target.closest('line[data-underline-id], path[data-underline-id]');
      if (annotEl || svgEl) {
        // Click select
        var id = null;
        if (annotEl) {
          id = annotEl.dataset.boxId || annotEl.dataset.memoId || annotEl.dataset.highlightId;
        }
        if (svgEl) {
          id = svgEl.dataset.underlineId;
        }
        if (id) {
          e.stopPropagation();
          self.selectAnnotation(id, e.ctrlKey || e.metaKey);
        }
        return;
      }
      // If clicking empty area on page, start drag selection
      var pageWrapper = e.target.closest('.page-wrapper');
      if (pageWrapper && !e.target.closest('.textLayer')) {
        // Only start drag select if not on text layer
        self.startSelectionDrag(e, pageWrapper);
      } else if (!e.target.closest('#sidebar') && !e.target.closest('#toolbar')) {
        // Click empty → clear selection
        self.clearSelection();
      }
    });

    // Selection drag tracking
    document.addEventListener('mousemove', function (e) {
      if (self.isSelectionDragging) self.handleSelectionDragMove(e);
    });
    document.addEventListener('mouseup', function (e) {
      if (e.button === 0 && self.isSelectionDragging) self.handleSelectionDragEnd(e);
    });

    // Render saved annotations when pages are rendered
    this.engine.addEventListener('pageRendered', function (e) {
      self.renderAnnotationsForPage(e.detail.pageNum);
    });
  };

  AnnotationManager.prototype.setActiveDrawTool = function (tool) {
    this.activeDrawTool = tool;
    this.engine._activeDrawTool = tool;
    this.engine.emit('drawToolChanged', { tool: tool });
    // Update cursor
    var vc = this.engine.viewerContainer;
    if (tool !== 'none') {
      vc.style.cursor = 'crosshair';
    } else {
      vc.style.cursor = '';
    }
  };

  // ---- Selection methods ----

  AnnotationManager.prototype.selectAnnotation = function (id, multi) {
    if (!multi) {
      this.clearSelection();
    }
    if (this.selectedAnnotations.has(id)) {
      this.selectedAnnotations.delete(id);
      this.updateSelectionVisual(id, false);
    } else {
      this.selectedAnnotations.add(id);
      this.updateSelectionVisual(id, true);
    }
    this.engine.emit('selectionChanged', { count: this.selectedAnnotations.size });
  };

  AnnotationManager.prototype.clearSelection = function () {
    var self = this;
    this.selectedAnnotations.forEach(function (id) {
      self.updateSelectionVisual(id, false);
    });
    this.selectedAnnotations.clear();
    this.engine.emit('selectionChanged', { count: 0 });
  };

  AnnotationManager.prototype.updateSelectionVisual = function (id, selected) {
    var vc = this.engine.viewerContainer;
    // Box
    var boxEl = vc.querySelector('[data-box-id="' + id + '"]');
    if (boxEl) { boxEl.classList.toggle('annotation-selected', selected); return; }
    // Memo
    var memoEl = vc.querySelector('[data-memo-id="' + id + '"]');
    if (memoEl) { memoEl.classList.toggle('annotation-selected', selected); return; }
    // Highlight
    var hlEl = vc.querySelector('[data-highlight-id="' + id + '"]');
    if (hlEl) { hlEl.classList.toggle('annotation-selected', selected); return; }
    // Underline (SVG)
    var ulEl = vc.querySelector('[data-underline-id="' + id + '"]');
    if (ulEl) { ulEl.classList.toggle('annotation-selected', selected); return; }
    // Emoji
    var emojiEl = vc.querySelector('[data-emoji-id="' + id + '"]');
    if (emojiEl) { emojiEl.classList.toggle('annotation-selected', selected); return; }
  };

  // ---- Emoji annotations ----
  AnnotationManager.prototype.addEmoji = function (emoji) {
    var pageNum = this.engine.currentPage || 1;
    var pw = document.querySelector('.page-wrapper[data-page="' + pageNum + '"]');
    if (!pw) return;

    var emojiObj = {
      id: 'emoji_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      pageNum: pageNum,
      emoji: emoji,
      x: 0.4,
      y: 0.4,
      size: 0.08,
      rotation: 0,
      createdAt: Date.now()
    };
    this.emojis.push(emojiObj);
    this.renderEmojiOnPage(emojiObj, pw);
    this.saveEmojis();
    showToast(emoji + ' 배치됨');
  };

  AnnotationManager.prototype.renderEmojiOnPage = function (emojiObj, pw) {
    var self = this;
    var annotLayer = pw.querySelector('.custom-annotations');
    if (!annotLayer) return;

    var el = document.createElement('div');
    el.className = 'emoji-annotation';
    el.setAttribute('data-emoji-id', emojiObj.id);
    el.style.left = (emojiObj.x * 100) + '%';
    el.style.top = (emojiObj.y * 100) + '%';
    el.style.fontSize = (emojiObj.size * pw.offsetWidth) + 'px';
    el.style.transform = 'rotate(' + (emojiObj.rotation || 0) + 'deg)';
    el.textContent = emojiObj.emoji;

    // Resize handles (4 corners)
    var corners = ['nw', 'ne', 'sw', 'se'];
    corners.forEach(function (pos) {
      var handle = document.createElement('div');
      handle.className = 'emoji-resize-handle emoji-handle-' + pos;
      handle.setAttribute('data-handle', pos);
      el.appendChild(handle);
    });

    // Rotate handle (top center)
    var rotHandle = document.createElement('div');
    rotHandle.className = 'emoji-rotate-handle';
    el.appendChild(rotHandle);

    // Drag interaction
    el.addEventListener('mousedown', function (e) {
      if (e.target.classList.contains('emoji-resize-handle') || e.target.classList.contains('emoji-rotate-handle')) return;
      e.preventDefault();
      e.stopPropagation();

      // Selection
      if (e.ctrlKey || e.metaKey) {
        self.selectAnnotation(emojiObj.id, true);
      } else {
        self.selectAnnotation(emojiObj.id, false);
      }

      var rect = pw.getBoundingClientRect();
      var startX = e.clientX;
      var startY = e.clientY;
      var origX = emojiObj.x;
      var origY = emojiObj.y;

      function onMove(ev) {
        var dx = (ev.clientX - startX) / rect.width;
        var dy = (ev.clientY - startY) / rect.height;
        emojiObj.x = Math.max(0, Math.min(1, origX + dx));
        emojiObj.y = Math.max(0, Math.min(1, origY + dy));
        el.style.left = (emojiObj.x * 100) + '%';
        el.style.top = (emojiObj.y * 100) + '%';
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        self.saveEmojis();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // Resize interaction
    el.querySelectorAll('.emoji-resize-handle').forEach(function (handle) {
      handle.addEventListener('mousedown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var startX = e.clientX;
        var origSize = emojiObj.size;

        function onMove(ev) {
          var dx = (ev.clientX - startX) / pw.offsetWidth;
          var pos = handle.getAttribute('data-handle');
          var delta = (pos === 'nw' || pos === 'sw') ? -dx : dx;
          emojiObj.size = Math.max(0.02, Math.min(0.3, origSize + delta));
          el.style.fontSize = (emojiObj.size * pw.offsetWidth) + 'px';
        }
        function onUp() {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          self.saveEmojis();
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });

    // Rotate interaction
    var rotateHandle = el.querySelector('.emoji-rotate-handle');
    if (rotateHandle) {
      rotateHandle.addEventListener('mousedown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var elRect = el.getBoundingClientRect();
        var cx = elRect.left + elRect.width / 2;
        var cy = elRect.top + elRect.height / 2;

        function onMove(ev) {
          var angle = Math.atan2(ev.clientX - cx, -(ev.clientY - cy)) * (180 / Math.PI);
          emojiObj.rotation = Math.round(angle);
          el.style.transform = 'rotate(' + emojiObj.rotation + 'deg)';
        }
        function onUp() {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          self.saveEmojis();
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }

    // Right-click to remove
    el.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (confirm(emojiObj.emoji + ' 삭제?')) {
        self.removeEmoji(emojiObj.id);
      }
    });

    annotLayer.appendChild(el);
  };

  AnnotationManager.prototype.removeEmoji = function (id) {
    this.emojis = this.emojis.filter(function (em) { return em.id !== id; });
    var el = document.querySelector('[data-emoji-id="' + id + '"]');
    if (el) el.remove();
    this.saveEmojis();
  };

  AnnotationManager.prototype.renderAllEmojis = function () {
    var self = this;
    this.emojis.forEach(function (emojiObj) {
      var pw = document.querySelector('.page-wrapper[data-page="' + emojiObj.pageNum + '"]');
      if (pw) self.renderEmojiOnPage(emojiObj, pw);
    });
  };

  AnnotationManager.prototype.saveEmojis = function () {
    if (!this.docKey) return;
    this.storage.saveEmojis(this.docKey, this.emojis);
  };

  AnnotationManager.prototype.deleteSelected = function () {
    var self = this;
    var ids = Array.from(this.selectedAnnotations);
    if (ids.length === 0) return;

    ids.forEach(function (id) {
      // Try each type
      var boxIdx = self.boxes.findIndex(function (b) { return b.id === id; });
      if (boxIdx !== -1) { self.removeBox(id); return; }
      var ulIdx = self.underlines.findIndex(function (u) { return u.id === id; });
      if (ulIdx !== -1) { self.removeUnderline(id); return; }
      var memoIdx = self.memos.findIndex(function (m) { return m.id === id; });
      if (memoIdx !== -1) { self.removeAreaMemo(id); return; }
      var hlIdx = self.highlights.findIndex(function (h) { return h.id === id; });
      if (hlIdx !== -1) { self.removeHighlight(id); return; }
      // Emoji
      var emojiIdx = self.emojis.findIndex(function (em) { return em.id === id; });
      if (emojiIdx !== -1) { self.removeEmoji(id); return; }
    });
    this.selectedAnnotations.clear();
    this.engine.emit('selectionChanged', { count: 0 });
  };

  AnnotationManager.prototype.startSelectionDrag = function (e, pageWrapper) {
    var wrapperRect = pageWrapper.getBoundingClientRect();
    this.isSelectionDragging = true;
    this.selectionPageWrapper = pageWrapper;
    this.selectionStartPos = {
      x: e.clientX - wrapperRect.left,
      y: e.clientY - wrapperRect.top,
    };
    // Create selection rect
    var annotLayer = pageWrapper.querySelector('.custom-annotations');
    if (!annotLayer) { this.isSelectionDragging = false; return; }
    this.selectionRectEl = createElement('div', 'selection-rect', annotLayer);
    this.selectionRectEl.style.left = this.selectionStartPos.x + 'px';
    this.selectionRectEl.style.top = this.selectionStartPos.y + 'px';
    this.selectionRectEl.style.width = '0px';
    this.selectionRectEl.style.height = '0px';
  };

  AnnotationManager.prototype.handleSelectionDragMove = function (e) {
    if (!this.selectionRectEl || !this.selectionPageWrapper) return;
    var wrapperRect = this.selectionPageWrapper.getBoundingClientRect();
    var curX = Math.max(0, Math.min(e.clientX - wrapperRect.left, wrapperRect.width));
    var curY = Math.max(0, Math.min(e.clientY - wrapperRect.top, wrapperRect.height));
    var sx = this.selectionStartPos.x;
    var sy = this.selectionStartPos.y;
    this.selectionRectEl.style.left = Math.min(sx, curX) + 'px';
    this.selectionRectEl.style.top = Math.min(sy, curY) + 'px';
    this.selectionRectEl.style.width = Math.abs(curX - sx) + 'px';
    this.selectionRectEl.style.height = Math.abs(curY - sy) + 'px';
  };

  AnnotationManager.prototype.handleSelectionDragEnd = function (e) {
    if (!this.selectionRectEl || !this.selectionPageWrapper) {
      this.isSelectionDragging = false;
      return;
    }
    var wrapperRect = this.selectionPageWrapper.getBoundingClientRect();
    var curX = Math.max(0, Math.min(e.clientX - wrapperRect.left, wrapperRect.width));
    var curY = Math.max(0, Math.min(e.clientY - wrapperRect.top, wrapperRect.height));
    var sx = this.selectionStartPos.x;
    var sy = this.selectionStartPos.y;
    var selLeft = Math.min(sx, curX);
    var selTop = Math.min(sy, curY);
    var selWidth = Math.abs(curX - sx);
    var selHeight = Math.abs(curY - sy);

    this.selectionRectEl.remove();
    this.selectionRectEl = null;
    this.isSelectionDragging = false;

    // If too small, treat as click on empty → clear selection
    if (selWidth < 5 && selHeight < 5) {
      this.clearSelection();
      this.selectionPageWrapper = null;
      return;
    }

    // Normalize to 0-1
    var selRect = {
      left: selLeft / wrapperRect.width,
      top: selTop / wrapperRect.height,
      right: (selLeft + selWidth) / wrapperRect.width,
      bottom: (selTop + selHeight) / wrapperRect.height,
    };

    var pageNum = parseInt(this.selectionPageWrapper.dataset.page);
    if (!(e.ctrlKey || e.metaKey)) {
      this.clearSelection();
    }
    this.selectAnnotationsInRect(pageNum, selRect);
    this.selectionPageWrapper = null;
  };

  AnnotationManager.prototype.selectAnnotationsInRect = function (pageNum, selRect) {
    var self = this;
    function rectsOverlap(a, b) {
      return !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top);
    }
    function toABRect(r) {
      return { left: r.left, top: r.top, right: r.left + r.width, bottom: r.top + r.height };
    }

    this.boxes.forEach(function (b) {
      if (b.pageNum === pageNum && rectsOverlap(selRect, toABRect(b.rect))) {
        self.selectedAnnotations.add(b.id);
        self.updateSelectionVisual(b.id, true);
      }
    });
    this.memos.forEach(function (m) {
      if (m.pageNum === pageNum && m.rect && rectsOverlap(selRect, toABRect(m.rect))) {
        self.selectedAnnotations.add(m.id);
        self.updateSelectionVisual(m.id, true);
      }
    });
    this.underlines.forEach(function (u) {
      if (u.pageNum !== pageNum) return;
      var ulRect;
      if (u.type === 'straight') {
        var minX = Math.min(u.start.x, u.end.x);
        var maxX = Math.max(u.start.x, u.end.x);
        var minY = Math.min(u.start.y, u.end.y);
        var maxY = Math.max(u.start.y, u.end.y);
        ulRect = { left: minX, top: minY - 0.005, right: maxX, bottom: maxY + 0.005 };
      } else if (u.points) {
        var xs = u.points.map(function (p) { return p.x; });
        var ys = u.points.map(function (p) { return p.y; });
        ulRect = { left: Math.min.apply(null, xs), top: Math.min.apply(null, ys) - 0.005, right: Math.max.apply(null, xs), bottom: Math.max.apply(null, ys) + 0.005 };
      }
      if (ulRect && rectsOverlap(selRect, ulRect)) {
        self.selectedAnnotations.add(u.id);
        self.updateSelectionVisual(u.id, true);
      }
    });
    this.highlights.forEach(function (h) {
      if (h.pageNum !== pageNum) return;
      for (var i = 0; i < h.rects.length; i++) {
        if (rectsOverlap(selRect, toABRect(h.rects[i]))) {
          self.selectedAnnotations.add(h.id);
          self.updateSelectionVisual(h.id, true);
          break;
        }
      }
    });
  };

  AnnotationManager.prototype.handleSelectionEnd = function (e) {
    this.removeHighlightToolbar();

    var selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

    var range = selection.getRangeAt(0);
    var parent = range.startContainer.parentElement;
    var pageWrapper = parent ? parent.closest('.page-wrapper') : null;
    if (!pageWrapper) return;

    var pageNum = parseInt(pageWrapper.dataset.page);
    var rects = this.getSelectionRects(range, pageWrapper);
    if (rects.length === 0) return;

    var text = selection.toString();
    this.showHighlightToolbar(e.clientX, e.clientY, pageNum, rects, text);
  };

  AnnotationManager.prototype.getSelectionRects = function (range, pageWrapper) {
    var clientRects = range.getClientRects();
    var wrapperRect = pageWrapper.getBoundingClientRect();
    var rects = [];

    for (var i = 0; i < clientRects.length; i++) {
      var cr = clientRects[i];
      if (cr.width < 1 || cr.height < 1) continue;
      rects.push({
        left: (cr.left - wrapperRect.left) / wrapperRect.width,
        top: (cr.top - wrapperRect.top) / wrapperRect.height,
        width: cr.width / wrapperRect.width,
        height: cr.height / wrapperRect.height,
      });
    }

    return rects;
  };

  AnnotationManager.prototype.showHighlightToolbar = function (x, y, pageNum, rects, text) {
    var self = this;
    this.removeHighlightToolbar();

    var toolbar = createElement('div', 'highlight-toolbar');
    toolbar.style.position = 'fixed';
    toolbar.style.left = x + 'px';
    toolbar.style.top = (y - 45) + 'px';
    toolbar.style.zIndex = '10000';

    Object.keys(HIGHLIGHT_COLORS).forEach(function (name) {
      var color = HIGHLIGHT_COLORS[name];
      var btn = createElement('button', 'highlight-color-btn', toolbar);
      btn.style.backgroundColor = color.replace('0.4', '0.8');
      btn.title = LABELS.colors[name];
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        self.createHighlight(pageNum, rects, name, text);
        self.removeHighlightToolbar();
        window.getSelection().removeAllRanges();
      });
    });

    document.body.appendChild(toolbar);
    this.activeHighlightToolbar = toolbar;

    var handler = function (e) {
      if (!toolbar.contains(e.target)) {
        self.removeHighlightToolbar();
        document.removeEventListener('mousedown', handler);
      }
    };
    setTimeout(function () { document.addEventListener('mousedown', handler); }, 10);
  };

  AnnotationManager.prototype.removeHighlightToolbar = function () {
    if (this.activeHighlightToolbar) {
      this.activeHighlightToolbar.remove();
      this.activeHighlightToolbar = null;
    }
  };

  AnnotationManager.prototype.createHighlight = function (pageNum, rects, colorName, text) {
    var highlight = {
      id: generateId('h'),
      pageNum: pageNum,
      rects: rects,
      color: colorName,
      text: text,
      createdAt: Date.now(),
    };

    this.highlights.push(highlight);
    this.save();
    this.renderHighlight(highlight);
  };

  AnnotationManager.prototype.renderHighlight = function (highlight) {
    var self = this;
    var wrapper = this.engine.viewerContainer.querySelector(
      '.page-wrapper[data-page="' + highlight.pageNum + '"]'
    );
    if (!wrapper) return;

    var annotLayer = wrapper.querySelector('.custom-annotations');
    if (!annotLayer) return;

    var color = HIGHLIGHT_COLORS[highlight.color] || HIGHLIGHT_COLORS.yellow;
    var group = createElement('div', 'highlight-group', annotLayer);
    group.dataset.highlightId = highlight.id;

    for (var i = 0; i < highlight.rects.length; i++) {
      var rect = highlight.rects[i];
      var div = createElement('div', 'highlight-overlay', group);
      div.style.position = 'absolute';
      div.style.left = (rect.left * 100) + '%';
      div.style.top = (rect.top * 100) + '%';
      div.style.width = (rect.width * 100) + '%';
      div.style.height = (rect.height * 100) + '%';
      div.style.backgroundColor = color;
      div.style.mixBlendMode = 'multiply';
      div.style.borderRadius = '2px';
      div.style.pointerEvents = 'auto';
      div.style.cursor = 'pointer';
    }

    group.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (confirm('형광펜을 삭제하시겠습니까?\n"' + highlight.text.substring(0, 50) + '..."')) {
        self.removeHighlight(highlight.id);
      }
    });
  };

  AnnotationManager.prototype.removeHighlight = function (id) {
    this.highlights = this.highlights.filter(function (h) { return h.id !== id; });
    this.save();
    var el = this.engine.viewerContainer.querySelector('[data-highlight-id="' + id + '"]');
    if (el) el.remove();
  };

  // ---- Right-click + drag: Area Memo ----

  AnnotationManager.prototype.handleRightMouseDown = function (e) {
    var target = e.target;
    // Don't start drawing on existing annotations
    if (target.closest('.highlight-group') || target.closest('.area-memo-group') || target.closest('.memo-container')) return;

    var pageWrapper = target.closest('.page-wrapper');
    if (!pageWrapper) return;

    e.preventDefault();
    var wrapperRect = pageWrapper.getBoundingClientRect();
    this.isDrawingArea = true;
    this.drawPageWrapper = pageWrapper;
    this.drawStartPos = {
      x: e.clientX - wrapperRect.left,
      y: e.clientY - wrapperRect.top,
      pageNum: parseInt(pageWrapper.dataset.page),
    };

    // Create temporary drawing overlay
    var annotLayer = pageWrapper.querySelector('.custom-annotations');
    if (!annotLayer) return;
    this.drawOverlayEl = createElement('div', 'area-memo-drawing', annotLayer);
    this.drawOverlayEl.style.left = this.drawStartPos.x + 'px';
    this.drawOverlayEl.style.top = this.drawStartPos.y + 'px';
    this.drawOverlayEl.style.width = '0px';
    this.drawOverlayEl.style.height = '0px';

    // Set color preview
    var color = HIGHLIGHT_COLORS[this.selectedMemoColor] || HIGHLIGHT_COLORS.yellow;
    if (isOutlineColor(this.selectedMemoColor)) {
      this.drawOverlayEl.style.background = 'transparent';
      this.drawOverlayEl.style.border = '3px solid ' + color;
    } else {
      this.drawOverlayEl.style.background = color;
      this.drawOverlayEl.style.borderColor = color.replace('0.4', '0.8');
    }
  };

  AnnotationManager.prototype.handleMouseMove = function (e) {
    if (!this.isDrawingArea || !this.drawOverlayEl || !this.drawPageWrapper) return;

    var wrapperRect = this.drawPageWrapper.getBoundingClientRect();
    var curX = Math.max(0, Math.min(e.clientX - wrapperRect.left, wrapperRect.width));
    var curY = Math.max(0, Math.min(e.clientY - wrapperRect.top, wrapperRect.height));

    var sx = this.drawStartPos.x;
    var sy = this.drawStartPos.y;
    var left = Math.min(sx, curX);
    var top = Math.min(sy, curY);
    var width = Math.abs(curX - sx);
    var height = Math.abs(curY - sy);

    this.drawOverlayEl.style.left = left + 'px';
    this.drawOverlayEl.style.top = top + 'px';
    this.drawOverlayEl.style.width = width + 'px';
    this.drawOverlayEl.style.height = height + 'px';
  };

  AnnotationManager.prototype.handleRightMouseUp = function (e) {
    if (!this.isDrawingArea || !this.drawOverlayEl || !this.drawPageWrapper) {
      this.isDrawingArea = false;
      return;
    }

    var wrapperRect = this.drawPageWrapper.getBoundingClientRect();
    var curX = Math.max(0, Math.min(e.clientX - wrapperRect.left, wrapperRect.width));
    var curY = Math.max(0, Math.min(e.clientY - wrapperRect.top, wrapperRect.height));

    var sx = this.drawStartPos.x;
    var sy = this.drawStartPos.y;
    var left = Math.min(sx, curX);
    var top = Math.min(sy, curY);
    var width = Math.abs(curX - sx);
    var height = Math.abs(curY - sy);

    // Remove temporary drawing overlay
    this.drawOverlayEl.remove();
    this.drawOverlayEl = null;

    // Minimum size check (at least 10px both directions)
    if (width < 10 || height < 10) {
      this.isDrawingArea = false;
      this.drawPageWrapper = null;
      return;
    }

    // Normalize to 0-1
    var rect = {
      left: left / wrapperRect.width,
      top: top / wrapperRect.height,
      width: width / wrapperRect.width,
      height: height / wrapperRect.height,
    };

    this.createAreaMemo(this.drawStartPos.pageNum, rect, this.selectedMemoColor);

    this.isDrawingArea = false;
    this.drawPageWrapper = null;
  };

  AnnotationManager.prototype.createAreaMemo = function (pageNum, rect, colorName) {
    var self = this;
    var memo = {
      id: generateId('am'),
      pageNum: pageNum,
      rect: rect,
      color: colorName,
      text: '',
      createdAt: Date.now(),
    };

    this.memos.push(memo);
    this.save();
    this.renderAreaMemo(memo);

    // Auto-open popover
    setTimeout(function () {
      var badge = self.engine.viewerContainer.querySelector('[data-memo-id="' + memo.id + '"] .area-memo-badge');
      if (badge) badge.click();
    }, 50);
  };

  AnnotationManager.prototype.renderAreaMemo = function (memo) {
    var self = this;
    var wrapper = this.engine.viewerContainer.querySelector(
      '.page-wrapper[data-page="' + memo.pageNum + '"]'
    );
    if (!wrapper) return;

    var annotLayer = wrapper.querySelector('.custom-annotations');
    if (!annotLayer) return;

    var color = HIGHLIGHT_COLORS[memo.color] || HIGHLIGHT_COLORS.yellow;

    var group = createElement('div', 'area-memo-group', annotLayer);
    group.dataset.memoId = memo.id;
    group.style.position = 'absolute';
    group.style.left = (memo.rect.left * 100) + '%';
    group.style.top = (memo.rect.top * 100) + '%';
    group.style.width = (memo.rect.width * 100) + '%';
    group.style.height = (memo.rect.height * 100) + '%';
    group.style.zIndex = '5';

    // Color overlay
    var overlay = createElement('div', 'area-memo-overlay', group);
    overlay.style.position = 'absolute';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    if (isOutlineColor(memo.color)) {
      overlay.style.backgroundColor = 'transparent';
      overlay.style.border = '3px solid ' + color;
      overlay.style.mixBlendMode = 'normal';
    } else {
      overlay.style.backgroundColor = color;
    }

    // Badge icon (top-right)
    var badge = createElement('div', 'area-memo-badge', group);
    badge.innerHTML = '📝';
    if (memo.text) badge.classList.add('has-text');

    // Popover
    var popover = createElement('div', 'area-memo-popover hidden', group);
    var textarea = createElement('textarea', '', popover);
    textarea.value = memo.text;
    textarea.placeholder = '메모를 입력하세요...';
    textarea.addEventListener('input', function () {
      memo.text = textarea.value;
      badge.classList.toggle('has-text', !!textarea.value);
      self.save();
    });

    var deleteBtn = createElement('button', 'memo-delete-btn', popover);
    deleteBtn.textContent = LABELS.delete;
    deleteBtn.addEventListener('click', function () {
      self.removeAreaMemo(memo.id);
    });

    // Toggle popover (badge or overlay click)
    function togglePopover(e) {
      e.stopPropagation();
      popover.classList.toggle('hidden');
      if (!popover.classList.contains('hidden')) {
        textarea.focus();
      }
    }
    badge.addEventListener('click', togglePopover);
    overlay.addEventListener('click', togglePopover);

    // Close popover on outside click
    document.addEventListener('mousedown', function (e) {
      if (!group.contains(e.target)) {
        popover.classList.add('hidden');
      }
    });

    // Right-click to delete
    group.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (confirm('메모를 삭제하시겠습니까?')) {
        self.removeAreaMemo(memo.id);
      }
    });
  };

  AnnotationManager.prototype.removeAreaMemo = function (id) {
    this.memos = this.memos.filter(function (m) { return m.id !== id; });
    this.save();
    var el = this.engine.viewerContainer.querySelector('[data-memo-id="' + id + '"]');
    if (el) el.remove();
  };

  // ---- Left-click drag: Box / Underline ----

  AnnotationManager.prototype.handleLeftMouseDown = function (e) {
    var target = e.target;
    if (target.closest('.highlight-group') || target.closest('.area-memo-group') ||
        target.closest('.memo-container') || target.closest('.box-annotation') ||
        target.closest('.underline-svg-container')) return;

    var pageWrapper = target.closest('.page-wrapper');
    if (!pageWrapper) return;

    e.preventDefault();
    var wrapperRect = pageWrapper.getBoundingClientRect();
    this.isLeftDrawing = true;
    this.leftDrawPageWrapper = pageWrapper;
    this.leftDrawStartPos = {
      x: e.clientX - wrapperRect.left,
      y: e.clientY - wrapperRect.top,
      pageNum: parseInt(pageWrapper.dataset.page),
    };

    var annotLayer = pageWrapper.querySelector('.custom-annotations');
    if (!annotLayer) return;

    if (this.activeDrawTool === 'box') {
      // Create temporary drawing preview
      this.leftDrawOverlayEl = createElement('div', 'box-drawing-preview', annotLayer);
      this.leftDrawOverlayEl.style.left = this.leftDrawStartPos.x + 'px';
      this.leftDrawOverlayEl.style.top = this.leftDrawStartPos.y + 'px';
      this.leftDrawOverlayEl.style.width = '0px';
      this.leftDrawOverlayEl.style.height = '0px';
      // Show color preview with opacity
      if (this.boxFillColor !== 'none') {
        var fillPreview = colorWithOpacity(this.boxFillColor, this.boxFillOpacity);
        this.leftDrawOverlayEl.style.background = fillPreview || 'rgba(0, 160, 223, 0.1)';
      } else {
        this.leftDrawOverlayEl.style.background = 'rgba(0, 160, 223, 0.1)';
      }
      if (this.boxBorderColor !== 'none') {
        var borderPreview = colorWithOpacity(this.boxBorderColor, this.boxBorderOpacity);
        if (borderPreview) {
          this.leftDrawOverlayEl.style.borderColor = borderPreview;
          this.leftDrawOverlayEl.style.borderStyle = 'solid';
          this.leftDrawOverlayEl.style.borderWidth = '2px';
        }
      }
    } else if (this.activeDrawTool === 'underline-straight') {
      // Create SVG preview for straight line
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'underline-drawing-preview');
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '20';
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', this.leftDrawStartPos.x);
      line.setAttribute('y1', this.leftDrawStartPos.y);
      line.setAttribute('x2', this.leftDrawStartPos.x);
      line.setAttribute('y2', this.leftDrawStartPos.y);
      line.setAttribute('stroke', UNDERLINE_COLORS[this.underlineColor] || UNDERLINE_COLORS.red);
      line.setAttribute('stroke-width', this.underlineWidth);
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
      annotLayer.appendChild(svg);
      this.leftDrawOverlayEl = svg;
    } else if (this.activeDrawTool === 'underline-freehand') {
      // Create SVG preview for freehand
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'underline-drawing-preview');
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '20';
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', UNDERLINE_COLORS[this.underlineColor] || UNDERLINE_COLORS.red);
      path.setAttribute('stroke-width', this.underlineWidth);
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('d', 'M ' + this.leftDrawStartPos.x + ' ' + this.leftDrawStartPos.y);
      svg.appendChild(path);
      annotLayer.appendChild(svg);
      this.leftDrawOverlayEl = svg;
      this.freehandPoints = [{ x: this.leftDrawStartPos.x, y: this.leftDrawStartPos.y }];
      this.freehandSvgPath = path;
    }
  };

  AnnotationManager.prototype.handleLeftMouseMove = function (e) {
    if (!this.isLeftDrawing || !this.leftDrawOverlayEl || !this.leftDrawPageWrapper) return;

    var wrapperRect = this.leftDrawPageWrapper.getBoundingClientRect();
    var curX = Math.max(0, Math.min(e.clientX - wrapperRect.left, wrapperRect.width));
    var curY = Math.max(0, Math.min(e.clientY - wrapperRect.top, wrapperRect.height));

    if (this.activeDrawTool === 'box') {
      var sx = this.leftDrawStartPos.x;
      var sy = this.leftDrawStartPos.y;
      var left = Math.min(sx, curX);
      var top = Math.min(sy, curY);
      var width = Math.abs(curX - sx);
      var height = Math.abs(curY - sy);
      this.leftDrawOverlayEl.style.left = left + 'px';
      this.leftDrawOverlayEl.style.top = top + 'px';
      this.leftDrawOverlayEl.style.width = width + 'px';
      this.leftDrawOverlayEl.style.height = height + 'px';
    } else if (this.activeDrawTool === 'underline-straight') {
      var line = this.leftDrawOverlayEl.querySelector('line');
      if (line) {
        line.setAttribute('x2', curX);
        line.setAttribute('y2', this.leftDrawStartPos.y); // Y fixed
      }
    } else if (this.activeDrawTool === 'underline-freehand') {
      this.freehandPoints.push({ x: curX, y: curY });
      if (this.freehandSvgPath) {
        this.freehandSvgPath.setAttribute('d', this.freehandSvgPath.getAttribute('d') + ' L ' + curX + ' ' + curY);
      }
    }
  };

  AnnotationManager.prototype.handleLeftMouseUp = function (e) {
    if (!this.isLeftDrawing || !this.leftDrawOverlayEl || !this.leftDrawPageWrapper) {
      this.isLeftDrawing = false;
      return;
    }

    var wrapperRect = this.leftDrawPageWrapper.getBoundingClientRect();
    var curX = Math.max(0, Math.min(e.clientX - wrapperRect.left, wrapperRect.width));
    var curY = Math.max(0, Math.min(e.clientY - wrapperRect.top, wrapperRect.height));
    var pageNum = this.leftDrawStartPos.pageNum;

    // Remove preview
    this.leftDrawOverlayEl.remove();
    this.leftDrawOverlayEl = null;

    if (this.activeDrawTool === 'box') {
      var sx = this.leftDrawStartPos.x;
      var sy = this.leftDrawStartPos.y;
      var left = Math.min(sx, curX);
      var top = Math.min(sy, curY);
      var width = Math.abs(curX - sx);
      var height = Math.abs(curY - sy);

      // Minimum size
      if (width < 5 || height < 5) {
        this.isLeftDrawing = false;
        this.leftDrawPageWrapper = null;
        return;
      }

      // Normalize to 0-1
      var rect = {
        left: left / wrapperRect.width,
        top: top / wrapperRect.height,
        width: width / wrapperRect.width,
        height: height / wrapperRect.height,
      };
      this.createBox(pageNum, rect, this.boxFillColor, this.boxBorderColor);

    } else if (this.activeDrawTool === 'underline-straight') {
      var sx = this.leftDrawStartPos.x;
      var startY = this.leftDrawStartPos.y;
      var dist = Math.abs(curX - sx);

      if (dist < 5) {
        this.isLeftDrawing = false;
        this.leftDrawPageWrapper = null;
        return;
      }

      this.createUnderline(pageNum, 'straight', {
        start: { x: sx / wrapperRect.width, y: startY / wrapperRect.height },
        end: { x: curX / wrapperRect.width, y: startY / wrapperRect.height },
      }, this.underlineColor, this.underlineWidth);

    } else if (this.activeDrawTool === 'underline-freehand') {
      this.freehandPoints.push({ x: curX, y: curY });

      if (this.freehandPoints.length < 3) {
        this.isLeftDrawing = false;
        this.leftDrawPageWrapper = null;
        this.freehandPoints = [];
        this.freehandSvgPath = null;
        return;
      }

      // Normalize points
      var normalizedPoints = this.freehandPoints.map(function (p) {
        return { x: p.x / wrapperRect.width, y: p.y / wrapperRect.height };
      });

      this.createUnderline(pageNum, 'freehand', {
        points: normalizedPoints,
      }, this.underlineColor, this.underlineWidth);

      this.freehandPoints = [];
      this.freehandSvgPath = null;
    }

    this.isLeftDrawing = false;
    this.leftDrawPageWrapper = null;
  };

  // ---- Box CRUD ----

  AnnotationManager.prototype.createBox = function (pageNum, rect, fillColor, borderColor) {
    var box = {
      id: generateId('box'),
      pageNum: pageNum,
      rect: rect,
      fillColor: fillColor,
      borderColor: borderColor,
      fillOpacity: this.boxFillOpacity,
      borderOpacity: this.boxBorderOpacity,
      createdAt: Date.now(),
    };
    this.boxes.push(box);
    this.save();
    this.renderBox(box);
  };

  AnnotationManager.prototype.renderBox = function (box) {
    var self = this;
    var wrapper = this.engine.viewerContainer.querySelector(
      '.page-wrapper[data-page="' + box.pageNum + '"]'
    );
    if (!wrapper) return;

    var annotLayer = wrapper.querySelector('.custom-annotations');
    if (!annotLayer) return;

    var fillOpacity = box.fillOpacity !== undefined ? box.fillOpacity : 0.4;
    var borderOpacity = box.borderOpacity !== undefined ? box.borderOpacity : 0.9;

    var el = createElement('div', 'box-annotation', annotLayer);
    el.dataset.boxId = box.id;
    el.style.left = (box.rect.left * 100) + '%';
    el.style.top = (box.rect.top * 100) + '%';
    el.style.width = (box.rect.width * 100) + '%';
    el.style.height = (box.rect.height * 100) + '%';

    if (box.fillColor !== 'none') {
      var fillRgba = colorWithOpacity(box.fillColor, fillOpacity);
      if (fillRgba) {
        el.style.backgroundColor = fillRgba;
        el.style.mixBlendMode = fillOpacity >= 0.9 ? 'normal' : 'multiply';
      } else {
        el.style.backgroundColor = 'transparent';
      }
    } else {
      el.style.backgroundColor = 'transparent';
    }

    if (box.borderColor !== 'none') {
      var borderRgba = colorWithOpacity(box.borderColor, borderOpacity);
      if (borderRgba) {
        el.style.border = '2px solid ' + borderRgba;
      }
    }

    // Right-click to delete
    el.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (confirm('상자를 삭제하시겠습니까?')) {
        self.removeBox(box.id);
      }
    });
  };

  AnnotationManager.prototype.removeBox = function (id) {
    this.boxes = this.boxes.filter(function (b) { return b.id !== id; });
    this.save();
    var el = this.engine.viewerContainer.querySelector('[data-box-id="' + id + '"]');
    if (el) el.remove();
  };

  // ---- Underline CRUD ----

  AnnotationManager.prototype.createUnderline = function (pageNum, type, data, color, width) {
    var underline = {
      id: generateId('ul'),
      pageNum: pageNum,
      type: type,
      color: color,
      width: width,
      createdAt: Date.now(),
    };
    if (type === 'straight') {
      underline.start = data.start;
      underline.end = data.end;
    } else {
      underline.points = data.points;
    }
    this.underlines.push(underline);
    this.save();
    this.renderUnderline(underline);
  };

  AnnotationManager.prototype.renderUnderline = function (underline) {
    var self = this;
    var wrapper = this.engine.viewerContainer.querySelector(
      '.page-wrapper[data-page="' + underline.pageNum + '"]'
    );
    if (!wrapper) return;

    var annotLayer = wrapper.querySelector('.custom-annotations');
    if (!annotLayer) return;

    // Get or create SVG container for this page
    var svgContainer = annotLayer.querySelector('.underline-svg-container');
    if (!svgContainer) {
      svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgContainer.setAttribute('class', 'underline-svg-container');
      svgContainer.style.position = 'absolute';
      svgContainer.style.top = '0';
      svgContainer.style.left = '0';
      svgContainer.style.width = '100%';
      svgContainer.style.height = '100%';
      svgContainer.style.pointerEvents = 'none';
      svgContainer.style.zIndex = '5';
      annotLayer.appendChild(svgContainer);
    }

    var wW = wrapper.offsetWidth;
    var wH = wrapper.offsetHeight;
    var strokeColor = UNDERLINE_COLORS[underline.color] || UNDERLINE_COLORS.red;

    if (underline.type === 'straight') {
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', underline.start.x * wW);
      line.setAttribute('y1', underline.start.y * wH);
      line.setAttribute('x2', underline.end.x * wW);
      line.setAttribute('y2', underline.end.y * wH);
      line.setAttribute('stroke', strokeColor);
      line.setAttribute('stroke-width', underline.width);
      line.setAttribute('stroke-linecap', 'round');
      line.dataset.underlineId = underline.id;
      line.style.pointerEvents = 'stroke';
      line.style.cursor = 'pointer';
      svgContainer.appendChild(line);

      line.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('밑줄을 삭제하시겠습니까?')) {
          self.removeUnderline(underline.id);
        }
      });
    } else if (underline.type === 'freehand') {
      var d = 'M ' + (underline.points[0].x * wW) + ' ' + (underline.points[0].y * wH);
      for (var i = 1; i < underline.points.length; i++) {
        d += ' L ' + (underline.points[i].x * wW) + ' ' + (underline.points[i].y * wH);
      }
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', strokeColor);
      path.setAttribute('stroke-width', underline.width);
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.dataset.underlineId = underline.id;
      path.style.pointerEvents = 'stroke';
      path.style.cursor = 'pointer';
      svgContainer.appendChild(path);

      path.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('밑줄을 삭제하시겠습니까?')) {
          self.removeUnderline(underline.id);
        }
      });
    }
  };

  AnnotationManager.prototype.removeUnderline = function (id) {
    this.underlines = this.underlines.filter(function (u) { return u.id !== id; });
    this.save();
    var el = this.engine.viewerContainer.querySelector('[data-underline-id="' + id + '"]');
    if (el) el.remove();
  };

  // Legacy point memo rendering (for old saved data)
  AnnotationManager.prototype.renderLegacyMemo = function (memo) {
    var self = this;
    var wrapper = this.engine.viewerContainer.querySelector(
      '.page-wrapper[data-page="' + memo.pageNum + '"]'
    );
    if (!wrapper) return;

    var annotLayer = wrapper.querySelector('.custom-annotations');
    if (!annotLayer) return;

    var container = createElement('div', 'memo-container', annotLayer);
    container.dataset.memoId = memo.id;
    container.style.position = 'absolute';
    container.style.left = (memo.x * 100) + '%';
    container.style.top = (memo.y * 100) + '%';
    container.style.zIndex = '5';

    var icon = createElement('div', 'memo-icon', container);
    icon.innerHTML = '📝';
    icon.title = LABELS.memo;

    var popover = createElement('div', 'memo-popover hidden', container);
    var textarea = createElement('textarea', 'memo-textarea', popover);
    textarea.value = memo.text;
    textarea.placeholder = '메모를 입력하세요...';
    textarea.addEventListener('input', function () {
      memo.text = textarea.value;
      self.save();
    });

    var deleteBtn = createElement('button', 'memo-delete-btn', popover);
    deleteBtn.textContent = LABELS.delete;
    deleteBtn.addEventListener('click', function () {
      self.memos = self.memos.filter(function (m) { return m.id !== memo.id; });
      self.save();
      container.remove();
    });

    icon.addEventListener('click', function (e) {
      e.stopPropagation();
      popover.classList.toggle('hidden');
      if (!popover.classList.contains('hidden')) textarea.focus();
    });

    document.addEventListener('mousedown', function (e) {
      if (!container.contains(e.target)) popover.classList.add('hidden');
    });
  };

  AnnotationManager.prototype.renderAnnotationsForPage = function (pageNum) {
    var self = this;
    // Clear existing annotations on this page to avoid duplicates on re-render
    var wrapper = this.engine.viewerContainer.querySelector(
      '.page-wrapper[data-page="' + pageNum + '"]'
    );
    if (wrapper) {
      var annotLayer = wrapper.querySelector('.custom-annotations');
      if (annotLayer) annotLayer.innerHTML = '';
    }

    this.highlights.filter(function (h) { return h.pageNum === pageNum; }).forEach(function (h) {
      self.renderHighlight(h);
    });
    this.memos.filter(function (m) { return m.pageNum === pageNum; }).forEach(function (m) {
      if (m.rect) {
        self.renderAreaMemo(m);
      } else {
        self.renderLegacyMemo(m);
      }
    });
    this.boxes.filter(function (b) { return b.pageNum === pageNum; }).forEach(function (b) {
      self.renderBox(b);
    });
    this.underlines.filter(function (u) { return u.pageNum === pageNum; }).forEach(function (u) {
      self.renderUnderline(u);
    });
  };

  AnnotationManager.prototype.save = function () {
    if (!this.docKey) return;
    this.storage.saveHighlights(this.docKey, this.highlights);
    this.storage.saveMemos(this.docKey, this.memos);
    this.storage.saveBoxes(this.docKey, this.boxes);
    this.storage.saveUnderlines(this.docKey, this.underlines);
    this.storage.saveEmojis(this.docKey, this.emojis);
    this.engine.emit('memosChanged');
  };

  // ==================== app.js ====================
  function PDFViewerApp() {
    this.engine = new PDFEngine();
    this.storage = new StorageManager();
    this.toolbar = new Toolbar(this.engine);
    this.sidebar = new Sidebar(this.engine, this.storage);
    this.sidebar.app = this;
    this.search = new SearchController(this.engine);
    this.annotations = new AnnotationManager(this.engine, this.storage);
    this.fileInput = document.getElementById('file-input');
  }

  PDFViewerApp.prototype.init = function () {
    var self = this;
    var viewerContainer = $('#viewer-container');
    this.engine.setViewerContainer(viewerContainer);

    this.toolbar.init();
    this.sidebar.init();
    this.sidebar.annotations = this.annotations;
    this.search.init();

    this.setupDragAndDrop();
    this.setupFileSelection();
    this.setupScrollTracking();
    this.setupKeyboardShortcuts();

    this.engine.addEventListener('documentLoaded', function (e) {
      self.onDocumentLoaded(e.detail);
    });

    // Save button
    this.engine.addEventListener('explicitSave', function () {
      if (self.capturedPages && self.capturedPages.length > 0) {
        self.saveCapturedPDF();
      } else {
        self.annotations.save();
        self.saveViewState();
        showToast('\uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4.');
      }
    });

    // Delete selected annotations
    this.engine.addEventListener('deleteSelected', function () {
      self.annotations.deleteSelected();
    });

    // URL opener
    this.engine.addEventListener('openUrl', function (e) {
      self.openUrl(e.detail.url);
    });

    // Capture webpage
    this.engine.addEventListener('captureWebpage', function () {
      self.captureWebpage();
    });

    // Place emoji
    this.engine.addEventListener('placeEmoji', function (e) {
      self.annotations.addEmoji(e.detail.emoji);
    });

    // Capture system
    this.capturedPages = [];

    // Warn before leaving if captures exist
    window.addEventListener('beforeunload', function (e) {
      if (self.capturedPages.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  };

  PDFViewerApp.prototype.setupDragAndDrop = function () {
    var self = this;
    var container = $('#viewer-container');

    // Block browser default at window level using capture phase
    window.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }, true);

    window.addEventListener('drop', function (e) {
      e.preventDefault();
    }, true);

    // Visual feedback
    container.addEventListener('dragenter', function () {
      container.classList.add('drag-over');
    });
    container.addEventListener('dragover', function (e) {
      e.preventDefault();
      container.classList.add('drag-over');
    });
    container.addEventListener('dragleave', function (e) {
      if (e.target === container) {
        container.classList.remove('drag-over');
      }
    });

    // Handle file drop
    window.addEventListener('drop', function (e) {
      container.classList.remove('drag-over');
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 0) {
        var file = files[0];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          self.openFile(file);
        } else if (file.type.startsWith('image/')) {
          self.openImage(file);
        }
      }
    });
  };

  PDFViewerApp.prototype.triggerFileOpen = function () {
    var self = this;
    if (window.electronAPI && window.electronAPI.showOpenDialog) {
      window.electronAPI.showOpenDialog().then(function (filePath) {
        if (filePath) self.openFilePath(filePath);
      });
    } else {
      self.fileInput.click();
    }
  };

  PDFViewerApp.prototype.setupFileSelection = function () {
    var self = this;

    this.fileInput.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (file) {
        if (file.type.startsWith('image/')) {
          self.openImage(file);
        } else {
          self.openFile(file);
        }
      }
      e.target.value = '';
    });

    var welcome = $('#welcome-screen');
    if (welcome) {
      welcome.addEventListener('click', function () {
        self.triggerFileOpen();
      });
    }

    var openBtn = $('#btn-open');
    if (openBtn) {
      openBtn.addEventListener('click', function () {
        self.triggerFileOpen();
      });
    }
  };

  PDFViewerApp.prototype.setupScrollTracking = function () {
    var self = this;
    var container = $('#viewer-container');
    var updatePage = debounce(function () {
      if (!self.engine.pdfDoc || self.engine.comicMode) return;
      var visiblePage = self.engine.getCurrentVisiblePage();
      if (visiblePage !== self.engine.currentPage) {
        self.engine.currentPage = visiblePage;
        self.engine.emit('pageChanged', { pageNum: visiblePage });
        self.saveViewState();
      }
    }, 150);

    container.addEventListener('scroll', updatePage);
  };

  PDFViewerApp.prototype.setupKeyboardShortcuts = function () {
    var self = this;
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        // Clear selection first, then deactivate draw tools
        if (self.annotations.selectedAnnotations.size > 0) {
          self.annotations.clearSelection();
          return;
        }
        if (self.annotations.activeDrawTool !== 'none') {
          self.annotations.setActiveDrawTool('none');
          return;
        }
      }

      // Del/Backspace → delete selected annotations
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (self.annotations.selectedAnnotations.size > 0) {
          e.preventDefault();
          self.annotations.deleteSelected();
          return;
        }
      }

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          e.target.blur();
          self.toolbar.toggleSearchBar(false);
        }
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            self.toolbar.toggleSearchBar(true);
            break;
          case 'p':
            e.preventDefault();
            self.toolbar.handlePrint();
            break;
          case 'o':
            e.preventDefault();
            self.triggerFileOpen();
            break;
          case 's':
            e.preventDefault();
            self.engine.emit('explicitSave');
            break;
          case '=':
          case '+':
            e.preventDefault();
            self.engine.setScale(Math.round((self.engine.currentScale + 0.25) * 100) / 100);
            break;
          case '-':
            e.preventDefault();
            self.engine.setScale(Math.round((self.engine.currentScale - 0.25) * 100) / 100);
            break;
        }
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          if (self.engine.comicMode) {
            self.engine.comicPrev();
          } else if (self.engine.currentPage > 1) {
            self.engine.scrollToPage(self.engine.currentPage - 1);
          }
          break;
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault();
          if (self.engine.comicMode) {
            self.engine.comicNext();
          } else if (self.engine.currentPage < self.engine.totalPages) {
            self.engine.scrollToPage(self.engine.currentPage + 1);
          }
          break;
        case 'Home':
          self.engine.scrollToPage(1);
          break;
        case 'End':
          self.engine.scrollToPage(self.engine.totalPages);
          break;
      }
    });
  };

  PDFViewerApp.prototype.openFile = function (file) {
    var self = this;
    if (!file) return;

    var welcome = $('#welcome-screen');
    if (welcome) welcome.classList.add('hidden');

    var reader = new FileReader();
    reader.onload = function () {
      self.engine.loadDocument(reader.result).then(function () {
        document.title = file.name + ' - PDF 뷰어';
      }).catch(function (err) {
        console.error('Error opening PDF:', err);
        alert('PDF 파일을 열 수 없습니다: ' + err.message);
        if (welcome) welcome.classList.remove('hidden');
      });
    };
    reader.readAsArrayBuffer(file);
  };

  // Open PDF from file path (Electron IPC)
  PDFViewerApp.prototype.openFilePath = function (filePath) {
    var self = this;
    if (!filePath) return;

    var welcome = $('#welcome-screen');
    if (welcome) welcome.classList.add('hidden');

    window.electronAPI.readPdfFile(filePath)
      .then(function (buffer) {
        // Electron IPC returns Buffer, convert to ArrayBuffer
        var arrayBuffer = buffer instanceof ArrayBuffer ? buffer : buffer.buffer || buffer;
        return self.engine.loadDocument(arrayBuffer).then(function () {
          var parts = filePath.replace(/\\/g, '/').split('/');
          var fileName = parts[parts.length - 1];
          document.title = fileName + ' - PDF \uBDF0\uC5B4';
        });
      })
      .catch(function (err) {
        console.error('Error opening PDF from path:', err);
        alert('PDF \uD30C\uC77C\uC744 \uC5F4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ' + err.message);
        if (welcome) welcome.classList.remove('hidden');
      });
  };

  // Open image file
  PDFViewerApp.prototype.openImage = function (file) {
    var self = this;
    var welcome = $('#welcome-screen');
    if (welcome) welcome.classList.add('hidden');

    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        self.engine.setupImageMode(img, file.name, file.size);
        document.title = file.name + ' - PDF \uBDF0\uC5B4';
      };
      img.onerror = function () {
        showToast('\uC774\uBBF8\uC9C0\uB97C \uC5F4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.');
        if (welcome) welcome.classList.remove('hidden');
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  // Open URL in iframe
  PDFViewerApp.prototype.captureWebpage = function () {
    var iframe = document.querySelector('#url-iframe-container iframe');
    if (!iframe) { showToast('캡쳐할 웹페이지가 없습니다.'); return; }

    var self = this;
    try {
      var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      // Same-origin: use html2canvas-like approach via foreignObject SVG
      var body = iframeDoc.body;
      var w = iframe.clientWidth;
      var h = iframe.clientHeight;
      var scrollY = iframeDoc.documentElement.scrollTop || body.scrollTop;

      var canvas = document.createElement('canvas');
      canvas.width = w * 2;
      canvas.height = h * 2;
      var ctx = canvas.getContext('2d');
      ctx.scale(2, 2);

      // Serialize visible portion to SVG foreignObject
      var serializer = new XMLSerializer();
      var clone = iframeDoc.documentElement.cloneNode(true);
      var svgStr = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
        '<foreignObject width="100%" height="100%">' +
        serializer.serializeToString(clone) +
        '</foreignObject></svg>';

      var img = new Image();
      img.onload = function () {
        ctx.drawImage(img, 0, 0);
        self.addCapturedPage(canvas);
      };
      img.onerror = function () {
        // Fallback to placeholder
        self.createPlaceholderCapture(iframe.src, w, h);
      };
      var blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      img.src = URL.createObjectURL(blob);
    } catch (e) {
      // Cross-origin: create placeholder
      this.createPlaceholderCapture(iframe.src, iframe.clientWidth, iframe.clientHeight);
    }
  };

  PDFViewerApp.prototype.createPlaceholderCapture = function (url, w, h) {
    var canvas = document.createElement('canvas');
    canvas.width = w * 2;
    canvas.height = h * 2;
    var ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Globe icon
    ctx.fillStyle = '#999999';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('\uD83C\uDF10', w / 2, h / 2 - 30);

    // URL text
    ctx.fillStyle = '#333333';
    ctx.font = '14px sans-serif';
    ctx.fillText(url.length > 60 ? url.substring(0, 57) + '...' : url, w / 2, h / 2 + 20);

    // Info text
    ctx.fillStyle = '#999999';
    ctx.font = '12px sans-serif';
    ctx.fillText('크로스 오리진 보안 제한으로 플레이스홀더로 캡쳐됩니다.', w / 2, h / 2 + 50);

    this.addCapturedPage(canvas);
    showToast('보안 제한으로 플레이스홀더로 캡쳐되었습니다.');
  };

  PDFViewerApp.prototype.addCapturedPage = function (canvas) {
    this.capturedPages.push(canvas);
    var pageNum = this.capturedPages.length;
    showToast('페이지 ' + pageNum + ' 캡쳐 완료');
    this.displayCapturedPages();
    this.sidebar.renderCapturePanel();
  };

  PDFViewerApp.prototype.displayCapturedPages = function () {
    var container = $('#viewer-container');
    // Remove existing captured page wrappers
    container.querySelectorAll('.captured-page-wrapper').forEach(function (el) { el.remove(); });

    var iframeContainer = document.getElementById('url-iframe-container');

    for (var i = 0; i < this.capturedPages.length; i++) {
      var wrapper = document.createElement('div');
      wrapper.className = 'captured-page-wrapper';
      wrapper.setAttribute('data-capture-page', i + 1);

      var label = document.createElement('div');
      label.className = 'captured-page-label';
      label.textContent = '캡쳐 페이지 ' + (i + 1);
      wrapper.appendChild(label);

      var canvasClone = document.createElement('canvas');
      canvasClone.width = this.capturedPages[i].width;
      canvasClone.height = this.capturedPages[i].height;
      canvasClone.style.width = '100%';
      canvasClone.style.height = 'auto';
      canvasClone.getContext('2d').drawImage(this.capturedPages[i], 0, 0);
      wrapper.appendChild(canvasClone);

      if (iframeContainer) {
        container.insertBefore(wrapper, iframeContainer);
      } else {
        container.appendChild(wrapper);
      }
    }
  };

  PDFViewerApp.prototype.saveCapturedPDF = function () {
    if (this.capturedPages.length === 0) { showToast('캡쳐된 페이지가 없습니다.'); return; }

    if (typeof window.jspdf === 'undefined' && typeof jspdf === 'undefined') {
      showToast('jsPDF 라이브러리를 로드할 수 없습니다.');
      return;
    }

    var jsPDF = (window.jspdf || jspdf).jsPDF;
    var firstCanvas = this.capturedPages[0];
    var pWidth = firstCanvas.width;
    var pHeight = firstCanvas.height;
    var orientation = pWidth > pHeight ? 'l' : 'p';

    var pdf = new jsPDF({
      orientation: orientation,
      unit: 'px',
      format: [pWidth, pHeight]
    });

    for (var i = 0; i < this.capturedPages.length; i++) {
      if (i > 0) {
        var c = this.capturedPages[i];
        pdf.addPage([c.width, c.height], c.width > c.height ? 'l' : 'p');
      }
      var imgData = this.capturedPages[i].toDataURL('image/jpeg', 0.92);
      pdf.addImage(imgData, 'JPEG', 0, 0, this.capturedPages[i].width, this.capturedPages[i].height);
    }

    pdf.save('captured-' + new Date().toISOString().slice(0, 10) + '.pdf');
    showToast('PDF 저장 완료');
  };

  PDFViewerApp.prototype.openUrl = function (url) {
    var self = this;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    // Close PDF or image if open
    if (this.engine.pdfDoc || this.engine.isImageMode) {
      this.engine.destroy();
      this.engine.isImageMode = false;
      var vc = $('#viewer-container');
      vc.querySelectorAll('.page-wrapper').forEach(function (pw) { pw.remove(); });
      // Reset annotations
      this.annotations.docKey = null;
      this.annotations.highlights = [];
      this.annotations.memos = [];
      this.annotations.boxes = [];
      this.annotations.underlines = [];
      this.annotations.clearSelection();
    }

    // Hide welcome screen
    var welcome = $('#welcome-screen');
    if (welcome) welcome.classList.add('hidden');

    var container = $('#viewer-container');
    var existing = document.getElementById('url-iframe-container');
    if (existing) existing.remove();

    var iframeContainer = document.createElement('div');
    iframeContainer.id = 'url-iframe-container';
    container.appendChild(iframeContainer);

    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';
    iframeContainer.appendChild(iframe);

    var closeBtn = document.createElement('button');
    closeBtn.id = 'url-iframe-close';
    closeBtn.textContent = '\u00D7 \uB2EB\uAE30';
    closeBtn.addEventListener('click', function () {
      if (self.capturedPages.length > 0) {
        if (confirm('캡쳐된 페이지가 있습니다. PDF로 저장하시겠습니까?')) {
          self.saveCapturedPDF();
        }
      }
      iframeContainer.remove();
      self.capturedPages = [];
      self.sidebar.renderCapturePanel();
    });
    iframeContainer.appendChild(closeBtn);

    this.toolbar.toggleUrlBar(false);

    // Auto-switch to capture tab and open sidebar
    this.sidebar.switchTab('capture');
    this.sidebar.toggle(true);
    this.sidebar.renderCapturePanel();
  };

  PDFViewerApp.prototype.onDocumentLoaded = function (detail) {
    var self = this;

    // Restore view state BEFORE building pages so layout is correct
    var viewState = self.storage.loadViewState(detail.fingerprint);
    if (viewState) {
      if (viewState.scale) {
        self.engine.currentScale = viewState.scale;
      }
      if (viewState.spreadMode) {
        self.engine.spreadMode = true;
        self.toolbar.updateSpreadButton(true);
      }
      if (viewState.comicMode) {
        self.engine.comicMode = true;
        self.toolbar.updateComicButton(true);
      }
      if (viewState.sidebarOpen !== undefined) {
        self.sidebar.toggle(viewState.sidebarOpen);
      }
    }

    this.engine.setupPages().then(function () {
      self.annotations.setupListeners();
      self.annotations.docKey = detail.fingerprint;
      self.annotations.highlights = self.storage.loadHighlights(detail.fingerprint);
      self.annotations.memos = self.storage.loadMemos(detail.fingerprint);
      self.annotations.boxes = self.storage.loadBoxes(detail.fingerprint);
      self.annotations.underlines = self.storage.loadUnderlines(detail.fingerprint);
      self.annotations.emojis = self.storage.loadEmojis(detail.fingerprint);
      self.sidebar.renderMemos();
      self.sidebar.renderDecorations();
      self.annotations.renderAllEmojis();

      if (viewState && viewState.lastPage) {
        setTimeout(function () {
          self.engine.scrollToPage(viewState.lastPage);
        }, 300);
      }
    });
  };

  PDFViewerApp.prototype.saveViewState = function () {
    if (!this.engine.pdfDoc) return;
    var docKey = this.engine.pdfDoc.fingerprints[0];
    this.storage.saveViewState(docKey, {
      lastPage: this.engine.currentPage,
      scale: this.engine.currentScale,
      spreadMode: this.engine.spreadMode,
      comicMode: this.engine.comicMode,
      sidebarOpen: this.sidebar.isOpen,
      sidebarTab: this.sidebar.activeTab,
    });
  };

  // ==================== Bootstrap ====================
  document.addEventListener('DOMContentLoaded', function () {
    var app = new PDFViewerApp();
    app.init();

    // Electron IPC: receive file path from main process
    if (window.electronAPI) {
      window.electronAPI.onOpenFile(function (filePath) {
        app.openFilePath(filePath);
      });
      window.electronAPI.getInitialFilePath().then(function (filePath) {
        if (filePath) {
          app.openFilePath(filePath);
        }
      });
    }
  });

})();
