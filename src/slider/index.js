const SWIPE_THRESHOLD_PX = 50;
const DEFAULT_SLIDE_SECONDS = 5;
const SECONDS_TO_MS = 1000;
const DEFAULT_ANIM_DURATION = 0.7;
const DEFAULT_ANIM_DELAY = 0;
const ANIM_THRESHOLD = 0.15;
const FALLBACK_OBSERVER_DELAY_MS = 50;

const root = document.querySelector('#iw-slider');
const track = document.querySelector('#iw-track');
const prevBtn = document.querySelector('#iw-nav-prev');
const nextBtn = document.querySelector('#iw-nav-next');
const playBtn = document.querySelector('#iw-play');
const counterCur = document.querySelector('#iw-counter-cur');
const counterTotal = document.querySelector('#iw-counter-total');

// --- 기간 노출 파싱 ---

const padTwo = (n) => `0${n}`.slice(-2);

const parseDateParts = (dateStr) => {
  if (!dateStr) return null;
  const match = String(dateStr).trim().match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (!match) return null;
  return { y: match[1], m: padTwo(match[2]), d: padTwo(match[3]) };
};

const parseTimeStr = (timeStr, fallback) => {
  if (!timeStr) return fallback;
  const ts = String(timeStr).trim();

  const korMatch = ts.match(/(오전|오후)\s*(\d{1,2})\s*시\s*(\d{1,2})\s*분/);
  if (korMatch) {
    let hh = Number.parseInt(korMatch[2], 10);
    const mm = Number.parseInt(korMatch[3], 10);
    if (korMatch[1] === '오전' && hh === 12) hh = 0;
    else if (korMatch[1] === '오후' && hh !== 12) hh += 12;
    return `${padTwo(hh)}:${padTwo(mm)}`;
  }

  const isoMatch = ts.match(/(\d{1,2}):(\d{2})/);
  if (isoMatch) return `${padTwo(isoMatch[1])}:${isoMatch[2]}`;

  return fallback;
};

