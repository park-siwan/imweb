/* 카테고리 메뉴바 — MD's Pick 하드코딩 주입
   대상 : 위젯 #w20260708ae5e62e25ea68 의 각 대분류 플라이아웃(중분류 ul)
   동작 : 아래 MDPICK 맵(대분류 href 기준)에 해당하는 대분류의 플라이아웃 우측에
          MD's Pick 카드를 삽입하고, 해당 li 에 .has-mdpick 클래스를 부여(CSS가 우측 여백 확보).
   위치 : SEO > Footer Code 에 <script>...</script> 로. (유료 플랜에서 JS 동작)
          또는 이 메뉴가 있는 페이지에 "코드/HTML" 위젯을 넣고 그 안에 <script> 로.
   편집 : 운영진은 MDPICK 안의 title/before/now/image/link 만 고치면 됨(비개발자용 하드코딩).
   ※ 위젯 id 가 바뀌면 WIDGET_ID 상수만 교체. */
(function () {
  var WIDGET_ID = 'w20260708ae5e62e25ea68';

  // 대분류 href → MD's Pick (하드코딩). image 는 상품 썸네일 CDN 주소(비우면 이미지 생략).
  var MDPICK = {
    '/health': {
      tag: "MD's Pick",
      title: '정관장 홍삼활력보 2종 (택1)',
      before: '66,000원',
      now: '33,900원',
      image: '', // 예: 'https://cdn.imweb.me/upload/.../xxxx.jpg'
      link: '/health'
    },
    '/food': {
      tag: "MD's Pick",
      title: '베스트 간편식 모음',
      before: '',
      now: '',
      image: '',
      link: '/food'
    },
    '/cosmetic': {
      tag: "MD's Pick",
      title: '스킨케어 특가',
      before: '',
      now: '',
      image: '',
      link: '/cosmetic'
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
