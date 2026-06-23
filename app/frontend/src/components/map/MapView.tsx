// MapView(C4, FR-2.2·2.3) — AISea 평면 인터랙티브 지도(드래그/줌/포커스/마커/범례) + 상단바.
// 마커=카탈로그 API + world atlas 정적 지오데이터(Q7=A). 좌표 매칭은 간이 lon/lat 테이블.
// AISea 블루 펄스 마커 + 옅은 매력도 톤 채색. (레이아웃 탭/플로팅 패널은 제거.)
import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { feature } from 'topojson-client'
import worldData from 'world-atlas/countries-110m.json'
import type { Topology } from 'topojson-specification'
import { api } from '../../api/client'
import type { CountrySummary, RegionSummary } from '../../api/types'
import { store, useStore } from '../../store'
import { TopBar } from './TopBar'
import { Legend } from './Legend'
import { COUNTRY_COORDS, COUNTRY_NUMERIC, REGION_COUNTRY_NAMES } from './coords'

interface Props {
  onSelectCountry: (code: string) => void
  onSelectRegion: (region: string) => void
  /** 인트로 지구본 → 지도 줌인 모핑 진입 여부(App에서 전달). reduced-motion이면 false. */
  enterAnim?: boolean
}

interface Marker {
  code: string
  name: string
  nameKo?: string
  lon: number
  lat: number
  status: 'active' | 'planned'
}

// 권역 코드 → 영문 대문자 표시명(hover 툴팁용).
const REGION_EN: Record<string, string> = {
  EU: 'EUROPE',
  NORTH_AMERICA: 'NORTH AMERICA',
  SOUTH_AMERICA: 'SOUTH AMERICA',
  ASIA: 'ASIA-PACIFIC',
}

