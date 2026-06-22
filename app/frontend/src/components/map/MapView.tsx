// MapView(C4, FR-2.2·2.3) — 평면 인터랙티브 지도(드래그/줌/포커스/마커/범례) + 상단바·Notification·챗봇 버튼 슬롯.
// 마커=카탈로그 API + world atlas 정적 지오데이터(Q7=A). 좌표 매칭은 간이 lon/lat 테이블.
import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { feature } from 'topojson-client'
import worldData from 'world-atlas/countries-110m.json'
import type { Topology } from 'topojson-specification'
import { api } from '../../api/client'
import type { CountrySummary, RegionSummary } from '../../api/types'
import { TopBar } from './TopBar'
import { Legend } from './Legend'
import { Notification } from './Notification'
import { COUNTRY_COORDS } from './coords'

interface Props {
  onSelectCountry: (code: string) => void
  onSelectRegion: (region: string) => void
}

interface Marker {
  code: string
  name: string
  lon: number
  lat: number
  status: 'active' | 'planned'
}

export function MapView({ onSelectCountry, onSelectRegion }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [countries, setCountries] = useState<CountrySummary[]>([])
  const [regions, setRegions] = useState<RegionSummary[]>([])
  const [notif, setNotif] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          const status: Marker['status'] =
            c.is_baseline || c.has_detail || c.has_report ? 'active' : 'planned'
          return { code: c.code, name: c.name, lon: coord[0], lat: coord[1], status }
        })
        .filter((m): m is Marker => m !== null),
    [countries],
  )

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current)
    svg.selectAll('*').remove()
    const width = 960
    const height = 500
    const projection = d3
      .geoNaturalEarth1()
      .scale(170)
      .translate([width / 2, height / 2])

    const g = svg.append('g')
    const path = d3.geoPath(projection)

    // 육지(국가 폴리곤) 렌더 — 라이트 테마(육지 primary-fixed, 경계 outline). mockup 톤.
    const topo = worldData as unknown as Topology
    const countries = feature(topo, topo.objects.countries as never) as unknown as {
      features: GeoJSON.Feature[]
    }
    g.append('path')
      .datum({ type: 'Sphere' } as never)
      .attr('d', path as never)
      .attr('fill', '#eef2fb') // 바다(primary-fixed 계열 옅게)
    g.selectAll('path.land')
      .data(countries.features)
      .join('path')
      .attr('class', 'land')
      .attr('d', path as never)
      .attr('fill', '#d8e2ff') // 육지 primary-fixed
      .attr('stroke', '#aec6ff')
      .attr('stroke-width', 0.4)

    // 마커 렌더 — 진출국(secondary 채움+발광) / 예정국(점선 테두리). mockup 마커 스타일 정합.
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
      .on('click', (_e, d) => {
        setNotif(false)
        onSelectCountry(d.code)
      })

    // 발광 효과(진출국)
    node
      .filter((d) => d.status === 'active')
      .append('circle')
      .attr('r', 9)
      .attr('fill', '#005db7')
      .attr('opacity', 0.25)

    node
      .append('circle')
      .attr('r', (d) => (d.status === 'active' ? 5 : 4.5))
      .attr('fill', (d) => (d.status === 'active' ? '#005db7' : 'transparent'))
      .attr('stroke', (d) => (d.status === 'active' ? 'none' : '#003478'))
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', (d) => (d.status === 'planned' ? '3,2' : 'none'))

    // 줌/패닝(1~6배)
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 6])
      .on('zoom', (e) => g.attr('transform', e.transform.toString()))
    svg.call(zoom)
  }, [markers, onSelectCountry])

  return (
    <div className="relative h-full w-full bg-surface-container-lowest">
      {/* 기술적 점 그리드 오버레이(mockup) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='1' fill='%23DCDCDC'/%3E%3C/svg%3E\")",
        }}
      />
      <TopBar
        onMenuSelect={(key) => {
          // 상단 메뉴 진입 = 풀사이즈 모드(§6.4 경로 C)
          if (key === 'map') {
            window.location.hash = '#/'
            setNotif(true)
            return
          }
          setNotif(false)
          if (key === 'ruleset') {
            window.location.hash = '#/ruleset?mode=fullscreen'
          } else if (key === 'country') {
            const first = countries[0]
            if (first) window.location.hash = `#/country/${first.code}/detail?mode=fullscreen`
          } else if (key === 'region') {
            const first = regions[0]
            if (first) window.location.hash = `#/region/${first.code}/detail?mode=fullscreen`
          } else if (key === 'about') {
            setNotif(true)
          }
        }}
      />
      <Notification
        message="지도에서 국가를 선택하거나 챗봇에게 물어보세요."
        visible={notif}
      />
      <svg
        ref={svgRef}
        viewBox="0 0 960 500"
        className="h-full w-full"
        aria-label="세계 지도"
      />
      <Legend />
      {regions.length > 0 && (
        <div className="absolute bottom-lg left-1/2 z-chrome flex -translate-x-1/2 items-center gap-sm rounded-full border border-surface-border bg-surface px-md py-sm shadow-[0_4px_12px_rgba(0,32,78,0.08)]">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
            권역
          </span>
          {regions.map((r) => (
            <button
              key={r.code}
              className="rounded-full px-sm py-xs font-label-md text-label-md text-secondary transition-colors hover:bg-surface-variant"
              onClick={() => {
                setNotif(false)
                onSelectRegion(r.code)
              }}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
      {error && (
        <div className="absolute inset-x-0 bottom-0 z-chrome bg-error-container p-sm text-center text-body-sm text-on-error-container">
          데이터를 불러오지 못했습니다. 백엔드가 실행 중인지 확인하세요.
        </div>
      )}
    </div>
  )
}
