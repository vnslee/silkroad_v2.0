#!/usr/bin/env python3
"""상세화면/보고서 공유 표현·차트·포맷 헬퍼 모듈.

삭제된 region_report_rendering_engine.py 에 인라인돼 있던 범용 헬퍼를
detail 렌더러(country/region)가 재사용할 수 있도록 분리한 순수 헬퍼 모듈.
계산/스키마 의존 없이 표현(esc·fmt_value·차트·badge·score_color 등)만 담당한다.
detail 엔진은 이 모듈을 `import render_helpers as rre` 로 사용한다.
"""
import html
import datetime

# ─────────────────────────────────────────────────────────────────────────────
# AISea 디자인 토큰 (단일 소스)
#   디자인 SoT: architecture/design/AISea/AISea.dc.html
#   브랜드 블루 #3F6CB4 / 다크섹션 #101622~#1F2D45 / 신호색 그린·앰버·레드 / Pretendard + Space Grotesk
#   4개 렌더러(country/region × report/detail)가 이 토큰을 공유한다(import render_helpers as rre).
# ─────────────────────────────────────────────────────────────────────────────
AISEA = {
    # 브랜드
    "blue":        "#3F6CB4",   # 액션·강조·데이터 시각화
    "blue_hover":  "#4B79C2",
    "blue_light":  "#6E97D6",
    "blue_dim":    "#2C4C86",
    "blue_pale":   "#8FA0BD",
    # 딥 섹션(히어로/리포트 헤더/탭 active)
    "ink":         "#101622",
    "ink2":        "#1F2D45",
    "marker_navy": "#1B3451",
    # 신호색
    "ok":          "#4F8A6D",   # 안정/성공
    "ok_light":    "#7FD3A6",
    "warn":        "#C08A2E",   # 보통/경고
    "warn_light":  "#E8C173",
    "bad":         "#C0533F",   # 주의/위험
    "bad_light":   "#E89380",
    # 중립·텍스트
    "muted":       "#9AA0A8",   # 비활성·라벨
    "ink_text":    "#14171C",   # 본문 텍스트
    "text2":       "#3B3F46",   # 보조 텍스트(진한)
    "text3":       "#6B7280",   # 보조 텍스트(연한)
    # 보더·배경
    "border":      "#E6E9EC",
    "border2":     "#EEF0F2",
    "surface":     "#F7F8FA",   # 콘텐츠 배경
    "app":         "#EEF0F2",   # 앱셸 배경
    "card":        "#ffffff",
    # 배지 연한 bg
    "ok_bg":       "#E9F3EE",
    "info_bg":     "#EAF0F8",
    "warn_bg":     "#FBF3E2",
    "bad_bg":      "#F6E7E3",
    # 그림자 base(rgba 합성용)
    "shadow_rgb":  "20,23,28",
}

# Tailwind config `colors{}` (토큰 이름 → AISea hex).
# 토큰 이름은 기존(M3 파생)을 유지하고 값만 AISea로 remap → 본문 유틸 클래스(bg-primary 등) 손대지 않음.
TOKEN_CONFIG_COLORS = {
    "accent-red": AISEA["bad"],
    "surface-bright": AISEA["surface"],
    "on-primary-fixed-variant": AISEA["blue_dim"],
    "tertiary-fixed": AISEA["bad_bg"],
    "primary-fixed-dim": AISEA["blue_light"],
    "inverse-surface": AISEA["ink2"],
    "surface-container-lowest": AISEA["card"],
    "secondary": AISEA["blue"],
    "on-tertiary": "#ffffff",
    "on-primary": "#ffffff",
    "error": AISEA["bad"],
    "on-tertiary-fixed-variant": AISEA["bad"],
    "secondary-fixed": AISEA["info_bg"],
    "tertiary": AISEA["bad"],
    "inverse-primary": AISEA["blue_light"],
    "primary-container": AISEA["blue_dim"],
    "on-primary-container": AISEA["blue_pale"],
    "primary-fixed": AISEA["info_bg"],
    "on-secondary-container": AISEA["blue_dim"],
    "surface-dim": "#dbdad9",
    "surface-container-low": AISEA["surface"],
    "surface-border": AISEA["border"],
    "on-error": "#ffffff",
    "surface-container-highest": AISEA["border2"],
    "surface-container": AISEA["border2"],
    "secondary-fixed-dim": AISEA["blue_light"],
    "on-tertiary-fixed": AISEA["bad"],
    "surface-variant": AISEA["border2"],
    "on-tertiary-container": AISEA["bad_light"],
    "inverse-on-surface": AISEA["surface"],
    "outline": AISEA["muted"],
    "surface-light": AISEA["surface"],
    "text-secondary": AISEA["text2"],
    "on-primary-fixed": AISEA["ink"],
    "surface-tint": AISEA["blue"],
    "on-secondary-fixed": AISEA["ink"],
    "on-surface-variant": AISEA["text2"],
    "on-secondary-fixed-variant": AISEA["blue_dim"],
    "on-error-container": AISEA["bad"],
    "outline-variant": AISEA["border"],
    "text-disabled": AISEA["muted"],
    "secondary-container": AISEA["blue_light"],
    "tertiary-fixed-dim": AISEA["bad_light"],
    "on-secondary": "#ffffff",
    "background": AISEA["surface"],
    "error-container": AISEA["bad_bg"],
    "surface": AISEA["surface"],
    "on-background": AISEA["ink_text"],
    "text-primary": AISEA["ink_text"],
    "surface-container-high": AISEA["border2"],
    "primary": AISEA["ink"],
    "tertiary-container": AISEA["bad_bg"],
    "on-surface": AISEA["ink_text"],
}

