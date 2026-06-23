#!/usr/bin/env python3
"""국가(country) 상세화면 렌더링 엔진 (P1)

- AI 리서치 국가 데이터(data/research/country/<CODE>/<CODE>_latest.json)를 입력으로 받아,
  웹 디자인 스펙(architecture/design/stitch/html/P1.html, "국가 정보")에 맞춘
  완성형 standalone HTML 상세화면으로 렌더링한다.
- 구성(스펙 §4 P1): 국기·국가명·진출여부 → 국가 일반(통화·시장규모 등) +
  시계열 차트 + 시장/핵심규제/특화요건·시스템 섹션.
- 데이터 주도(country-agnostic) — 어떤 국가 리서치 데이터든 동일 로직으로 렌더.
- 입력: data/research/country/<CODE>/<CODE>_latest.json
- 출력: detail/country/<CODE>/html/DTL_<CODE>_<nnn>.html (생성마다 순번 증가)

스코어링/계산은 일절 하지 않고 "표현"만 담당한다 (관심사 분리).
포맷·차트 헬퍼는 region_report_rendering_engine(rre)을 재사용한다.
"""
import json, os, sys, glob

BASE = os.path.dirname(os.path.abspath(__file__))
# engine/rendering → app/backend  (storage가 위치한 backend 루트)
BACKEND = os.path.dirname(os.path.dirname(BASE))
STORAGE = os.path.join(BACKEND, "storage")
DATA = os.path.join(STORAGE, "data")
DETAIL = os.path.join(STORAGE, "detail")

# 같은 rendering/ 폴더의 포맷·차트 헬퍼 재사용 (중복 작성 금지)
sys.path.insert(0, BASE)
import render_helpers as rre  # noqa: E402

TPL_PATH = os.path.join(BASE, "templates", "country_detail_template.html")


# ─────────────────────────────────────────────────────────────────────────────
# 진출여부 — 사내 자산(country_assets)에 해당 국가코드 존재 여부로 도출 (스펙 §4)
# ─────────────────────────────────────────────────────────────────────────────
def entry_status(code):
    """(있음→기진출/Operational, 없음→미진출) 배지 HTML 반환."""
    path = os.path.join(DATA, "internal", "internal_latest.json")
    assets = {}
    try:
        with open(path, encoding="utf-8") as f:
            assets = json.load(f).get("country_assets", {})
    except Exception:
        pass
    if code in assets:
        a = assets[code]
        sol = a.get("solution", "")
        label = f"기진출 · {sol}" if sol else "기진출"
        badge = (
            '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-label-sm '
            'bg-[#E9F3EE] text-[#4F8A6D] border border-[#D6E8DF]">'
            '<span class="w-1.5 h-1.5 rounded-full bg-[#4F8A6D] mr-1.5"></span>'
            f'{rre.esc(label)}</span>')
    else:
        badge = (
            '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-label-sm '
            'bg-surface-container text-on-surface-variant border border-surface-border">'
            '<span class="w-1.5 h-1.5 rounded-full bg-outline mr-1.5"></span>'
            '미진출 · 진단 대상</span>')
    return badge


# ─────────────────────────────────────────────────────────────────────────────
# 빌더
# ─────────────────────────────────────────────────────────────────────────────
# 핵심 시장 지표 — 한 패널에 색만 다르게 겹쳐 그릴 시계열(항목명 부분일치로 매칭, 순서=범례 순서).
# 단위가 달라 각 선은 자체 정규화(추세 비교) — 신차 판매대수는 절대값이나 추세=증감 흐름으로 읽힌다.
COMBINED_KEYS = ["GDP 성장률", "신차 판매대수"]


def charts(data):
    """핵심 시장 지표(시장규모·성장률·이용률·GDP 성장률)를 한 패널에 색 구분으로 겹쳐 렌더."""
    items = [it for it in data.get("items", []) if it.get("timeseries")]
    # COMBINED_KEYS 순서대로 매칭(부분일치) — 중복 매칭 방지
    picked, used = [], set()
    for key in COMBINED_KEYS:
        for it in items:
            name = it.get("item", "")
            if id(it) not in used and key in name:
                picked.append(it)
                used.add(id(it))
                break

    series = []
    for i, it in enumerate(picked):
        ts = it.get("timeseries") or {}
        series.append({
            "name": it.get("item", ""),
            "color": rre.MULTI_LINE_PALETTE[i % len(rre.MULTI_LINE_PALETTE)],
            "history": ts.get("history"),
            "forecast": ts.get("forecast"),
        })
    svg = rre.multi_line_chart(series)
    if not svg:
        return ('<p class="font-body-sm text-body-sm text-on-surface-variant">시계열 데이터 없음.</p>')
    return (
        '<div class="border border-surface-border rounded-lg p-md bg-surface">'
        '<div class="flex justify-between items-center mb-md">'
        '<h4 class="font-label-md text-label-md text-on-surface-variant">핵심 시장 지표 추이</h4>'
        '</div>'
        f'<div class="relative w-full overflow-hidden">{svg}</div>'
        '</div>')


