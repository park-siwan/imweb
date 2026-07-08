
  /* 카테고리 메뉴바 — MD's Pick 하드코딩 주입
   대상 : 위젯 #w20260708ae5e62e25ea68 의 각 대분류 플라이아웃(중분류 ul)
   동작 : 아래 MDPICK 맵(대분류 href 기준)에 해당하는 대분류의 플라이아웃 우측에
          MD's Pick 카드를 삽입하고, 해당 li 에 .has-mdpick 클래스를 부여(CSS가 우측 여백 확보).
   위치 : SEO > Footer Code 에
          또는 이 메뉴가 있는 페이지에 "코드/HTML" 위젯을 넣고 그 안에 <script> 로.
   편집 : 운영진은 MDPICK 안의 title/before/now/image/link 만 고치면 됨(비개발자용 하드코딩).
   ※ 위젯 id 가 바뀌면 WIDGET_ID 상수만 교체. 
  */
(function () {
  var WIDGET_ID = 'w20260708ae5e62e25ea68';

  // 대분류 href → MD's Pick (하드코딩). image 는 상품 썸네일 CDN 주소(비우면 이미지 생략).
  var MDPICK = {
    '/health': {
      tag: "MD's Pick",
      title: '정관장 홍삼활력보',
      before: '66,000원',
      now: '33,900원',
      image: 'https://cdn-optimized.imweb.me/thumbnail/20260617/b1556908a5bbc.jpg?w=750', // 예: 'https://cdn.imweb.me/upload/.../xxxx.jpg'
      link: '/health/?idx=4311'
    },
    '/food': {
      tag: "MD's Pick",
      title: '[하영이네] 카레맛 떡갈비(비가열) 120g',
      before: '7,000원',
      now: '2,300원',
      image: 'https://cdn-optimized.imweb.me/thumbnail/20260612/6cdf02f83ebbd.jpg?w=750',
      link: '/food/?idx=4187'
    },
    '/cosmetic': {
      tag: "MD's Pick",
      title: '[듀이트리] 어반 쉐이드 안티 폴루션 선크림 50ml 1+1',
      before: '30,000원',
      now: '16,900원',
      image: 'https://cdn-optimized.imweb.me/thumbnail/20260610/1ee92b09c53f4946.jpg?w=750',
      link: '/cosmetic/?idx=4301'
    }
  };

  var menu = document.querySelector('#' + WIDGET_ID + ' .nav');
  if (!menu) return;

  var items = menu.querySelectorAll('ul > li.depth-01');
  for (var i = 0; i < items.length; i++) {
    var li = items[i];
    var a = li.querySelector(':scope > a');
    var sub = li.querySelector(':scope > ul'); // 중분류 플라이아웃
    if (!a || !sub) continue; // 자식 없는 대분류는 건너뜀
    if (li.querySelector(':scope > ul > .iw-mdpick')) continue; // 중복 주입 방지

    var href = a.getAttribute('href');
    var md = MDPICK[href];
    if (!md || !md.title) continue;

    var card = document.createElement('a');
    card.className = 'iw-mdpick';
    card.setAttribute('href', md.link || href || '#');

    var html =
      '<span class="iw-mdpick-tag">' + md.tag + '</span>' +
      '<span class="iw-mdpick-title">' + md.title + '</span>';
    if (md.before) html += '<span class="iw-mdpick-before">' + md.before + '</span>';
    if (md.now) html += '<span class="iw-mdpick-now">' + md.now + '</span>';
    if (md.image) html += '<img class="iw-mdpick-img" src="' + md.image + '" alt="">';
    card.innerHTML = html;

    sub.appendChild(card);
    li.classList.add('has-mdpick');
  }
})();

/* ============================================================
   모바일 카테고리 타일 — 각 대분류에 라운드 썸네일 주입
   ------------------------------------------------------------
   - 데스크탑: 아무것도 안 함(썸네일은 CSS로 display:none).
   - 모바일: 각 대분류에 <img.iw-cat-thumb> 주입 후 이미지 채움.
   - 이미지 우선순위: IMG_OVERRIDE(하드코딩) → localStorage 캐시 → og:image 스트리밍.
   - og:image 스트리밍: 상품/카테고리 페이지 HTML을 조금씩 읽다가 og:image 찾으면
     즉시 abort → 페이지 전체(수백KB) 안 받고 ~20KB만 → 저부하. 결과는 캐시.
   ※ 위젯 id 바뀌면 WIDGET_ID 교체. 캐시 갱신하려면 CACHE_VER 숫자만 올림.
   ============================================================ */
