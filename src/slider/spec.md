# 슬라이더 위젯 spec

> 이 파일은 위젯의 **의도(intent)** 레이어다. `imweb` 스킬이 이 spec를 입력으로 읽어
> `index.{html,css,js}`를 생성·수정한다. 코드 세부가 아니라 "무엇을 왜"를 적는다.
> 새 위젯을 만들 땐 이 파일을 `src/<위젯>/spec.md`로 복사해 채운다 (섹션 구조 = 템플릿).

## 1. 용도

메인 비주얼 영역에 들어가는 풀폭 이미지 롤링 배너. 슬라이드마다 배경 이미지(PC/모바일 분리),
2단 텍스트, CTA 버튼, 기간 노출(시작·종료 일시)을 설정한다. 자동재생 + 좌우버튼 + 페이지네이션 +
스와이프 + 키보드 조작.

## 2. 패널 설정 (annotation)

> 타입·접두사·길이 규칙은 SKILL.md §3.3 준수. 아래는 "어떤 설정이 왜 필요한가".

**루트 레벨 (위젯 1회)**
- `select-pc-position` / `select-mobile-position` — 콘텐츠 9-pos 정렬 (PC/모바일 별도). 기본 PC `left-center`, 모바일 `center-center`.
- `switch-pagination` (기본 on) — 하단 도트 표시 여부.
- `switch-arrows` (기본 on) / `segment-arrow-style` (line/angle) — 좌우 버튼 표시·형태.
- `switch-zoom` (기본 off) — 호버 시 이미지 확대.
- `text-duration` (기본 "5") — 자동재생 간격(초). 숫자 textfield.
- `select-anim` (none/fade/slide-*/zoom-in, 기본 none) + `text-animduration`("0.7") + `text-animdelay`("0") — 등장 애니메이션.

**슬라이드 아이템 (`item-slides`, 1종, 기본 3개)**
- `image-bg` / `image-bg-mobile` — PC/모바일 배경. 모바일 비면 PC 사용.
- `editor-subtext` / `editor-title` — 2단 텍스트 (text-editor).
- `text-btn` / `text-link` / `switch-new-tab` — CTA. 버튼 텍스트 없으면 슬라이드 전체가 링크.
- `date-start` / `time-start` / `date-end` / `time-end` — 기간 노출. 범위 밖 슬라이드는 런타임 제거.

## 3. 동작

- **자동재생**: 슬라이드 2개 이상일 때만. `text-duration`초 간격. 조작(버튼/도트/스와이프) 시 타이머 리셋.
- **기간 노출**: 로드 시 현재 시각 기준 노출 범위 밖 슬라이드 + 대응 도트를 DOM에서 제거 (KST +09:00 기준).
- **스와이프**: 50px 임계값. 터치 시작 시 자동재생 멈춤, 끝나면 재개.
- **키보드**: 루트 포커스 시 ←/→ 로 이전/다음.
- **상태**: active/completed 는 `data-state` 속성으로 (class 토글 금지, SKILL.md §5.3).

## 4. 반응형

- 풀폭. 이미지 `width:100%; object-fit`.
- 콘텐츠 위치는 PC/모바일 별도 9-pos.
- 폰트 모바일 cap (SKILL.md §7.11): 타이틀 18px / 서브 14px.

## 5. 접근성

- 좌우 버튼 `aria-label`("이전"/"다음"), 화살표 글리프 `aria-hidden`.
- 루트 `tabindex="0"` 로 키보드 포커스.
- `<img alt>` 필수.

## 6. 비목표 (하지 않음)

- 무한 루프 트랜지션(복제 슬라이드) — 단순 modulo 인덱스로 충분.
- 외부 데이터·API 연동 (SKILL.md §3.1 JS 금지).
- 섹션 레벨 설정(배경·여백) 중복 (SKILL.md §8.3).