export function MapView({ onSelectCountry, onSelectRegion, enterAnim = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<{
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
    zoom: d3.ZoomBehavior<SVGSVGElement, unknown>
  } | null>(null)
  const [countries, setCountries] = useState<CountrySummary[]>([])
  const [regions, setRegions] = useState<RegionSummary[]>([])
  const [notif, setNotif] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lang = useStore((s) => s.lang)
  const langRef = useRef(lang)
  langRef.current = lang
  // hover 툴팁(권역 영문 대문자 / 국가명) — 화면 좌표 기준 HTML 오버레이
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)

  useEffect(() => {
    Promise.all([api.getCountries(), api.getRegions()])
      .then(([c, r]) => {
        setCountries(c)
        setRegions(r)
      })
      .catch((e) => setError(String(e)))
  }, [])

  const markers = useMemo<Marker[]>(
    () =>
      countries
        .map((c) => {
          const coord = COUNTRY_COORDS[c.code]
          if (!coord) return null
          // 진출(active) = 보고서 보유(has_report) 또는 기준국 / 그 외 = 진출예정(planned)
          const status: Marker['status'] = c.is_baseline || c.has_report ? 'active' : 'planned'
          const m: Marker = {
            code: c.code,
            name: c.name,
            nameKo: c.name_ko ?? undefined,
            lon: coord[0],
            lat: coord[1],
            status,
          }
          return m
        })
        .filter((m): m is Marker => m !== null),
    [countries],
  )

  // 국가명 → 권역코드(대륙 전체). 권역 단위 하이라이트/클릭 영역용.
  // 정의된 모든 권역(REGION_COUNTRY_NAMES)을 표시하되, 진출/미진출은 enteredRegions로 구분한다.
  const regionByName = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const reg of Object.keys(REGION_COUNTRY_NAMES)) {
      for (const name of REGION_COUNTRY_NAMES[reg]) out[name] = reg
    }
    return out
  }, [])

  // 진출 권역 = 보고서 보유국이 속한 권역(country.region). 그 외 정의 권역은 미진출.
  const enteredRegions = useMemo<Set<string>>(() => {
    const s = new Set<string>()
    for (const c of countries) if (c.region && c.has_report) s.add(c.region)
    return s
  }, [countries])

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current)
    svg.selectAll('*').remove()
    const width = 960
    const height = 500

    // 코드 → 진출 상태(진출국 색칠용). world-atlas numeric id로 역참조.
    const numericToCountry: Record<string, CountrySummary> = {}
    for (const c of countries) {
      const num = COUNTRY_NUMERIC[c.code]
      if (num) numericToCountry[num] = c
    }

    // AISea 톤 — 육지 채색(fake 점수 대신 실제 상태에 매핑).
    //  진출 권역 → 골드 베이지(진함) / 미진출 권역 → 옅은 베이지(은은) / 권역 외 진출국 → 안정 녹색 / 그 외 → 기본 탄색.
    const TONE = {
      active: '#D7E2DC', // 권역에 속하지 않은 진출국
      regionEntered: '#D6C29A', // 진출 권역
      regionPlanned: '#E7DEC8', // 미진출 권역(옅게)
      base: '#E2DDCF', // 일반 육지
    }
    const topo = worldData as unknown as Topology
    const countriesGeo = feature(topo, topo.objects.countries as never) as unknown as {
      features: GeoJSON.Feature[]
    }
    // 남극 제외 — 지도 하단이 잘려 보이지 않도록(AISea 동일). 투영을 viewBox에 맞춰 전체가 들어오게 fitExtent.
    countriesGeo.features = countriesGeo.features.filter(
      (f) => (f.properties as { name?: string } | undefined)?.name !== 'Antarctica',
    )
    const fc = { type: 'FeatureCollection', features: countriesGeo.features } as GeoJSON.FeatureCollection
    const projection = d3
      .geoNaturalEarth1()
      .fitExtent(
        [
          [12, 8],
          [width - 12, height - 8],
        ],
        fc as never,
      )

    const g = svg.append('g')
    const path = d3.geoPath(projection)

    // hover 툴팁 위치 계산 — SVG 컨테이너 기준 화면 좌표.
    const showTip = (e: MouseEvent, text: string) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, text })
    }
    // 마커 툴팁 라벨 — 한/영 토글에 따라 국가명 표시(한글 없으면 영문 폴백).
    const markerLabel = (d: Marker): string =>
      langRef.current === 'ko' ? d.nameKo ?? d.name : d.name

    const featureName = (d: GeoJSON.Feature): string =>
      String((d.properties as { name?: string } | undefined)?.name ?? '')

    const regionGroups = new Map<string, GeoJSON.Feature[]>()
    const landFill = (d: GeoJSON.Feature): string => {
      const reg = regionByName[featureName(d)]
      if (reg) return enteredRegions.has(reg) ? TONE.regionEntered : TONE.regionPlanned
      const c = numericToCountry[String((d as { id?: string }).id ?? '')]
      if (c?.has_report) return TONE.active
      return TONE.base
    }

    // 육지 폴리곤은 정적 채색만(개별 국가 hover/click 없음).
    // 국가 진입은 오직 마커 클릭, 화면 hover/클릭은 권역 단위(아래 region-overlay)가 담당.
    g.selectAll('path.land')
      .data(countriesGeo.features)
      .join('path')
      .attr('class', 'land')
      .attr('d', path as never)
      .attr('fill', (d) => {
        const reg = regionByName[featureName(d)]
        if (reg) {
          const arr = regionGroups.get(reg) ?? []
          arr.push(d)
          regionGroups.set(reg, arr)
        }
        return landFill(d)
      })
      .attr('stroke', '#F4F6F8')
      .attr('stroke-width', 0.6)

    // 권역 외곽선(merge) — 클릭 영역 + 강조. 진출=실선/진한 테두리, 미진출=점선/옅은 테두리.
    for (const [reg, feats] of regionGroups) {
      const entered = enteredRegions.has(reg)
      const fc = { type: 'FeatureCollection', features: feats } as GeoJSON.FeatureCollection
      const overlay = g
        .append('path')
        .datum(fc as never)
        .attr('class', 'region-overlay')
        .attr('d', path as never)
        .attr('fill', entered ? '#C9A875' : '#CBBC97')
        .attr('fill-opacity', 0.0)
        .attr('stroke', entered ? '#B89A66' : '#C2B492')
        .attr('stroke-width', 1.3)
        .attr('stroke-opacity', entered ? 0.6 : 0.45)
        .attr('cursor', 'pointer')
        .attr('role', 'button')
        .attr('aria-label', `${reg} 권역 선택${entered ? '' : ' (미진출)'}`)
        .on('mouseenter', function (e: MouseEvent) {
          d3.select(this).attr('fill-opacity', 0.16)
          showTip(e, REGION_EN[reg] ?? reg.toUpperCase())
        })
        .on('mousemove', (e: MouseEvent) => showTip(e, REGION_EN[reg] ?? reg.toUpperCase()))
        .on('mouseleave', function () {
          d3.select(this).attr('fill-opacity', 0.0)
          setTip(null)
        })
        .on('click', () => {
          setNotif(false)
          onSelectRegion(reg)
        })
      if (!entered) overlay.attr('stroke-dasharray', '4,3')
    }

    // 마커 — AISea 블루 펄스 링 + 흰 점
    const node = g
      .selectAll('g.marker')
      .data(markers)
      .join('g')
      .attr('class', 'marker')
      .attr(
        'transform',
        (d) => `translate(${projection([d.lon, d.lat])?.[0] ?? 0},${projection([d.lon, d.lat])?.[1] ?? 0})`,
      )
      .attr('cursor', 'pointer')
      .attr('role', 'button')
      .attr('aria-label', (d) => `${d.name} 선택`)
      .on('mouseenter', (e: MouseEvent, d) => showTip(e, markerLabel(d)))
      .on('mousemove', (e: MouseEvent, d) => showTip(e, markerLabel(d)))
      .on('mouseleave', () => setTip(null))
      .on('click', (_e, d) => {
        setNotif(false)
        onSelectCountry(d.code)
      })

    // 펄스 링 — 진출국(active)만 후광 펄스. 진출예정(planned)은 펄스 없음.
    node
      .filter((d) => d.status === 'active')
      .append('circle')
      .attr('r', 4)
      .attr('fill', '#3F6CB4')
      .style('transform-box', 'fill-box')
      .style('transform-origin', 'center')
      .style('animation', 'aisea-pulse 2.4s ease-out infinite')

    // 중심 점 — 진출국: 블루 채움 + 흰 테두리(꽉 찬 핀)
    node
      .filter((d) => d.status === 'active')
      .append('circle')
      .attr('r', 3)
      .attr('fill', '#3F6CB4')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.2)

    // 중심 점 — 진출예정: 흰 채움 + 블루 점선 테두리(빈 핀)로 구분
    node
      .filter((d) => d.status === 'planned')
      .append('circle')
      .attr('r', 3)
      .attr('fill', '#fff')
      .attr('stroke', '#3F6CB4')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '1.8,1.4')

    // 줌/패닝(1~6배) — translateExtent로 지도 영역 밖(공백)으로 끌려나가지 않게 제한.
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 6])
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .on('zoom', (e) => g.attr('transform', e.transform.toString()))
    svg.call(zoom)
    zoomRef.current = { svg, zoom }

    // ── 진입 모핑: 큰 배율 → 1배 수렴 ──
    if (enterAnim) {
      const cx = width / 2
      const cy = height / 2
      const start = d3.zoomIdentity.translate(cx, cy).scale(3.4).translate(-cx, -cy)
      svg.call(zoom.transform, start)
      svg
        .transition()
        .duration(1100)
        .ease(d3.easeCubicOut)
        .call(zoom.transform, d3.zoomIdentity)
    }
  }, [markers, regionByName, enteredRegions, onSelectCountry, onSelectRegion, enterAnim])

  const zoomBy = (k: number) => {
    const z = zoomRef.current
    if (z) z.svg.transition().duration(300).call(z.zoom.scaleBy, k)
  }

  return (
    <div
      className="relative h-full w-full"
      style={{ background: 'radial-gradient(120% 120% at 50% 0%, #f7f8fa 0%, #ebeef1 100%)' }}
    >
      <TopBar
        countries={countries}
        regions={regions}
        onMap
        onGoMap={() => {
          window.location.hash = '#/'
          setNotif(true)
        }}
      />

      <svg
        ref={svgRef}
        viewBox="0 0 960 500"
        className="h-full w-full"
        aria-label="세계 지도"
      />

      {/* hover 툴팁 — 권역 영문 대문자 / 국가명(한·영) */}
      {tip && (
        <div
          className="pointer-events-none absolute z-chrome -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-lg bg-primary-container px-sm py-xs font-label-md text-label-md font-semibold text-on-primary shadow-[0_6px_18px_rgba(20,23,28,0.24)]"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </div>
      )}

      {/* 안내 칩(AISea) — 텍스트 + 챗봇 열기 링크 (헤더 아래로 충분히 내림) */}
      {notif && (
        <div className="absolute left-1/2 top-[128px] z-chrome flex -translate-x-1/2 items-center gap-sm rounded-[14px] border border-surface-border bg-[rgba(255,255,255,0.92)] px-md py-sm shadow-[0_8px_28px_rgba(20,23,28,0.08)] backdrop-blur-[10px]">
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            진출 후보 시장을 지도에서 선택하거나
          </span>
          <button
            onClick={() => store.setChatOpen(true)}
            className="font-body-sm text-body-sm font-semibold text-primary transition-opacity hover:opacity-80"
          >
            AISea에게 물어보세요 →
          </button>
        </div>
      )}

      {/* 줌 + 범례 */}
      <div className="absolute bottom-lg right-lg z-chrome flex flex-col gap-sm">
        <button
          onClick={() => zoomBy(1.4)}
          aria-label="확대"
          className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-surface-border bg-surface-container-lowest text-[19px] text-on-surface-variant shadow-[0_4px_14px_rgba(20,23,28,0.07)]"
        >
          +
        </button>
        <button
          onClick={() => zoomBy(0.7)}
          aria-label="축소"
          className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-surface-border bg-surface-container-lowest text-[21px] text-on-surface-variant shadow-[0_4px_14px_rgba(20,23,28,0.07)]"
        >
          −
        </button>
      </div>
      <Legend />

      {error && (
        <div className="absolute inset-x-0 bottom-0 z-chrome bg-error-container p-sm text-center font-body-sm text-body-sm text-on-error-container">
          데이터를 불러오지 못했습니다. 백엔드가 실행 중인지 확인하세요.
        </div>
      )}
    </div>
  )
}
