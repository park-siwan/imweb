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