def competitors_table(data):
    """경쟁사(금융사) Top5 순위표 — '금융사 순위(Top 5)' 항목의 [{rank,name,market_share}]."""
    rows = None
    for it in data.get("items", []):
        if it.get("item") == "금융사 순위(Top 5)" and isinstance(it.get("value"), list):
            rows = it["value"]
            break
    if not rows:
        return ""
    rows = rows[:3]
    body = "".join(
        '<tr class="border-b border-surface-border last:border-0 hover:bg-surface-variant/40 transition-colors">'
        f'<td class="py-sm px-md font-label-md text-label-md text-primary font-bold w-8">{rre.esc(r.get("rank", "—"))}</td>'
        f'<td class="py-sm px-md font-body-md text-body-md text-on-surface break-words">{rre.esc(r.get("name", ""))}</td>'
        f'<td class="py-sm px-md font-label-md text-label-md text-secondary font-semibold text-right whitespace-nowrap">{rre.esc(r.get("market_share", "—"))}</td>'
        '</tr>' for r in rows)
    return (
        '<div>'
        '<h3 class="font-headline-md text-headline-md text-primary mb-md flex items-center gap-sm">'
        '<span class="material-symbols-outlined text-secondary">groups</span>경쟁 금융사 Top 3</h3>'
        '<div class="border border-surface-border rounded-lg bg-surface overflow-hidden">'
        '<table class="w-full text-left border-collapse">'
        '<thead><tr class="bg-surface-variant/40 border-b border-surface-border">'
        '<th class="py-sm px-md font-label-sm text-label-sm text-outline uppercase tracking-wider">#</th>'
        '<th class="py-sm px-md font-label-sm text-label-sm text-outline uppercase tracking-wider">금융사</th>'
        '<th class="py-sm px-md font-label-sm text-label-sm text-outline uppercase tracking-wider text-right">점유율</th>'
        f'</tr></thead><tbody>{body}</tbody></table></div></div>')


# 리서치 데이터가 없는 국가(예: 베이스라인국 AU)용 코드→한글명 폴백.
_COUNTRY_KO_FALLBACK = {
    "GB": "영국", "US": "미국", "AU": "호주", "BR": "브라질",
    "FR": "프랑스", "IT": "이탈리아", "DE": "독일", "CA": "캐나다",
    "IN": "인도", "CN": "중국", "ID": "인도네시아", "ES": "스페인",
    "PL": "폴란드", "MX": "멕시코",
}


def _country_ko(code):
    """국가코드 → 한글 국가명. 해당국 리서치 데이터에서 조회, 없으면 폴백 사전, 그래도 없으면 코드."""
    path = os.path.join(DATA, "research", "country", code, f"{code}_latest.json")
    try:
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
        name = d.get("country_ko") or d.get("country")
        if name:
            return name
    except Exception:
        pass
    return _COUNTRY_KO_FALLBACK.get(code, code)


def baseline_panel(data):
    """경쟁 금융사 하단 — 해당 권역 베이스라인 국가 정보(국가명·솔루션·진출년도).

    region_baselines[<region>] → country_assets[<baseline>] (사내 룰셋). 없으면 미표시.
    """
    region = data.get("region", "")
    if not region:
        return ""
    path = os.path.join(DATA, "internal", "internal_latest.json")
    try:
        with open(path, encoding="utf-8") as f:
            internal = json.load(f)
    except Exception:
        return ""
    base_code = internal.get("region_baselines", {}).get(region)
    if not base_code:
        return ""
    asset = internal.get("country_assets", {}).get(base_code, {})
    solution = asset.get("solution", "—")
    since = asset.get("since")
    since_str = f"{since}년" if since else "—"
    name_ko = _country_ko(base_code)

    def cell(label, value_html):
        # 라벨 위 / 값 아래. 좁은 폭은 세로 스택, lg 이상에서만 가로 + 셀 간 세로 구분선.
        return (
            '<div class="flex-1 min-w-0 py-sm px-md border-b lg:border-b-0 lg:border-r border-surface-border last:border-0">'
            f'<div class="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-xs">{rre.esc(label)}</div>'
            f'<div class="font-body-md text-body-md text-on-surface break-words">{value_html}</div></div>')

    body = (
        cell("국가명", f'{rre.esc(name_ko)} <span class="font-mono text-xs text-on-surface-variant">{rre.esc(base_code)}</span>')
        + cell("솔루션", rre.esc(solution))
        + cell("진출년도", rre.esc(since_str)))
    return (
        '<div>'
        '<h3 class="font-headline-md text-headline-md text-primary mb-sm flex items-center gap-sm">'
        '<span class="material-symbols-outlined text-secondary">star</span>권역 베이스라인 국가</h3>'
        '<div class="border border-surface-border rounded-lg bg-surface overflow-hidden flex flex-col lg:flex-row">'
        f'{body}</div></div>')


def _first_sentences(text, n=3):
    """산문에서 앞 n개 문장만 추출(리스트) — 마침표 뒤 공백 기준 분리(소수점·약어 영향 최소)."""
    import re
    parts = re.split(r"(?<=[.。])\s+", text.strip())
    parts = [p for p in parts if p]
    return parts[:n]


