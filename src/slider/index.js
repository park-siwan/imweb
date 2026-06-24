const SWIPE_THRESHOLD_PX = 50;
const DEFAULT_SLIDE_SECONDS = 4;
const SECONDS_TO_MS = 1000;
const DEFAULT_ANIM_DURATION = 0.7;
const DEFAULT_ANIM_DELAY = 0;
const ANIM_THRESHOLD = 0.15;
const FALLBACK_OBSERVER_DELAY_MS = 50;

const root = document.querySelector('#iw-slider');
const track = document.querySelector('#iw-track');
const prevBtn = document.querySelector('#iw-nav-prev');
const nextBtn = document.querySelector('#iw-nav-next');

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
  const dotEls = document.querySelectorAll('.iw-pagination .iw-dot');

  for (let i = slideEls.length - 1; i >= 0; i--) {
    if (!isOutsidePeriod(slideEls[i], now)) continue;
    if (slideEls[i].parentNode) {
      slideEls[i].parentNode.removeChild(slideEls[i]);
    }
    if (dotEls[i] && dotEls[i].parentNode) {
      dotEls[i].parentNode.removeChild(dotEls[i]);
    }
  }
};

filterPeriodSlides();

// --- 슬라이더 상태 ---

const slides = Array.from(document.querySelectorAll('.iw-slide'));
const dots = Array.from(document.querySelectorAll('.iw-pagination .iw-dot'));
const total = slides.length;

const readSlideDurationMs = () => {
  const raw = Number.parseFloat(root ? root.getAttribute('data-duration') : '');
  return (Number.isFinite(raw) ? raw : DEFAULT_SLIDE_SECONDS) * SECONDS_TO_MS;
};

const slideDur = readSlideDurationMs();

let currentIdx = 0;
let touchX = 0;
let autoTimerId = null;

// --- DOM 갱신 ---

const setTrackPosition = (index) => {
  if (!track) return;
  track.style.transform = `translateX(-${index * 100}%)`;
};

const setActiveSlide = (index) => {
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    slide.removeAttribute('data-state');
    if (i === index) {
      void slide.offsetWidth;
      slide.setAttribute('data-state', 'active');
    }
  }
};

const setActiveDot = (index) => {
  for (let i = 0; i < dots.length; i++) {
    const dot = dots[i];
    dot.removeAttribute('data-state');
    if (i < index) {
      dot.setAttribute('data-state', 'completed');
    } else if (i === index) {
      void dot.offsetWidth;
      dot.setAttribute('data-state', 'active');
    }
  }
};

const renderSlide = () => {
  if (!track) return;
  setTrackPosition(currentIdx);
  setActiveSlide(currentIdx);
  setActiveDot(currentIdx);
};

// --- 인덱스 전환 ---

const nextSlide = () => {
  if (total === 0) return;
  currentIdx = (currentIdx + 1) % total;
  renderSlide();
};

const prevSlide = () => {
  if (total === 0) return;
  currentIdx = (currentIdx - 1 + total) % total;
  renderSlide();
};

const goToSlide = (index) => {
  currentIdx = index;
  renderSlide();
};

// --- 자동 재생 ---

const stopAuto = () => {
  if (autoTimerId === null) return;
  clearTimeout(autoTimerId);
  autoTimerId = null;
};

const startAuto = () => {
  if (total < 2) return;
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
const handleDotClick = (index) => () => restartAutoWith(() => goToSlide(index));

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

for (let i = 0; i < dots.length; i++) {
  const dot = dots[i];
  dot.addEventListener('click', handleDotClick(i));
}

if (track) {
  track.addEventListener('touchstart', handleTouchStart);
  track.addEventListener('touchend', handleTouchEnd);
}

if (root) {
  root.addEventListener('keydown', handleKeydown);
}

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

renderSlide();
startAuto();
applyAnimTiming();
startEntryAnimation();
