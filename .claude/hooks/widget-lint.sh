#!/usr/bin/env bash
# Widget Studio 위젯 파일 린트 (PostToolUse / Write|Edit)
# SKILL.md "출력 직전 최종 점검"의 결정론적 grep 항목을 하드 게이트로 강제한다.
# 위반 발견 시 stderr로 보고하고 exit 2 (모델에 피드백).
# src/ 아래 .html/.css/.js 가 아니면 조용히 통과.

f="$(jq -r '.tool_input.file_path // .tool_response.filePath // empty' 2>/dev/null)"
[ -z "$f" ] && exit 0
[ -f "$f" ] || exit 0

# src/ 경로 + 위젯 확장자만 검사
case "$f" in
  */src/*.html|*/src/*.css|*/src/*.js|src/*.html|src/*.css|src/*.js) ;;
  *) exit 0 ;;
esac

# 커스텀 위젯이 아닌 폴더는 샌드박스 규칙 대상 아님 → 제외.
#  - detail/    : 상품 상세설명 에디터용 HTML (인라인 style 정상)
#  - recommend/ : 아임웹 DOM 참고본 + 헤더 전역 override CSS (!important·인라인 정상)
#  - gnb/       : 아임웹 네이티브 GNB DOM 참고본
# 새 위젯 폴더는 기본 검사(안전한 기본값). 위가 아닌 참고/override만 추가 제외.
case "$f" in
  */src/detail/*|src/detail/*|\
  */src/recommend/*|src/recommend/*|\
  */src/gnb/*|src/gnb/*) exit 0 ;;
esac

ext="${f##*.}"
violations=""

# label|regex 형태로 검사. grep -nE 매치 시 위반.
check() {
  local label="$1" re="$2"
  local hits
  hits="$(grep -nE "$re" "$f" 2>/dev/null)" || return 0
  [ -n "$hits" ] && violations="${violations}
  [${label}]
$(echo "$hits" | sed 's/^/    /')"
}

# 전 영역
check "!important 금지" '!\s*important'

if [ "$ext" = "html" ]; then
  check "차단 태그(<style>/<script>/<form>/<object>/<embed>/<base>/<meta>/<link>)" \
        '<\s*(style|script|form|object|embed|base|meta|link)[\s>]'
  check "인라인 style= 금지" '\sstyle\s*='
  check "on* 인라인 이벤트 금지" '\son[a-z]+\s*='
  check "삼중/ampersand 중괄호 금지 ({{{ , {{&)" '\{\{\{|\{\{&'
  check "partial {{> 미지원" '\{\{\s*>'
  check "Handlebars 데이터변수 금지 ({{@first/last/key/root)" '\{\{\s*@(first|last|key|root)'
  check "부모참조 {{../ 금지" '\{\{\s*\.\.'
  check "{{this. 금지" '\{\{\s*this\.'
fi

if [ "$ext" = "css" ]; then
  check "@import 금지" '@import'
  check "외부/data url 금지 (http(s)/// /data:)" "url\\(\\s*['\"]?\\s*(https?:|//|data:)"
  check "expression()/behavior 레거시 금지" 'expression\s*\(|behavior\s*:\s*url'
fi

if [ "$ext" = "js" ]; then
  check "var 선언 금지 (const/let)" '\bvar\s+[a-zA-Z_$]'
  check "eval/Function 생성자 금지" '\beval\s*\(|\bnew\s+Function\s*\(|[^.]\bFunction\s*\('
  check "el.dataset 접근 금지 (get/setAttribute)" '\.dataset\.'
  check "네트워크 API 금지 (fetch/XHR/WebSocket)" '\bfetch\s*\(|XMLHttpRequest|\bnew\s+WebSocket'
  check "스토리지/쿠키 금지" 'localStorage|sessionStorage|indexedDB|document\.cookie'
  check "location/history 금지" 'window\.location|window\.history'
  check "setAttribute('"'"'style'"'"') 금지" "setAttribute\\(\\s*['\"]style"
fi

if [ -n "$violations" ]; then
  printf '위젯 린트 위반 — %s\n%s\n\n참고: SKILL.md §3 HARD RULES / "출력 직전 최종 점검". 문자열/주석 오탐이면 그 사유를 남기고 진행.\n' "$f" "$violations" >&2
  exit 2
fi
exit 0
