const MOBILE_MAX_WIDTH = 960;

const menu = document.querySelector('#iw-menu');

// 터치/모바일: hover가 없으므로 첫 탭은 서브메뉴 토글, 다시 탭하면 링크 이동.
// PC(>960px)는 CSS hover/focus로 처리하므로 JS 개입 없음.
const setupTouchToggle = () => {
  if (!menu) return;
  const items = menu.querySelectorAll('.iw-menu-item');

  const closeAll = () => {
    for (let i = 0; i < items.length; i++) {
      items[i].removeAttribute('data-open');
    }
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const sub = item.querySelector('.iw-submenu');
    const link = item.querySelector('.iw-menu-link');
    if (!sub || !link) continue;
    if (!sub.querySelector('.iw-sub-link')) continue;

    const handleClick = (e) => {
      if (window.innerWidth > MOBILE_MAX_WIDTH) return;
      if (item.getAttribute('data-open') === 'true') return;
      e.preventDefault();
      closeAll();
      item.setAttribute('data-open', 'true');
    };

    link.addEventListener('click', handleClick);
  }
};

// 링크 정규화: 기본 입력은 "단어만"(예: new). 자동으로 "/new" 로 보정(하위 페이지에서 안 깨지게).
// http(s)·//·/·#·mailto·tel 로 시작하면 그대로 둔다(외부/절대경로).
const normalizeHref = (raw) => {
  const v = (raw || '').trim();
  if (!v) return v;
  if (/^(https?:|\/\/|\/|#|mailto:|tel:)/i.test(v)) return v;
  return '/' + v;
};

// 서브메뉴: editor-subs("이름|링크" 줄바꿈 텍스트)를 파싱해 .iw-sub-list 에 링크 생성.
// text-editor 출력이 <p>/<br> 로 나올 수 있어 줄 구분을 정규화한 뒤 파싱.
const buildSubmenus = () => {
  if (!menu) return;
  const items = menu.querySelectorAll('.iw-menu-item');
  for (let i = 0; i < items.length; i++) {
    const src = items[i].querySelector('.iw-subs-src');
    const list = items[i].querySelector('.iw-sub-list');
    if (!src || !list) continue;
    const normalized = src.innerHTML
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li)>/gi, '\n');
    const tmp = document.createElement('div');
    tmp.innerHTML = normalized;
    const lines = (tmp.textContent || '').split('\n');
    for (let j = 0; j < lines.length; j++) {
      const line = lines[j].trim();
      if (!line) continue;
      const bar = line.indexOf('|');
      const label = (bar === -1 ? line : line.slice(0, bar)).trim();
      const link = bar === -1 ? '' : line.slice(bar + 1).trim();
      if (!label) continue;
      const a = document.createElement('a');
      a.className = 'iw-sub-link';
      a.setAttribute('role', 'menuitem');
      if (link) a.setAttribute('href', normalizeHref(link));
      a.textContent = label;
      list.appendChild(a);
    }
  }
};

// 메뉴 링크·MD 링크도 동일하게 정규화(Handlebars 로 렌더된 href 보정).
const normalizeLinks = () => {
  if (!menu) return;
  const links = menu.querySelectorAll('.iw-menu-link, .iw-mdpick');
  for (let i = 0; i < links.length; i++) {
    const href = links[i].getAttribute('href');
    if (href) links[i].setAttribute('href', normalizeHref(href));
  }
};

buildSubmenus();
normalizeLinks();
setupTouchToggle();

// 모바일 타일: 마우스 드래그로 가로 스크롤(터치는 native라 JS 불필요). 데스크탑 미리보기/narrow 대응.
const DRAG_THRESHOLD_PX = 4;
const setupDragScroll = () => {
  if (!menu) return;
  const list = menu.querySelector('.iw-menu-list');
  if (!list) return;

  let isDown = false;
  let moved = false;
  let startX = 0;
  let startScroll = 0;

  const onDown = (e) => {
    isDown = true;
    moved = false;
    startX = e.pageX;
    startScroll = list.scrollLeft;
  };
  const onMove = (e) => {
    if (!isDown) return;
    const dx = e.pageX - startX;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX) moved = true;
    if (moved) {
      e.preventDefault();
      list.scrollLeft = startScroll - dx;
    }
  };
  const onUp = () => { isDown = false; };
  // 드래그 후 발생하는 클릭은 링크 이동을 막는다(스크롤 의도였으므로).
  const onClick = (e) => {
    if (!moved) return;
    e.preventDefault();
    e.stopPropagation();
    moved = false;
  };

  list.addEventListener('mousedown', onDown);
  list.addEventListener('mousemove', onMove);
  list.addEventListener('mouseup', onUp);
  list.addEventListener('mouseleave', onUp);
  list.addEventListener('click', onClick);
};

setupDragScroll();

// 모바일에서만 항목 순서를 data-order-m(모바일 순서)로 재배치. PC는 패널(문서) 순서 유지.
// (모바일 .iw-menu-list 는 grid 라 order 가 먹고, PC 세로 리스트엔 영향 없음.)
const ORDER_MAX_WIDTH = 960;
const setupMobileOrder = () => {
  if (!menu) return;
  const items = menu.querySelectorAll('.iw-menu-item');
  // 2행 유지 + 행 우선(가로) 순서: 열 개수 = ceil(항목수/2). (17.6% 는 CSS 열 폭과 동일)
  const list = menu.querySelector('.iw-menu-list');
  if (list && items.length) {
    list.style.gridTemplateColumns = 'repeat(' + Math.max(1, Math.ceil(items.length / 2)) + ', 17.6%)';
  }
  const apply = () => {
    const isMobile = window.innerWidth <= ORDER_MAX_WIDTH;
    for (let i = 0; i < items.length; i++) {
      if (!isMobile) { items[i].style.order = ''; continue; }
      const n = Number.parseInt(items[i].getAttribute('data-order-m'), 10);
      // 번호 있는 항목이 앞으로(작을수록 앞). 번호 없는 항목은 뒤로(큰 값).
      // CSS order 기본값 0 이라 미지정을 그대로 두면 번호(1,2,3)가 0보다 커서 오히려 뒤로 감 → 큰 값 부여.
      items[i].style.order = Number.isFinite(n) ? String(n) : '99999';
    }
  };
  apply();
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(apply);
    ro.observe(menu);
  }
};
setupMobileOrder();
