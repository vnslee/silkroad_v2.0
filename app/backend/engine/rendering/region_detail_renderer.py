#!/usr/bin/env python3
"""권역(region) 상세화면 렌더링 엔진 (P2)

- 권역 리서치 데이터(data/research/region/<REGION>/<REGION>_latest.json)를 입력으로 받아,
  웹 디자인 스펙(architecture/design/stitch/html/P2.html, "권역 정보")에 맞춘
  완성형 standalone HTML 상세화면으로 렌더링한다.
- 구성(스펙 §4 P2): 권역명 → KPI 카드 → 기진출 국가 리스트 →
  진출 예정국 quick-win 순위(유사도/난이도/종합점수) → 권역 차트.
- 데이터 주도(region-agnostic) — 어떤 권역 리서치 데이터든 동일 로직으로 렌더.
- 입력: data/research/region/<REGION>/<REGION>_latest.json
- 출력: detail/region/<REGION>/html/<REGION>_detail_<TS>.html

⚠️ 권역 리서치 데이터·스키마는 잠정(ROADMAP 2차에서 정식화). 상세는 storage/detail/README.md.
스코어링/계산은 일절 하지 않고 "표현"만 담당한다 (관심사 분리).
포맷·차트 헬퍼는 render_helpers(rre)을 재사용한다.
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

TPL_PATH = os.path.join(BASE, "templates", "region_detail_template.html")


# ─────────────────────────────────────────────────────────────────────────────
# 데이터 적응 (countries[] 스키마 → 상세화면 표현 구조)
#   권역 리서치 데이터는 countries[](국가별 items)만 담는다. 상세화면이 기대하는
#   kpis/entered_countries/candidate_countries/items 형태로 "매핑"한다(스코어 계산 없음 —
#   데이터에 있는 값만 골라 표현). 이미 kpis 등이 있으면 그대로 둔다(하위호환).
# ─────────────────────────────────────────────────────────────────────────────
def _item_value(country, item_name):
    """country.items 에서 item 이름이 일치하는 score 항목의 value 반환."""
    for it in country.get("items", []):
        if it.get("item") == item_name and isinstance(it.get("value"), (int, float)):
            return it.get("value"), it.get("unit", "")
    return None, ""


def _representative_items(country):
    """대표 시계열 지표(차트용) — score role + timeseries 있는 항목."""
    out = []
    for it in country.get("items", []):
        if it.get("role") == "score" and (it.get("timeseries") or {}):
            out.append(it)
    return out


def adapt_region_data(data):
    """countries[] → 상세화면 표현 구조로 매핑. 이미 매핑돼 있으면 그대로."""
    if data.get("kpis") or data.get("entered_countries") or data.get("candidate_countries"):
        return data  # 이미 표현 구조(하위호환)

    countries = data.get("countries", []) or []
    if not countries:
        return data

    baseline_code = data.get("baseline_country")
    entered, candidates = [], []
    for c in countries:
        is_base = c.get("is_baseline") or c.get("code") == baseline_code
        mkt_val, mkt_unit = _item_value(c, "오토금융/리스 시장규모")
        if mkt_val is None:
            mkt_val, mkt_unit = _item_value(c, "신차 판매대수")
        row = {
            "code": c.get("code", ""),
            "name_ko": c.get("country_ko", ""),
            "name_en": c.get("country", ""),
            "market": (mkt_val, mkt_unit),
            "insight": (c.get("overall_insight") or "")[:160],
        }
        if is_base:
            row["status"] = "기준국"
            row["solution"] = "기진출(베이스라인)"
            entered.append(row)
        else:
            candidates.append(row)

    # KPI 카드(데이터에 있는 사실만): 평가국 수·기준국·후보국 수
    kpis = [
        {"icon": "public", "label": "평가 대상국", "value": str(len(countries)), "note": f"{data.get('region_ko','')} 권역"},
        {"icon": "flag", "label": "기준국(베이스라인)", "value": baseline_code or "—", "note": "기진출 기준"},
        {"icon": "leaderboard", "label": "진출 후보국", "value": str(len(candidates)), "note": "신규 진단 대상"},
    ]

    adapted = dict(data)
    adapted["kpis"] = kpis
    adapted["entered_countries"] = entered
    adapted["candidate_countries"] = candidates
    # 차트: 기준국 대표 시계열(없으면 첫 국가)
    base_c = next((c for c in countries if c.get("is_baseline") or c.get("code") == baseline_code), countries[0])
    adapted["items"] = _representative_items(base_c)
    adapted["_chart_source"] = base_c.get("country_ko", base_c.get("code", ""))
    return adapted


# ─────────────────────────────────────────────────────────────────────────────
# 빌더
# ─────────────────────────────────────────────────────────────────────────────
def kpi_card(k):
    icon = k.get("icon", "insights")
    label = k.get("label", "")
    value = k.get("value", "—")
    note = k.get("note", "")
    # delta 배지 — trend에 따라 색·아이콘 분기(색만으로 의미 전달 금지: 화살표 아이콘 병행).
    #   up→success(개선), down→error(악화), 그 외→중립(text_secondary). KPI 방향성이
    #   "낮을수록 좋음"인 지표는 데이터의 trend가 이미 그 의미를 담는다는 전제.
    delta = k.get("delta")
    delta_html = ""
    if delta:
        trend = k.get("trend")
        if trend == "up":
            arrow, fg = "trending_up", rre.TOK["success"]
        elif trend == "down":
            arrow, fg = "trending_down", rre.TOK["error"]
        else:
            arrow, fg = "trending_flat", rre.TOK["text_secondary"]
        delta_html = (
            f'<span class="font-label-sm text-label-sm px-2 py-1 rounded flex items-center gap-[2px]" '
            f'style="color:{fg};background:{fg}1a">'
            f'<span class="material-symbols-outlined text-[12px]">{arrow}</span>{rre.esc(delta)}</span>')
    target = k.get("target")
    # value·target이 모두 수치면 불릿 차트(목표 대비)로 시각화 — charts.csv #18(AAA).
    # 수치 추출 불가(예: 'Low')면 텍스트 Target 표기로 폴백.
    bottom = ""
    bullet = ""
    if target and rre._to_number(value) is not None and rre._to_number(target) is not None:
        bullet = rre.bullet_chart(value, target, title=f"{label} 목표 대비")
    elif target:
        bottom = f'<span class="font-label-sm text-label-sm text-on-surface-variant">Target: {rre.esc(target)}</span>'
    elif note:
        bottom = f'<span class="font-label-sm text-label-sm text-on-surface-variant">{rre.esc(note)}</span>'
    # 불릿이 들어가면 카드 높이를 자동(min-h)으로 — 고정 120px는 차트 없는 카드에만.
    h_cls = "min-h-[120px]" if bullet else "h-[120px]"
    return (
        f'<div class="bg-surface rounded-lg p-md border border-surface-border custom-shadow-level-2 flex flex-col justify-between {h_cls}">'
        '<div class="flex justify-between items-start">'
        f'<span class="font-label-md text-label-md text-on-surface-variant">{rre.esc(label)}</span>'
        f'<span class="material-symbols-outlined text-secondary text-[20px]">{rre.esc(icon)}</span></div>'
        '<div class="flex items-end justify-between">'
        f'<span class="font-headline-md text-headline-md text-primary font-bold">{rre.esc(value)}</span>'
        f'{delta_html}</div>'
        f'{bullet}{bottom}</div>')


def kpi_cards(data):
    kpis = data.get("kpis", [])
    if not kpis:
        return ""
    return "".join(kpi_card(k) for k in kpis)


def entered_list(data):
    rows = data.get("entered_countries", [])
    if not rows:
        return ""
    body = "".join(
        '<tr class="border-b border-surface-border last:border-0 hover:bg-surface-variant transition-colors align-top">'
        f'<td class="p-sm font-mono text-xs text-on-surface">{rre.esc(r.get("code", ""))}</td>'
        f'<td class="p-sm text-on-surface whitespace-nowrap">{rre.esc(r.get("name_ko", ""))} '
        f'<span class="text-on-surface-variant">{rre.esc(r.get("name_en", ""))}</span></td>'
        f'<td class="p-sm">{rre.badge(r.get("status", "-"), "#e8f0fe", rre.TOK["info"])}</td>'
        f'<td class="p-sm text-right text-on-surface whitespace-nowrap font-semibold">{_fmt_market(r.get("market"))}</td>'
        '</tr>' for r in rows)
    return (
        '<div class="bg-surface rounded-lg p-lg border border-surface-border custom-shadow-level-2">'
        '<h3 class="font-headline-md text-[18px] leading-[24px] text-primary font-bold mb-md flex items-center gap-sm">'
        '<span class="material-symbols-outlined text-secondary text-[20px]">flag</span>기진출 국가(기준국)</h3>'
        '<table class="w-full text-left border-collapse font-body-sm text-body-sm">'
        '<thead><tr class="bg-surface-light border-b border-surface-border">'
        '<th class="p-sm font-label-md text-label-md text-outline font-semibold">Code</th>'
        '<th class="p-sm font-label-md text-label-md text-outline font-semibold">국가</th>'
        '<th class="p-sm font-label-md text-label-md text-outline font-semibold">상태</th>'
        '<th class="p-sm font-label-md text-label-md text-outline font-semibold text-right">시장규모</th>'
        f'</tr></thead><tbody>{body}</tbody></table></div>')


def _fmt_market(market):
    """(value, unit) → 사람이 읽는 시장규모 문자열."""
    val, unit = market if isinstance(market, tuple) else (None, "")
    if val is None:
        return "—"
    if unit == "EUR_M":
        return f"€{rre.fmt_num(val)}M"
    if unit == "units":
        return f"{rre.fmt_num(val)}대"
    return f"{rre.fmt_num(val)} {rre.esc(unit)}".strip()


def quickwin_table(data):
    """진출 예정국 목록 — 대표 시장규모 + 핵심 인사이트(스코어 계산 없이 데이터 표현)."""
    rows = data.get("candidate_countries", [])
    if not rows:
        return ""
    body = "".join(
        '<tr class="border-b border-surface-border last:border-0 hover:bg-surface-variant transition-colors align-top">'
        f'<td class="p-sm text-on-surface whitespace-nowrap font-medium">{rre.esc(r.get("name_ko", ""))} '
        f'<span class="font-mono text-xs text-on-surface-variant">{rre.esc(r.get("code", ""))}</span></td>'
        f'<td class="p-sm text-right text-on-surface whitespace-nowrap font-semibold">{_fmt_market(r.get("market"))}</td>'
        f'<td class="p-sm text-on-surface-variant">{rre.esc(r.get("insight", "") or "—")}</td>'
        '</tr>' for r in rows)
    return (
        '<div class="bg-surface rounded-lg p-lg border border-surface-border custom-shadow-level-2">'
        '<h3 class="font-headline-md text-[18px] leading-[24px] text-primary font-bold mb-md flex items-center gap-sm">'
        '<span class="material-symbols-outlined text-secondary text-[20px]">leaderboard</span>진출 후보국</h3>'
        '<table class="w-full text-left border-collapse font-body-sm text-body-sm">'
        '<thead><tr class="bg-surface-light border-b border-surface-border">'
        '<th class="p-sm font-label-md text-label-md text-outline font-semibold">국가</th>'
        '<th class="p-sm font-label-md text-label-md text-outline font-semibold text-right">시장규모</th>'
        '<th class="p-sm font-label-md text-label-md text-outline font-semibold">핵심 인사이트</th>'
        f'</tr></thead><tbody>{body}</tbody></table></div>')


def perf_chart(data):
    """권역 시계열 지표 차트 카드."""
    blocks = []
    for it in data.get("items", []):
        ts = it.get("timeseries") or {}
        unit = it.get("unit") if isinstance(it.get("unit"), str) and it.get("unit") == "%" else ""
        svg = rre.line_chart(ts.get("history"), ts.get("forecast"),
                             unit=unit, title=rre.esc(it["item"]) + " 추이")
        if not svg:
            continue
        val = rre.fmt_value(it) if it.get("value") is not None else ""
        blocks.append(
            '<div class="bg-surface rounded-lg p-lg border border-surface-border custom-shadow-level-2 flex flex-col">'
            '<div class="flex justify-between items-center mb-md">'
            f'<h3 class="font-headline-md text-[18px] leading-[24px] text-primary font-bold">{rre.esc(it["item"])}</h3>'
            f'<span class="font-label-sm text-label-sm text-secondary bg-secondary-fixed px-2 py-0.5 rounded">{rre.esc(val)}</span></div>'
            f'<div class="w-full">{svg}</div>'
            + (f'<p class="font-body-sm text-body-sm text-on-surface-variant mt-md">{rre.esc(it.get("insight",""))}</p>' if it.get("insight") else "")
            + '</div>')
    if not blocks:
        return ""
    return '<div class="grid grid-cols-1 md:grid-cols-2 gap-md">' + "".join(blocks) + "</div>"


# ─────────────────────────────────────────────────────────────────────────────
# HTML 렌더
# ─────────────────────────────────────────────────────────────────────────────
def render_html(data):
    data = adapt_region_data(data)  # countries[] → 표현 구조 매핑
    code = data.get("code", "")
    en = data.get("region", code)
    ko = data.get("region_ko", "")
    title = f"{ko}({en}) 권역 상세 — 진출 진단"
    footer = (f"리서치 데이터 — {rre.esc(code)} · schema v{rre.esc(data.get('schema_version', '-'))} · "
              f"조사 {rre.esc(rre.fmt_dt(data.get('fetched_at', '')))} {rre.freshness_badge(data.get('fetched_at', ''))}")

    with open(TPL_PATH, encoding="utf-8") as f:
        tpl = f.read()

    return (tpl
            .replace("{{PAGE_TITLE}}", rre.esc(title))
            .replace("{{REGION_EN}}", rre.esc(en))
            .replace("{{REGION_KO}}", rre.esc(ko))
            .replace("{{KPI_CARDS}}", kpi_cards(data))
            .replace("{{ENTERED_LIST}}", entered_list(data))
            .replace("{{QUICKWIN_TABLE}}", quickwin_table(data))
            .replace("{{PERF_CHART}}", perf_chart(data))
            .replace("{{FOOTER_META}}", footer))


# ─────────────────────────────────────────────────────────────────────────────
# 입출력
# ─────────────────────────────────────────────────────────────────────────────
def load_detail(region, version=None):
    datadir = os.path.join(DATA, "research", "region", region)
    if version:
        path = os.path.join(datadir, f"{region}_{version}.json")
    else:
        path = os.path.join(datadir, f"{region}_latest.json")
    if not os.path.exists(path):
        cand = sorted(glob.glob(os.path.join(datadir, f"{region}_*.json")))
        if not cand:
            raise SystemExit(f"[안내] region '{region}' 리서치 데이터 없음 — data/research/region/{region}/ 확인 필요 (잠정 스키마, README 참조).")
        path = cand[-1]
    with open(path, encoding="utf-8") as f:
        return json.load(f), path


def render(region="EU", version=None):
    data, src = load_detail(region, version)
    data = adapt_region_data(data)  # 카운트 로그·렌더 동일 데이터 사용
    out_html = render_html(data)

    outdir = os.path.join(DETAIL, "region", region, "html")
    os.makedirs(outdir, exist_ok=True)
    ts = (data.get("fetched_at") or "latest").replace(":", "").replace("+", "_")
    out = os.path.join(outdir, f"{region}_detail_{ts}.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(out_html)

    print(f"[{region}] 권역 상세화면 렌더 완료 — 입력 {os.path.relpath(src, STORAGE)}")
    print(f"  KPI {len(data.get('kpis', []))}개 · 기진출 {len(data.get('entered_countries', []))}개 · 후보 {len(data.get('candidate_countries', []))}개")
    print(f"→ {os.path.relpath(out, STORAGE)}")
    return out


if __name__ == "__main__":
    args = sys.argv[1:]
    region = args[0] if args else "EU"
    version = args[1] if len(args) > 1 else None
    render(region, version)