def insight_panel(data):
    """상단 우측 — 정성 종합 요약(overall_insight) 카드. 앞 5문장을 불릿으로 표시. 없으면 매력도 상위 지표 폴백."""
    sentences = _first_sentences((data.get("overall_insight") or "").strip(), 5)
    if sentences:
        bullets = "".join(
            '<li class="flex gap-sm py-[2px] first:pt-0">'
            '<span class="w-1.5 h-1.5 rounded-full bg-secondary mt-[8px] shrink-0"></span>'
            f'<span class="font-body-md text-body-md text-on-surface-variant leading-relaxed">{rre.esc(s)}</span></li>'
            for s in sentences)
        body = f'<ul class="flex flex-col gap-xs">{bullets}</ul>'
    else:
        picked = [it for it in data.get("items", [])
                  if it.get("axis") == "attractiveness" and it.get("role") == "score"][:5]
        if not picked:
            return ""
        lis = "".join(
            '<li class="flex items-baseline justify-between gap-md py-xs border-b border-surface-border last:border-0">'
            f'<span class="font-body-sm text-body-sm text-on-surface">{rre.esc(it["item"])}</span>'
            f'<span class="font-label-md text-label-md text-primary font-semibold whitespace-nowrap">{rre.esc(rre.fmt_value(it))}</span></li>'
            for it in picked)
        body = f'<ul class="flex flex-col">{lis}</ul>'
    # AI 인사이트 헤더 + 본문(패널 배경 없음) — 다른 섹션과 동일한 h3 스타일.
    return (
        '<h3 class="font-headline-md text-headline-md text-primary -mb-2 flex items-center gap-sm">'
        '<span class="material-symbols-outlined text-secondary">auto_awesome</span>AI 인사이트</h3>'
        + body)


def flag_cell(data):
    """국기 셀 — flag_url 있으면 사용, 없으면 국가코드(ISO-2) 기반 flagcdn URL 폴백, 그것도 없으면 코드 텍스트."""
    url = data.get("flag_url")
    if not url:
        code = (data.get("code") or "").strip().lower()
        if len(code) == 2 and code.isalpha():
            url = f"https://flagcdn.com/w320/{code}.png"
    if url:
        return f"background-image: url('{rre.esc(url)}'); background-size: cover; background-position: center;", ""
    return "", f'<span class="font-label-md text-label-md text-on-surface-variant">{rre.esc(data.get("code", ""))}</span>'


# ─────────────────────────────────────────────────────────────────────────────
# HTML 렌더
# ─────────────────────────────────────────────────────────────────────────────
def render_html(data):
    code = data.get("code", "")
    en = data.get("country", code)
    ko = data.get("country_ko", "")
    title = f"{ko}({en}) 국가 상세 — 진출 진단"  # 브라우저 탭 제목(PAGE_TITLE)

    with open(TPL_PATH, encoding="utf-8") as f:
        tpl = f.read()

    return (tpl
            .replace("{{PAGE_TITLE}}", rre.esc(title))
            .replace("{{CHARTS}}", charts(data))
            .replace("{{COMPETITORS}}", competitors_table(data))
            .replace("{{INSIGHT_PANEL}}", insight_panel(data) + baseline_panel(data)))


# ─────────────────────────────────────────────────────────────────────────────
# 입출력
# ─────────────────────────────────────────────────────────────────────────────
def load_detail(code, version=None):
    datadir = os.path.join(DATA, "research", "country", code)
    if version:
        path = os.path.join(datadir, f"{code}_{version}.json")
    else:
        path = os.path.join(datadir, f"{code}_latest.json")
    if not os.path.exists(path):
        cand = sorted(glob.glob(os.path.join(datadir, f"{code}_*.json")))
        if not cand:
            raise SystemExit(f"[안내] country '{code}' 리서치 데이터 없음 — data/research/country/{code}/ 확인 필요.")
        path = cand[-1]
    with open(path, encoding="utf-8") as f:
        return json.load(f), path


def render(code="ES", version=None):
    data, src = load_detail(code, version)
    out_html = render_html(data)

    outdir = os.path.join(DETAIL, "country", code, "html")
    os.makedirs(outdir, exist_ok=True)
    # 메인 화면에서 생성할 때마다 다음 순번(DTL_<CODE>_nnn.html)을 부여 — 기존 개수 기준
    existing = glob.glob(os.path.join(outdir, f"DTL_{code}_*.html"))
    seq = len(existing) + 1
    out = os.path.join(outdir, f"DTL_{code}_{seq:03d}.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(out_html)

    print(f"[{code}] 상세화면 렌더 완료 — 입력 {os.path.relpath(src, STORAGE)}")
    print(f"  항목 {len(data.get('items', []))}개")
    print(f"→ {os.path.relpath(out, STORAGE)}")
    return out


if __name__ == "__main__":
    args = sys.argv[1:]
    code = args[0] if args else "ES"
    version = args[1] if len(args) > 1 else None
    render(code, version)
