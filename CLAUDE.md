# imweb — 아임웹 Widget Studio 위젯 제작

아임웹 Widget Studio 에디터용 커스텀 위젯(HTML/CSS/JS)을 만드는 작업공간.

## 구조

아티팩트는 **성격(타입)별로 폴더 분리**한다. 샌드박스 규칙(인라인 style·`!important` 금지 등)은 **커스텀 위젯(`src/`)에만** 적용되므로, 위젯이 아닌 것을 섞지 않는다.

```
src/<위젯>/            # ① 커스텀 위젯 전용 (샌드박스 / lint 검사 대상)
  spec.md            # 의도 레이어 (용도·패널설정·동작·반응형·접근성·비목표). 코드의 상위 스펙
  index.html         # Handlebars + annotation
  index.css
  index.js
inject/               # ② 우리가 아임웹에 붙여넣는 코드 (코드위젯/헤더 전역 CSS/상세 에디터 HTML)
  detail/                상품 상세설명 블록 (인라인 style 정상)
  *.css                  헤더 전역 override CSS (`!important` 허용)
ref/                  # ③ 아임웹이 뱉은 DOM 캡처본 (CSS 타겟용 참고, 손대지 않음)
  *.html
.claude/
  skills/imweb/      # 위젯 생성 규칙(SKILL.md)·공식문서 링크(references.md)·시행착오(learnings.md)
  hooks/widget-lint.sh   # src/**/*.{html,css,js} 저장 시 금지패턴 차단 (PostToolUse). inject/·ref/ 는 검사 안 함
  agents/widget-reviewer.md  # spec 충족·접근성 등 의미 리뷰
```

- **②/③ 구분**: `inject/` 는 우리가 유지·재사용하는 주입 코드, `ref/` 는 언제든 다시 복붙 가능한 읽기용 캡처. 둘 다 위젯이 아니라 샌드박스 규칙·lint 대상 아님.

## 워크플로

1. `src/<위젯>/spec.md` 작성 (구조는 `src/slider/spec.md` 참조).
2. 위젯 코드 생성·수정은 **`imweb` 스킬**에 위임 — 스킬이 spec.md를 읽고 HTML/CSS/JS 세 영역을 만든다.
3. 저장 시 lint hook이 자동 검사. 위반은 고치고 진행.
4. 검수가 필요하면 `widget-reviewer` 에이전트에 위임.

## 하드 must (세부 규칙은 SKILL.md)

- 위젯 코드 규칙(샌드박스·validator·Handlebars·`!important` 금지 등)의 단일 출처는 `.claude/skills/imweb/SKILL.md`다. 위젯을 다룰 땐 그 스킬을 따른다.
- 출력은 항상 HTML / CSS / JS 세 영역 전체.
- 공식 스펙 재확인은 `references.md` 링크를 WebFetch. 새 함정은 `learnings.md`에 축적.
