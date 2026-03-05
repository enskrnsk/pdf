// Korean UI labels
export const LABELS = {
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

export const HIGHLIGHT_COLORS = {
  yellow: 'rgba(255, 235, 59, 0.4)',
  green: 'rgba(76, 175, 80, 0.4)',
  blue: 'rgba(33, 150, 243, 0.4)',
  pink: 'rgba(233, 30, 99, 0.4)',
  red: 'rgba(244, 67, 54, 0.4)',
};

export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function throttle(fn, limit) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

export function getDevicePixelRatio() {
  return window.devicePixelRatio || 1;
}

export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

export function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

export function createElement(tag, className, parent) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (parent) parent.appendChild(el);
  return el;
}
