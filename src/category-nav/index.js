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
  const apply = () => {
    const isMobile = window.innerWidth <= ORDER_MAX_WIDTH;
    for (let i = 0; i < items.length; i++) {
      const n = Number.parseInt(items[i].getAttribute('data-order-m'), 10);
      items[i].style.order = (isMobile && Number.isFinite(n)) ? String(n) : '';
    }
  };
  apply();
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(apply);
    ro.observe(menu);
  }
};
setupMobileOrder();