_FONT = "Pretendard"
_MONO = "Space Grotesk"


def _font_family_tokens():
    fam = {k: [_FONT] for k in (
        "headline-md", "label-md", "headline-lg", "body-sm", "display-lg",
        "label-sm", "body-lg", "headline-lg-mobile", "body-md")}
    fam["mono"] = [_MONO, _FONT, "sans-serif"]
    return fam


def _font_size_tokens():
    return {
        "headline-md": ["24px", {"lineHeight": "32px", "fontWeight": "600"}],
        "label-md": ["12px", {"lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600"}],
        "headline-lg": ["32px", {"lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "700"}],
        "body-sm": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
        "display-lg": ["48px", {"lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
        "label-sm": ["11px", {"lineHeight": "14px", "fontWeight": "500"}],
        "body-lg": ["18px", {"lineHeight": "28px", "fontWeight": "400"}],
        "headline-lg-mobile": ["24px", {"lineHeight": "32px", "fontWeight": "700"}],
        "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
    }


def tailwind_config_block():
    """완성된 tailwind.config `<script>` 문자열 반환.

    f-string 렌더러에서 `{rre.tailwind_config_block()}` 단일 슬롯으로 삽입한다
    (JSON.dumps 결과라 `{{ }}` 이스케이프 불필요).
    """
    import json as _json
    theme = {
        "darkMode": "class",
        "theme": {"extend": {
            "colors": TOKEN_CONFIG_COLORS,
            "borderRadius": {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"},
            "spacing": {"sm": "8px", "margin-desktop": "48px", "gutter": "24px", "base": "4px",
                        "margin-mobile": "16px", "xl": "32px", "lg": "24px", "xs": "4px", "md": "16px"},
            "fontFamily": _font_family_tokens(),
            "fontSize": _font_size_tokens(),
        }},
    }
    return ('<script id="tailwind-config">\n        tailwind.config = '
            + _json.dumps(theme, ensure_ascii=False) + ';\n    </script>')


def head_links():
    """폰트/Material Symbols link 묶음 — Pretendard + Space Grotesk + Material Symbols."""
    return (
        '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"/>\n'
        '    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"/>\n'
        '    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>')


def body_font_css():
    return (f"body {{ font-family: '{_FONT}', system-ui, sans-serif; }}\n"
            f"        .mono, .font-mono {{ font-family: '{_MONO}', '{_FONT}', sans-serif; }}")


def esc(s):
    return html.escape("" if s is None else str(s))


def fmt_num(v):
    if isinstance(v, float):
        return f"{v:,.1f}".rstrip("0").rstrip(".") if v % 1 else f"{int(v):,}"
    if isinstance(v, int):
        return f"{v:,}"
    return str(v)


def fmt_value(it):
    """항목 value를 단위에 맞게 사람이 읽는 문자열로 변환."""
    v = it.get("value")
    unit = it.get("unit")
    if isinstance(v, list):
        return ", ".join(str(x) for x in v)
    if v is None:
        return "—"
    if isinstance(v, (int, float)):
        if unit == "%":
            return f"{fmt_num(v)}%"
        if isinstance(unit, str) and unit.endswith("_1to5"):
            return f"{v}/5"
        if unit == "days":
            return f"{fmt_num(v)}일"
        if unit == "units":
            return f"{fmt_num(v)}대"
        if isinstance(unit, str) and unit.endswith("_M"):
            return f"{fmt_num(v)} {unit[:-2]}M"
        return fmt_num(v)
    return str(v)


def fmt_dt(iso):
    try:
        s = iso.replace("Z", "+00:00")
        dt = datetime.datetime.fromisoformat(s)
        return dt.strftime("%Y-%m-%d %H:%M")
    except Exception:
        return iso or ""


def freshness_badge(fetched_at):
    """fetched_at 기준 신선도 신호등 (스키마 규칙 10): 🟢방금/🟡30일/🔴90일+."""
    if not fetched_at:
        return ""
    try:
        s = fetched_at.replace("Z", "+00:00")
        dt = datetime.datetime.fromisoformat(s)
        now = datetime.datetime.now(dt.tzinfo)
        days = (now - dt).days
    except Exception:
        return ""
    if days <= 30:
        c, t = AISEA["ok"], "🟢 최신"
    elif days <= 90:
        c, t = AISEA["warn"], f"🟡 {days}일 경과"
    else:
        c, t = AISEA["bad"], "🔴 재조사 권장"
    return badge(t, c + "1a", c)


# 사분면/신뢰도/게이트 색 토큰
QUAD_COLOR = {
    "즉시 진출": AISEA["ok"], "선별 진출": AISEA["blue"],
    "기회 탐색": AISEA["warn"], "JV/제휴 필요": AISEA["bad"],
}
CONF_COLOR = {"상": AISEA["ok"], "중": AISEA["warn"], "하": AISEA["bad"]}
GATE_COLOR = {"PASS": (AISEA["ok_bg"], AISEA["ok"]), "FLAG": (AISEA["warn_bg"], AISEA["warn"]),
              "FAIL": (AISEA["bad_bg"], AISEA["bad"])}


def badge(text, bg, fg):
    return (f'<span class="px-2 py-1 rounded-md font-label-sm text-label-sm '
            f'whitespace-nowrap" style="background:{bg};color:{fg}">{esc(text)}</span>')


def conf_badge(c):
    fg = CONF_COLOR.get(c, AISEA["text3"])
    return badge(f"신뢰도 {c}", fg + "1a", fg)


def gate_badge(result):
    bg, fg = GATE_COLOR.get(result, ("#eee", "#555"))
    return badge(result, bg, fg)


def score_color(v):
    """0-100 점수 → 신호색."""
    return AISEA["ok"] if v >= 70 else AISEA["blue"] if v >= 50 else AISEA["warn"] if v >= 35 else AISEA["bad"]


def bar(value, vmax=100, color=AISEA["blue"]):
    pct = 0 if not vmax else max(0, min(100, value / vmax * 100))
    return (f'<div class="w-full h-base bg-surface-border rounded-full overflow-hidden">'
            f'<div class="h-full rounded-full" style="width:{pct:.0f}%;background:{color}"></div></div>')


# ─────────────────────────────────────────────────────────────────────────────
# SVG 차트
# ─────────────────────────────────────────────────────────────────────────────
def vbar_chart(series, vmax=100, height=180, unit=""):
    """세로 막대 비교 차트. series=[(label, value, color)]."""
    if not series:
        return ""
    n = len(series)
    bw, gap, pad = 54, 28, 28
    w = pad * 2 + n * bw + (n - 1) * gap
    h = height
    base = h - 34
    top = 16
    bars = []
    for i, (label, val, color) in enumerate(series):
        x = pad + i * (bw + gap)
        bh = 0 if not vmax else max(2, (val / vmax) * (base - top))
        y = base - bh
        bars.append(
            f'<rect x="{x}" y="{y:.1f}" width="{bw}" height="{bh:.1f}" rx="4" fill="{color}"/>'
            f'<text x="{x+bw/2}" y="{y-6:.1f}" text-anchor="middle" font-size="13" '
            f'font-family="{_MONO}" font-weight="700" fill="{AISEA["ink_text"]}">{fmt_num(val)}{esc(unit)}</text>'
            f'<text x="{x+bw/2}" y="{base+18}" text-anchor="middle" font-size="12" '
            f'fill="{AISEA["text3"]}">{esc(label)}</text>')
    return (f'<svg viewBox="0 0 {w} {h}" class="w-full" style="max-height:{h}px" '
            f'preserveAspectRatio="xMidYMid meet">'
            f'<line x1="{pad-8}" y1="{base}" x2="{w-pad+8}" y2="{base}" '
            f'stroke="{AISEA["border"]}" stroke-width="1"/>{"".join(bars)}</svg>')


def quadrant_chart(rows):
    """매력도(x) × 난이도(y, 위쪽이 낮음) 사분면 버블. 버블=구축비, 색=퀵윈."""
    w, h, pad = 520, 380, 44
    x0, y0 = pad, 16
    x1, y1 = w - 16, h - pad
    def sx(a): return x0 + (a / 100) * (x1 - x0)
    def sy(d): return y0 + (d / 100) * (y1 - y0)  # 난이도 클수록 아래
    mx, my = sx(50), sy(50)
    builds = [r["cost"]["build"] for r in rows] or [1]
    bmax = max(builds) or 1
    pts = []
    for r in rows:
        a, d = r["attractiveness"], r["difficulty"]
        cx, cy = sx(a), sy(d)
        rad = 9 + (r["cost"]["build"] / bmax) * 17
        col = AISEA["blue"] if r["quick_win"] else AISEA["muted"]
        pts.append(
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{rad:.1f}" fill="{col}" '
            f'fill-opacity="0.78" stroke="#fff" stroke-width="2"/>'
            f'<text x="{cx:.1f}" y="{cy+4:.1f}" text-anchor="middle" font-size="12" '
            f'font-family="{_MONO}" font-weight="700" fill="#fff">{esc(r["code"])}</text>')
    # 사분면 라벨
    labels = [
        (sx(75), sy(25), "즉시 진출"), (sx(25), sy(25), "기회 탐색"),
        (sx(75), sy(78), "선별 진출"), (sx(25), sy(78), "JV/제휴 필요"),
    ]
    lab = "".join(f'<text x="{lx:.0f}" y="{ly:.0f}" text-anchor="middle" '
                  f'font-size="11" fill="{AISEA["muted"]}" font-weight="600">{esc(t)}</text>'
                  for lx, ly, t in labels)
    return (f'<svg viewBox="0 0 {w} {h}" class="w-full" preserveAspectRatio="xMidYMid meet">'
            f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="#fff" '
            f'stroke="{AISEA["border"]}"/>'
            f'<line x1="{mx:.0f}" y1="{y0}" x2="{mx:.0f}" y2="{y1}" stroke="{AISEA["border"]}" stroke-dasharray="4 4"/>'
            f'<line x1="{x0}" y1="{my:.0f}" x2="{x1}" y2="{my:.0f}" stroke="{AISEA["border"]}" stroke-dasharray="4 4"/>'
            f'{lab}{"".join(pts)}'
            f'<text x="{(x0+x1)/2:.0f}" y="{h-12}" text-anchor="middle" font-size="12" '
            f'fill="{AISEA["text3"]}">매력도 →</text>'
            f'<text x="14" y="{(y0+y1)/2:.0f}" text-anchor="middle" font-size="12" '
            f'fill="{AISEA["text3"]}" transform="rotate(-90 14 {(y0+y1)/2:.0f})">← 진입난이도(낮을수록 위)</text>'
            f'</svg>')


def line_chart(history, forecast, color=AISEA["blue"]):
    """시계열 라인차트(실적+전망). history/forecast=[{year,value}]."""
    pts_all = (history or []) + (forecast or [])
    if len(pts_all) < 2:
        return ""
    w, h, pad = 300, 96, 8
    xs = [p["year"] for p in pts_all]
    ys = [p["value"] for p in pts_all]
    xmin, xmax = min(xs), max(xs)
    ymin, ymax = min(ys), max(ys)
    def X(x): return pad + (0 if xmax == xmin else (x - xmin) / (xmax - xmin)) * (w - 2 * pad)
    def Y(y): return (h - pad) - (0 if ymax == ymin else (y - ymin) / (ymax - ymin)) * (h - 2 * pad)
    def path(pp): return " ".join(("M" if i == 0 else "L") + f"{X(p['year']):.1f} {Y(p['value']):.1f}"
                                  for i, p in enumerate(pp))
    segs = []
    if history:
        segs.append(f'<path d="{path(history)}" fill="none" stroke="{color}" stroke-width="2"/>')
    if forecast:
        link = [history[-1]] + forecast if history else forecast
        segs.append(f'<path d="{path(link)}" fill="none" stroke="{color}" '
                    f'stroke-width="2" stroke-dasharray="4 3" opacity="0.6"/>')
    dots = "".join(f'<circle cx="{X(p["year"]):.1f}" cy="{Y(p["value"]):.1f}" r="2" fill="{color}"/>'
                   for p in pts_all)
    return (f'<svg viewBox="0 0 {w} {h}" class="w-full" style="max-height:96px">'
            f'{"".join(segs)}{dots}</svg>')


# 여러 시계열을 한 패널에 색만 다르게 겹쳐 그린다(추세 비교용).
# 단위가 서로 다를 수 있으므로 각 시리즈를 자기 min/max로 0~1 정규화한다 — 절대값이 아니라 추세를 비교.
MULTI_LINE_PALETTE = [AISEA["blue"], AISEA["blue_dim"], AISEA["ok"], AISEA["warn"],
                      AISEA["blue_light"], AISEA["bad"]]


def multi_line_chart(series, height=160):
    """series=[{name, color?, history, forecast}] → 색 구분 + 범례 포함 단일 SVG.

    각 시리즈는 자체 정규화(추세 비교). 실적=실선, 전망=점선.
    """
    series = [s for s in series if len((s.get("history") or []) + (s.get("forecast") or [])) >= 2]
    if not series:
        return ""
    w, h, pad = 320, height, 10
    # x축은 전체 시리즈 공통 연도 범위로 정렬
    all_years = [p["year"] for s in series for p in (s.get("history") or []) + (s.get("forecast") or [])]
    xmin, xmax = min(all_years), max(all_years)

    def X(x):
        return pad + (0 if xmax == xmin else (x - xmin) / (xmax - xmin)) * (w - 2 * pad)

    segs, dots, legend = [], [], []
    for i, s in enumerate(series):
        color = s.get("color") or MULTI_LINE_PALETTE[i % len(MULTI_LINE_PALETTE)]
        hist = s.get("history") or []
        fc = s.get("forecast") or []
        pts = hist + fc
        ys = [p["value"] for p in pts]
        ymin, ymax = min(ys), max(ys)

        def Y(y, ymin=ymin, ymax=ymax):
            return (h - pad) - (0 if ymax == ymin else (y - ymin) / (ymax - ymin)) * (h - 2 * pad)

        def path(pp):
            return " ".join(("M" if j == 0 else "L") + f"{X(p['year']):.1f} {Y(p['value']):.1f}"
                            for j, p in enumerate(pp))
        if hist:
            segs.append(f'<path d="{path(hist)}" fill="none" stroke="{color}" stroke-width="2"/>')
        if fc:
            link = [hist[-1]] + fc if hist else fc
            segs.append(f'<path d="{path(link)}" fill="none" stroke="{color}" '
                        f'stroke-width="2" stroke-dasharray="4 3" opacity="0.6"/>')
        dots.append("".join(f'<circle cx="{X(p["year"]):.1f}" cy="{Y(p["value"]):.1f}" r="2" fill="{color}"/>'
                            for p in pts))
        legend.append(
            '<span class="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">'
            f'<span style="display:inline-block;width:10px;height:2px;background:{color}"></span>'
            f'{esc(s.get("name", ""))}</span>')

    svg = (f'<svg viewBox="0 0 {w} {h}" class="w-full" style="max-height:{height}px">'
           f'{"".join(segs)}{"".join(dots)}</svg>')
    legend_html = f'<div class="flex flex-wrap gap-x-md gap-y-xs mt-sm">{"".join(legend)}</div>'
    return svg + legend_html


# ─────────────────────────────────────────────────────────────────────────────
# 기여도 분해 (누적 수평 막대) — *_contributions[].weighted 표현
#   막대 길이 = 해당 축 점수(0~100), 색 구간 = 항목별 가중 기여(weighted).
#   계산은 하지 않고 리포트가 이미 박아둔 weighted를 그대로 쌓는다.
# ─────────────────────────────────────────────────────────────────────────────
CONTRIB_PALETTE = [AISEA["blue"], AISEA["blue_dim"], AISEA["blue_light"], AISEA["blue_pale"],
                   AISEA["ok"], AISEA["ok_light"], AISEA["warn"], AISEA["warn_light"],
                   AISEA["bad"], AISEA["muted"]]


def _contrib_color_map(names):
    return {n: CONTRIB_PALETTE[i % len(CONTRIB_PALETTE)] for i, n in enumerate(names)}


def stacked_bar(segments, scale=100, height=16):
    """누적 수평 막대. segments=[(label, value, color)]. width%는 scale 기준."""
    parts = []
    for label, val, color in segments:
        if not val or val <= 0:
            continue
        wpct = max(0.0, min(100.0, val / scale * 100))
        parts.append(f'<div style="width:{wpct:.1f}%;background:{color}" '
                     f'title="{esc(label)}: {fmt_num(val)}" class="h-full"></div>')
    inner = "".join(parts) or '<div class="h-full w-0"></div>'
    return (f'<div class="flex w-full rounded-full overflow-hidden bg-surface-border" '
            f'style="height:{height}px">{inner}</div>')


def contribution_breakdown(rows, kind):
    """국가별 기여도 누적 막대 + 공유 범례.
    kind='attractiveness'|'difficulty'(business_contributions) | 'similarity'(it_contributions)."""
    if kind == "similarity":
        get_contribs = lambda r: r.get("it_contributions", [])
        keep = lambda c: True
    else:
        get_contribs = lambda r: r.get("business_contributions", [])
        keep = lambda c: c.get("axis") == kind
    # 항목명 union (등장 순서 유지, weighted>0만)
    names, seen = [], set()
    for r in rows:
        for c in get_contribs(r):
            if keep(c) and (c.get("weighted") or 0) > 0 and c["item"] not in seen:
                names.append(c["item"])
                seen.add(c["item"])
    if not names:
        return ""
    cmap = _contrib_color_map(names)

    bars = []
    for r in rows:
        segs, total = [], 0.0
        for c in get_contribs(r):
            if not keep(c):
                continue
            w = c.get("weighted") or 0
            if w <= 0:
                continue
            segs.append((c["item"], w, cmap.get(c["item"], AISEA["muted"])))
            total += w
        if not segs:
            continue
        bars.append(
            f'<div class="flex items-center gap-sm">'
            f'<span class="font-label-md text-label-md text-primary w-8 shrink-0">{esc(r["code"])}</span>'
            f'<div class="flex-1">{stacked_bar(segs)}</div>'
            f'<span class="font-label-md text-label-md text-primary w-10 text-right shrink-0">'
            f'{fmt_num(round(total, 1))}</span></div>')
    if not bars:
        return ""
    legend = "".join(
        f'<span class="flex items-center gap-xs font-label-sm text-label-sm text-text-secondary">'
        f'<span class="w-3 h-3 rounded-sm shrink-0" style="background:{cmap[n]}"></span>{esc(n)}</span>'
        for n in names)
    return (f'<div class="flex flex-col gap-sm mb-md">{"".join(bars)}</div>'
            f'<div class="flex flex-wrap gap-md pt-sm border-t border-surface-border">{legend}</div>')


# ─────────────────────────────────────────────────────────────────────────────
# 공통 카드/섹션 헬퍼
# ─────────────────────────────────────────────────────────────────────────────
def card(inner, extra=""):
    return (f'<div class="bg-surface-container-lowest border border-surface-border rounded-lg '
            f'p-lg shadow-[0_4px_8px_rgba(20,23,28,0.04)] {extra}">{inner}</div>')


def section_title(t, sub=""):
    s = (f'<p class="font-body-sm text-body-sm text-on-surface-variant mt-xs">{esc(sub)}</p>'
         if sub else "")
    return f'<h2 class="font-headline-md text-headline-md text-primary m-0">{esc(t)}</h2>{s}'


