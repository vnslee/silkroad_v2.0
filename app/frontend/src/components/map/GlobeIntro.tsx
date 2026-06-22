// GlobeIntro(C4, FR-2.1) — D3 지구본 시네마틱 인트로 3단계(intro_spec).
// 등장·자전(~1.6s) → 펼침(~2.0s) → 착지+UI 페이드인. reduced-motion 시 즉시 onDone(AR-1).
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { feature } from 'topojson-client'
import worldData from 'world-atlas/countries-110m.json'
import type { Topology } from 'topojson-specification'

interface Props {
  reducedMotion: boolean
  onDone: () => void
}

export function GlobeIntro({ reducedMotion, onDone }: Props) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (reducedMotion) {
      onDone()
      return
    }
    if (!ref.current) return
    const svg = d3.select<SVGSVGElement, unknown>(ref.current)
    const projection = d3.geoOrthographic().scale(260).translate([0, 0])
    const path = d3.geoPath(projection)

    const topo = worldData as unknown as Topology
    const land = feature(topo, topo.objects.countries as never) as unknown as {
      features: GeoJSON.Feature[]
    }

    const wrap = svg.append('g').attr('opacity', 0)
    // 바다 구체
    wrap
      .append('path')
      .datum({ type: 'Sphere' } as never)
      .attr('fill', '#00204e') // primary (심해 네이비)
    // 육지
    const landPaths = wrap
      .selectAll('path.land')
      .data(land.features)
      .join('path')
      .attr('class', 'land')
      .attr('fill', '#aec6ff') // inverse-primary (밝은 육지)
      .attr('stroke', '#5b82d6')
      .attr('stroke-width', 0.3)

    // 1단계: 등장·자전
    wrap.transition().duration(1600).attr('opacity', 1)
    const redraw = () => {
      wrap.select<SVGPathElement>('path').attr('d', path({ type: 'Sphere' } as never) ?? '')
      landPaths.attr('d', (d) => path(d as never) ?? '')
    }
    redraw()
    const timer = d3.timer((elapsed) => {
      projection.rotate([elapsed / 20, -12])
      redraw()
      if (elapsed > 3600) timer.stop()
    })

    // 3단계: 착지 → onDone(평면 지도는 MapView가 담당)
    const done = window.setTimeout(onDone, 3800)

    return () => {
      timer.stop()
      window.clearTimeout(done)
      svg.selectAll('*').remove()
    }
  }, [reducedMotion, onDone])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-surface-container-lowest">
      <svg ref={ref} viewBox="-300 -300 600 600" className="h-[60vmin] w-[60vmin]" aria-label="지구본 인트로" />
    </div>
  )
}