(function () {
  var WIDGET_ID = 'w20260708ae5e62e25ea68';
  var MOBILE_MAX = 767;
  var CACHE_VER = 3; // 올리면 기존 캐시 전체 무효화(업로드 즉시 반영하고 싶을 때 +1)
  var MAX_BYTES = 256 * 1024; // 안전장치: 페이지당 256KB까지만 읽음
  var HOME_PATHS = ['', '/home']; // 이미지 스크랩을 허용할 경로(끝 슬래시 무시). 홈에서만 → 타 페이지 부하 0
  var DEFAULT_IMG_MARKERS = ['6107606bf8803']; // 이 문자열 포함 = 사이트 기본 로고 → 이미지 없음(회색) 취급
  var NONE_TTL = 60 * 60 * 1000;      // "이미지 없음" 캐시 수명 1시간 → 대표이미지 업로드하면 그 안에 자동 반영
  var IMG_TTL = 7 * 24 * 60 * 60 * 1000; // 실제 이미지 캐시 수명 7일

  // (선택) 대분류 href → 이미지 강제 지정. og:image 가 부실하거나 통제하고 싶을 때.
  var IMG_OVERRIDE = {
    // '/health': 'https://cdn-optimized.imweb.me/thumbnail/.../xxxx.jpg?w=400',
    // '/food':   '',
  };

  var menu = document.querySelector('#' + WIDGET_ID + ' .nav');
  if (!menu) return;
  var list = menu.querySelector('ul');
  if (!list) return;
  var items = list.querySelectorAll(':scope > li.depth-01');
  if (!items.length) return;

  function isMobile() {
    return window.matchMedia('(max-width: ' + MOBILE_MAX + 'px)').matches;
  }
  // 스크랩(fetch)은 홈에서만. 타 페이지에선 캐시/오버라이드만 사용(요청 0).
  function isHome() {
    var p = (location.pathname || '').replace(/\/+$/, '');
    return HOME_PATHS.indexOf(p) !== -1;
  }
  function cacheKey(href) { return 'catimg:v' + CACHE_VER + ':' + href; }
  // 사이트 기본 로고면 true → 이미지 안 넣고 회색 배경 유지
  function isDefaultImg(src) {
    if (!src) return true;
    for (var i = 0; i < DEFAULT_IMG_MARKERS.length; i++) {
      if (src.indexOf(DEFAULT_IMG_MARKERS[i]) !== -1) return true;
    }
    return false;
  }
  // 캐시 read/write (TTL 포함). 만료되면 null 반환 → 재fetch.
  function readCache(href) {
    try {
      var raw = localStorage.getItem(cacheKey(href));
      if (!raw) return null;
      var o = JSON.parse(raw);
      var ttl = (o.v === 'none') ? NONE_TTL : IMG_TTL;
      if (Date.now() - o.t > ttl) return null;
      return o.v;
    } catch (e) { return null; }
  }
  function writeCache(href, v) {
    try { localStorage.setItem(cacheKey(href), JSON.stringify({ v: v, t: Date.now() })); } catch (e) {}
  }

  // 투명 1×1 픽셀 — 기본 src. src 없는 <img> 를 iOS Safari 가 테두리 프레임으로 그리는 것 방지
  // (이미지 없을 땐 이게 투명하게 깔려 회색 배경만 보임). 실제 이미지는 loadOne 이 덮어씀.
  var TRANSPARENT_PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  // 각 대분류에 썸네일 <img> 자리 생성(라벨 앞). 데스크탑에선 CSS로 숨김.
  for (var i = 0; i < items.length; i++) {
    var a0 = items[i].querySelector(':scope > a');
    if (!a0 || a0.querySelector('.iw-cat-thumb')) continue;
    var img = document.createElement('img');
    img.className = 'iw-cat-thumb';
    img.alt = '';
    img.setAttribute('loading', 'lazy');
    img.src = TRANSPARENT_PX; // 빈 프레임 방지(회색 배경만 노출)
    a0.insertBefore(img, a0.firstChild);
  }

  // og:image 스트리밍 추출(찾으면 즉시 abort). 스트림 미지원이면 text() 폴백.
  function fetchOgImage(url) {
    var controller = new AbortController();
    return fetch(url, { signal: controller.signal }).then(function (res) {
      if (!res.ok) { controller.abort(); return null; }
      if (!res.body || !res.body.getReader) {
        return res.text().then(function (t) {
          var m = t.match(/property=["']og:image["'][^>]+content=["']([^"']+)/i);
          return m ? m[1] : null;
        });
      }
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var html = '';
      var received = 0;
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return null;
          received += r.value.length;
          html += decoder.decode(r.value, { stream: true });
          var m = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)/i);
          if (m) { controller.abort(); return m[1]; }
          if (html.indexOf('</head>') !== -1 || received > MAX_BYTES) {
            controller.abort();
            return null;
          }
          return pump();
        });
      }
      return pump();
    }).catch(function () { return null; }); // abort/네트워크 오류는 조용히 무시
  }

  function setImg(li, src) {
    if (!src) return;
    var img = li.querySelector(':scope > a .iw-cat-thumb');
    if (img) img.src = src;
  }

  // 타일 이미지 URL 해석(오버라이드→캐시→og:image). 이미지 없으면 null.
  function resolveUrl(li) {
    var a = li.querySelector(':scope > a');
    var href = a && a.getAttribute('href');
    if (!href) return Promise.resolve(null);
    if (IMG_OVERRIDE[href]) return Promise.resolve(IMG_OVERRIDE[href]);
    var cached = readCache(href);
    if (cached === 'none') return Promise.resolve(null);
    if (cached && !isDefaultImg(cached)) return Promise.resolve(cached);
    if (!isHome()) return Promise.resolve(null); // 홈이 아니면 스크랩 안 함(캐시/오버라이드만)
    return fetchOgImage(href).then(function (src) {
      if (isDefaultImg(src)) { writeCache(href, 'none'); return null; } // 없음 → 1h 캐시
      writeCache(href, src);                                            // 이미지 → 7일 캐시
      return src;
    });
  }

  // 이미지 미리 로드(브라우저 캐시에 올려둠). 실패·없음도 그냥 resolve.
  function preload(url) {
    return new Promise(function (resolve) {
      if (!url) { resolve(); return; }
      var pre = new Image();
      pre.onload = function () { resolve(); };
      pre.onerror = function () { resolve(); };
      pre.src = url;
    });
  }

  var tileUrls = [];
  var revealed = false;
  // 스켈레톤 종료 + 준비된 이미지 일괄 노출
  function reveal() {
    if (revealed) return;
    revealed = true;
    for (var r = 0; r < items.length; r++) {
      if (tileUrls[r]) setImg(items[r], tileUrls[r]);
    }
    if (list) { list.classList.remove('iw-catnav-loading'); list.classList.add('iw-catnav-ready'); }
  }

  // 모든 타일 URL 해석 + preload 완료 후 "일괄" 노출(그전까지 스켈레톤). 순차 처리로 요청 폭주 방지.
  function loadAll() {
    var idx = 0;
    (function next() {
      if (idx >= items.length) { reveal(); return; }
      var i = idx;
      resolveUrl(items[i]).then(function (url) {
        tileUrls[i] = url || null;
        return preload(tileUrls[i]);
      }).then(function () { idx++; next(); });
    })();
    setTimeout(reveal, 5000); // 안전장치: 5초 넘으면 준비된 만큼이라도 노출
  }

  function applyGridCols() {
    // 1행(CSS grid-auto-flow:column)이 처리 → JS 인라인 컬럼 지정 제거(이전 값 정리)
    list.style.gridTemplateColumns = '';
  }

  var loaded = false;
  function maybeLoad() {
    if (!loaded && isMobile()) {
      loaded = true;
      if (list) list.classList.add('iw-catnav-loading'); // 스켈레톤 시작(모바일만)
      loadAll();
    }
  }

  applyGridCols();
  maybeLoad();
  window.addEventListener('resize', function () { applyGridCols(); maybeLoad(); });
})();