const parsePeriodDateTime = (dateStr, timeStr, fallbackTime) => {
  const date = parseDateParts(dateStr);
  if (!date) return null;
  const time = parseTimeStr(timeStr, fallbackTime || '00:00');
  const dt = new Date(`${date.y}-${date.m}-${date.d}T${time}:00+09:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const isOutsidePeriod = (slide, now) => {
  const startDt = parsePeriodDateTime(
    slide.getAttribute('data-date-start'),
    slide.getAttribute('data-time-start'),
    '00:00'
  );
  const endDt = parsePeriodDateTime(
    slide.getAttribute('data-date-end'),
    slide.getAttribute('data-time-end'),
    '23:59'
  );
  if (startDt && now < startDt) return true;
  if (endDt && now > endDt) return true;
  return false;
};

const filterPeriodSlides = () => {
  const now = new Date();
  const slideEls = document.querySelectorAll('.iw-slide');

  for (let i = slideEls.length - 1; i >= 0; i--) {
    if (!isOutsidePeriod(slideEls[i], now)) continue;
    if (slideEls[i].parentNode) {
      slideEls[i].parentNode.removeChild(slideEls[i]);
    }
  }
};

filterPeriodSlides();

// --- 슬라이더 상태 ---

const slides = Array.from(document.querySelectorAll('.iw-slide'));
const total = slides.length;

// 무한 루프: 각 방향 2장씩 복제 → 끝↔처음 전환 중에도 양옆 peek 이 안 끊김.
// DOM 순서: [R_{n-2}', R_{n-1}', R0..R_{n-1}, R0', R1']  (실제는 slides/total 유지)
const cloneOffset = total > 1 ? 2 : 0;
let forwardClone = null;  // 첫 카드 복제(맨 뒤) — 마지막→처음 전환 시 가운데 오는 클론
let backwardClone = null; // 마지막 카드 복제(맨 앞) — 처음→마지막 전환 시 가운데 오는 클론
if (cloneOffset && track) {
  const head1 = slides[total - 1].cloneNode(true);                   // 마지막
  const head2 = slides[(total - 2 + total) % total].cloneNode(true); // 마지막-1
  const tail1 = slides[0].cloneNode(true);                           // 첫
  const tail2 = slides[1 % total].cloneNode(true);                   // 둘째
  [head1, head2, tail1, tail2].forEach((c) => {
    c.setAttribute('data-clone', '');
    c.removeAttribute('data-state');
  });
  track.insertBefore(head1, slides[0]);
  track.insertBefore(head2, head1);
  track.appendChild(tail1);
  track.appendChild(tail2);
  forwardClone = tail1;
  backwardClone = head1;
}

const readSlideDurationMs = () => {
  const raw = Number.parseFloat(root ? root.getAttribute('data-duration') : '');
  return (Number.isFinite(raw) ? raw : DEFAULT_SLIDE_SECONDS) * SECONDS_TO_MS;
};

const slideDur = readSlideDurationMs();

let currentIdx = 0;
let touchX = 0;
let autoTimerId = null;
let isPaused = false;

// --- DOM 갱신 ---

// domPos(복제 포함 DOM 순서) 슬라이드를 컨테이너 가운데로 이동(px). 실제 폭·위치를 읽어 계산.
// 데스크탑(풀폭)에선 -index*폭 과 동일, 모바일(315px 카드)에선 좌우 peek 정렬이 됨.
const setTrackPositionDom = (domPos) => {
  if (!track || !root) return;
  const slideEls = track.querySelectorAll('.iw-slide');
  const target = slideEls[domPos];
  if (!target) { track.style.transform = 'translateX(0)'; return; }
  const offset = (root.offsetWidth - target.offsetWidth) / 2 - target.offsetLeft;
  track.style.transform = `translateX(${offset}px)`;
};
// 실제 인덱스 → DOM 위치(앞쪽 복제만큼 +cloneOffset)
const setTrackPosition = (index) => setTrackPositionDom(index + cloneOffset);

// 모든 슬라이드(복제 포함)의 활성/settled 해제
const clearActiveAll = () => {
  const all = track ? track.querySelectorAll('.iw-slide') : slides;
  for (let i = 0; i < all.length; i++) {
    all[i].removeAttribute('data-state');
    all[i].removeAttribute('data-settled');
  }
};

const setActiveSlide = (index) => {
  clearActiveAll();
  const el = slides[index];
  if (el) { void el.offsetWidth; el.setAttribute('data-state', 'active'); }
};

// 활성이되 애니메이션 없이 최종 상태(무한 루프 클론/점프용) — 스케일 1.0 + 텍스트 즉시.
// el 은 실제 슬라이드 또는 복제. settled 라 fadeUp 안 뜨고 튐 없음.
const setActiveSettled = (el) => {
  clearActiveAll();
  if (el) {
    el.setAttribute('data-settled', '');
    void el.offsetWidth;
    el.setAttribute('data-state', 'active');
  }
};

const setCounter = (index) => {
  if (counterCur) counterCur.textContent = String(index + 1);
};

// imweb 자동 lazy-load 우회: 화면 밖 슬라이드 이미지가 안 불러와지는 문제 →
// 진짜 주소(data-* 보관)를 src 에 강제 주입 + eager 로딩.
// cdn-optimized 우회: 아임웹 플랫폼 JS가 img src를 cdn-optimized.imweb.me로 교체(Core Web Vitals 개선 목적) →
// MutationObserver로 src 변경을 영구 감시해 원본 도메인(cdn.imweb.me)으로 즉시 되돌림.
const unoptimize = (url) =>
  typeof url === 'string' ? url.replace('cdn-optimized.imweb.me', 'cdn.imweb.me') : url;

const watchUnoptimize = () => {
  if (typeof MutationObserver === 'undefined') return;
  const imgs = document.querySelectorAll('.iw-slide-bg-img');
  if (!imgs.length) return;
  const mo = new MutationObserver((mutations) => {
    for (let i = 0; i < mutations.length; i++) {
      const img = mutations[i].target;
      const cur = img.getAttribute('src');
      const fixed = unoptimize(cur);
      if (fixed !== cur) img.setAttribute('src', fixed);
    }
  });
  imgs.forEach((img) => mo.observe(img, { attributes: true, attributeFilter: ['src'] }));
};

const LAZY_ATTRS = ['data-original', 'data-src', 'data-lazy', 'data-lazy-src', 'data-echo'];
const forceLoadImages = () => {
  const imgs = document.querySelectorAll('.iw-slide-bg-img');
  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i];
    for (let j = 0; j < LAZY_ATTRS.length; j++) {
      const real = img.getAttribute(LAZY_ATTRS[j]);
      if (real && img.getAttribute('src') !== real) {
        img.setAttribute('src', unoptimize(real));
        break;
      }
    }
    const cur = img.getAttribute('src');
    if (cur) img.setAttribute('src', unoptimize(cur));
    img.setAttribute('loading', 'eager');
  }
};

const renderSlide = () => {
  if (!track) return;
  setTrackPosition(currentIdx);
  setActiveSlide(currentIdx);
  setCounter(currentIdx);
  forceLoadImages();
};

// --- 인덱스 전환 ---

// 복제로 밀고 있는 중이면 true → 그 사이 입력 무시(점프 완료까지)
let pendingJump = false;

const nextSlide = () => {
  if (total === 0 || pendingJump) return;
  if (cloneOffset && currentIdx === total - 1) {
    // 마지막 → 뒤쪽 복제(첫 카드)로 전진, transition 끝나면 진짜 첫 카드로 순간 점프.
    // 가운데 올 복제를 활성(스케일 1.0 + 텍스트) → 크기·텍스트 튐 없음.
    setCounter(0);
    setActiveSettled(forwardClone);
    setTrackPositionDom(total + 2);
    forceLoadImages();
    currentIdx = 0;
    pendingJump = true;
    return;
  }
  currentIdx = (currentIdx + 1) % total;
  renderSlide();
};

const prevSlide = () => {
  if (total === 0 || pendingJump) return;
  if (cloneOffset && currentIdx === 0) {
    // 처음 → 앞쪽 복제(마지막 카드)로 후진, transition 끝나면 진짜 마지막 카드로 순간 점프.
    setCounter(total - 1);
    setActiveSettled(backwardClone);
    setTrackPositionDom(1);
    forceLoadImages();
    currentIdx = total - 1;
    pendingJump = true;
    return;
  }
  currentIdx = (currentIdx - 1 + total) % total;
  renderSlide();
};

// 복제로 전진/후진 후(트랜지션 끝) 진짜 카드로 트랜지션 없이 순간 이동 → 끊김 없는 무한 루프
const onTrackTransitionEnd = (e) => {
  if (!pendingJump || !track || !root) return;
  if (e.target !== track || e.propertyName !== 'transform') return;
  pendingJump = false;
  root.setAttribute('data-init', '');
  setTrackPosition(currentIdx);
  setActiveSettled(slides[currentIdx]); // 진짜 카드도 settled → 재애니메이션·튐 없이 그대로
  void track.offsetWidth;
  root.removeAttribute('data-init');
};
if (track) track.addEventListener('transitionend', onTrackTransitionEnd);

// --- 자동 재생 ---

const stopAuto = () => {
  if (autoTimerId === null) return;
  clearTimeout(autoTimerId);
  autoTimerId = null;
};

const startAuto = () => {
  if (total < 2 || isPaused) return;
  stopAuto();

  const tick = () => {
    nextSlide();
    autoTimerId = setTimeout(tick, slideDur);
  };

  autoTimerId = setTimeout(tick, slideDur);
};

const restartAutoWith = (action) => {
  stopAuto();
  action();
  startAuto();
};

// --- 이벤트 핸들러 ---

const handlePrev = () => restartAutoWith(prevSlide);
const handleNext = () => restartAutoWith(nextSlide);

const togglePlay = () => {
  isPaused = !isPaused;
  if (isPaused) {
    stopAuto();
    if (playBtn) {
      playBtn.setAttribute('data-state', 'paused');
      playBtn.setAttribute('aria-label', '재생');
    }
    return;
  }
  if (playBtn) {
    playBtn.setAttribute('data-state', 'playing');
    playBtn.setAttribute('aria-label', '일시정지');
  }
  startAuto();
};

const handleTouchStart = (e) => {
  if (!e.changedTouches || e.changedTouches.length === 0) return;
  touchX = e.changedTouches[0].screenX;
  stopAuto();
};

const handleTouchEnd = (e) => {
  if (!e.changedTouches || e.changedTouches.length === 0) return;
  const diff = touchX - e.changedTouches[0].screenX;

  if (diff > SWIPE_THRESHOLD_PX) {
    nextSlide();
  } else if (diff < -SWIPE_THRESHOLD_PX) {
    prevSlide();
  }

  startAuto();
};

const handleKeydown = (e) => {
  if (e.key === 'ArrowLeft') {
    restartAutoWith(prevSlide);
  } else if (e.key === 'ArrowRight') {
    restartAutoWith(nextSlide);
  }
};

// --- 이벤트 바인딩 ---

if (prevBtn) prevBtn.addEventListener('click', handlePrev);
if (nextBtn) nextBtn.addEventListener('click', handleNext);
if (playBtn) playBtn.addEventListener('click', togglePlay);

if (track) {
  track.addEventListener('touchstart', handleTouchStart);
  track.addEventListener('touchend', handleTouchEnd);
}

if (root) {
  root.addEventListener('keydown', handleKeydown);
}

if (counterTotal) counterTotal.textContent = String(total);

// --- 인트로 애니메이션 ---

const readAnimTiming = () => {
  const durRaw = root ? root.getAttribute('data-anim-duration') : '';
  const delRaw = root ? root.getAttribute('data-anim-delay') : '';
  const dur = Number.parseFloat(durRaw || '');
  const del = Number.parseFloat(delRaw || '');
  return {
    duration: Number.isFinite(dur) && dur >= 0 ? dur : DEFAULT_ANIM_DURATION,
    delay: Number.isFinite(del) && del >= 0 ? del : DEFAULT_ANIM_DELAY,
  };
};

const applyAnimTiming = () => {
  if (!root) return;
  const timing = readAnimTiming();
  root.style.setProperty('--anim-duration', `${timing.duration}s`);
  root.style.setProperty('--anim-delay', `${timing.delay}s`);
};

const showEntryAnimation = () => {
  if (root) root.setAttribute('data-animated', 'true');
};

const startEntryAnimation = () => {
  if (!root || root.getAttribute('data-anim') === 'none') return;

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.isIntersecting) {
          showEntryAnimation();
          io.disconnect();
          break;
        }
      }
    }, { threshold: ANIM_THRESHOLD });
    io.observe(root);
    return;
  }

  setTimeout(showEntryAnimation, FALLBACK_OBSERVER_DELAY_MS);
};

// 링크 정규화: 기본 입력은 "단어만"(예: event) → "/event" 자동 보정.
// http(s)·//·/·#·mailto·tel 로 시작하면 그대로 둔다(외부/절대경로).
const normalizeHref = (raw) => {
  const v = (raw || '').trim();
  if (!v) return v;
  if (/^(https?:|\/\/|\/|#|mailto:|tel:)/i.test(v)) return v;
  return '/' + v;
};

const normalizeSlideLinks = () => {
  const links = document.querySelectorAll('.iw-slide-link-full, .iw-btn');
  for (let i = 0; i < links.length; i++) {
    const href = links[i].getAttribute('href');
    if (href) links[i].setAttribute('href', normalizeHref(href));
  }
};

// 초기 위치·스케일은 트랜지션 없이 즉시(새로고침 시 왼쪽→중앙 미끄러짐 방지).
if (root) root.setAttribute('data-init', '');
renderSlide();
watchUnoptimize();
if (root) { void root.offsetWidth; root.removeAttribute('data-init'); }
startAuto();
applyAnimTiming();
startEntryAnimation();
normalizeSlideLinks();

// px 기반 가운데 정렬이라 폭이 바뀌면(리사이즈·회전) 재계산 필요.
if (typeof ResizeObserver !== 'undefined' && root) {
  const resizeObserver = new ResizeObserver(() => setTrackPosition(currentIdx));
  resizeObserver.observe(root);
}
