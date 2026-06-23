// GlobeIntro(C4, FR-2.1) — D3 점(dot) 파티클 지구본 시네마틱 인트로(intro_spec).
// 등장(페이드인) → 자전 + 발광 마커/아크 → onDone(평면 지도는 MapView가 담당).
// reduced-motion 시 즉시 onDone(AR-1). 다크 테마(intro_spec §7 reversion, inverse 토큰 계열).
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { feature } from 'topojson-client'
import worldData from 'world-atlas/countries-110m.json'
import type { Topology } from 'topojson-specification'
import { api } from '../../api/client'
import { COUNTRY_COORDS } from './coords'

interface Props {
  reducedMotion: boolean
  onDone: () => void
}

const SEOUL: [number, number] = [126.98, 37.57] // HQ — 아크 시작점
const HALF_PI = Math.PI / 2

export function GlobeIntro({ reducedMotion, onDone }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (reducedMotion) {
      onDone()
      return
    }
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = wrap.clientWidth || window.innerWidth
    let H = wrap.clientHeight || window.innerHeight

    const topo = worldData as unknown as Topology
    const landFC = feature(
      topo,
      topo.objects.countries as never,
    ) as unknown as GeoJSON.FeatureCollection

    // ── 육지에 떨어지는 점 격자 미리 계산(위도별 등간격 경도) ──
    const dots: Array<[number, number]> = []
    const STEP = 2.6
    for (let lat = -84; lat <= 84; lat += STEP) {
      const circ = Math.cos((lat * Math.PI) / 180)
      const lonStep = STEP / Math.max(circ, 0.08)
      for (let lon = -180; lon < 180; lon += lonStep) {
        if (d3.geoContains(landFC, [lon, lat])) dots.push([lon, lat])
      }
    }

    // 별 배경(정적). animation 루프에서 그릴 위치/밝기.
    let stars: Array<{ x: number; y: number; r: number; a: number }> = []
    const projection = d3.geoOrthographic().rotate([20, -14, 0])

    const layout = () => {
      W = wrap.clientWidth || window.innerWidth
      H = wrap.clientHeight || window.innerHeight
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const radius = Math.min(W, H) * 0.34
      projection.translate([W / 2, H / 2]).scale(radius)
      stars = Array.from({ length: Math.max(40, Math.round((W * H) / 7000)) }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.1 + 0.2,
        a: Math.random() * 0.5 + 0.15,
      }))
    }
    layout()
    window.addEventListener('resize', layout)

    const rotCenter = (): [number, number] => {
      const r = projection.rotate()
      return [-r[0], -r[1]]
    }

    // 마커 좌표는 백엔드 geo 참조가 단일 출처. 인트로는 즉시 그려야 하므로 정적 테이블로
    // 먼저 그리고(첫 페인트 지연 방지), API 응답이 오면 좌표 집합을 교체한다.
    let markers: Array<[number, number]> = Object.values(COUNTRY_COORDS)
    api
      .getCountries()
      .then((cs) => {
        const fromApi = cs
          .filter((c) => c.lon != null && c.lat != null)
          .map((c) => [c.lon as number, c.lat as number] as [number, number])
        if (fromApi.length) markers = fromApi
      })
      .catch(() => {
        /* 인트로는 장식 — 실패 시 정적 폴백 유지 */
      })
    const start = performance.now()
    let raf = 0
    let finished = false

    // ── 타임라인: [0~1s 페이드인] → 자전 → [2800~3900ms 줌인 빨려듦] → onDone ──
    const ZOOM_START = 2800
    const ZOOM_END = 3900
    const easeIn = (x: number) => x * x * x // cubic-in: 후반에 급가속(빨려드는 느낌)

    const draw = (now: number) => {
      const t = now - start
      const fade = Math.min(t / 1000, 1) // 등장 페이드인 ~1s
      const cx = W / 2
      const cy = H / 2

      // 줌인 진행도(0~1): 후반에 구체가 화면을 채우며 빨려듦
      const zp = t <= ZOOM_START ? 0 : Math.min((t - ZOOM_START) / (ZOOM_END - ZOOM_START), 1)
      const zoom = 1 + easeIn(zp) * 6.5 // 최대 ~7.5배 확대
      const zoomFade = 1 - Math.min(Math.max((zp - 0.55) / 0.45, 0), 1) // 후반부 페이드아웃
      const baseRadius = Math.min(W, H) * 0.34
      const radius = baseRadius * zoom
      projection.scale(radius)

      // 자전(intro_spec: ~12deg/s) — 줌인 중에는 회전 가속(몰입감)
      projection.rotate([20 + t * 0.012 + zp * 30, -14, 0])
      const center = rotCenter()

      ctx.clearRect(0, 0, W, H)

      // ── 별 배경 ── (줌인 시 별은 페이드아웃)
      ctx.save()
      ctx.globalAlpha = fade * zoomFade
      for (const s of stars) {
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, 2 * Math.PI)
        ctx.fillStyle = `rgba(174,198,255,${s.a})`
        ctx.fill()
      }
      ctx.restore()

      ctx.save()
      ctx.globalAlpha = fade * zoomFade

      // ── 대기광(atmosphere glow) — 레퍼런스의 강한 청록 림(rim) ──
      // 안쪽 림을 밝게, 바깥으로 부드럽게 퍼지는 2겹 그라디언트.
      const glow = ctx.createRadialGradient(cx, cy, radius * 0.96, cx, cy, radius * 1.5)
      glow.addColorStop(0, 'rgba(120,180,255,0.45)')
      glow.addColorStop(0.18, 'rgba(77,139,255,0.32)')
      glow.addColorStop(0.55, 'rgba(57,93,162,0.12)')
      glow.addColorStop(1, 'rgba(57,93,162,0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(cx, cy, radius * 1.5, 0, 2 * Math.PI)
      ctx.fill()

      // 밝은 가장자리 림 라인(구체 경계 발광)
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
      ctx.strokeStyle = 'rgba(150,200,255,0.5)'
      ctx.lineWidth = Math.max(1, radius * 0.012)
      ctx.stroke()

      // ── 바다 구체(딥 네이비) — 주간측(좌상)이 밝고 야간측으로 어두워짐 ──
      const ocean = ctx.createRadialGradient(
        cx - radius * 0.32,
        cy - radius * 0.32,
        radius * 0.08,
        cx + radius * 0.2,
        cy + radius * 0.15,
        radius * 1.05,
      )
      ocean.addColorStop(0, '#0a4a8c')
      ocean.addColorStop(0.55, '#012a5e')
      ocean.addColorStop(1, '#00081c')
      ctx.fillStyle = ocean
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
      ctx.fill()

      // ── 육지 점(앞면만) — 주야 경계(terminator) 기반 명암 ──
      // 태양은 회전 중심에서 동쪽으로 오프셋. 야간측(태양 반대)은 도시 불빛처럼 주황 발광.
      const sun: [number, number] = [center[0] + 70, center[1] + 8]
      for (const dot of dots) {
        const dist = d3.geoDistance(dot, center)
        if (dist >= HALF_PI - 0.02) continue // 뒷면 숨김
        const p = projection(dot)
        if (!p) continue
        const frac = dist / HALF_PI // 0(정면)~1(가장자리)
        const r = 1.5 - frac * 0.6
        const rad = Math.max(0.4, r)
        // 태양각: 0(한낮)~π(한밤). 야간일수록 도시 불빛.
        const sunAngle = d3.geoDistance(dot, sun)
        const night = Math.min(Math.max((sunAngle - HALF_PI * 0.85) / (HALF_PI * 0.9), 0), 1)
        const edgeFade = 1 - frac * 0.55
        if (night > 0.35) {
          // 야간 도시 불빛(주황) — 일부 점만 밝게 반짝(클러스터 느낌)
          const a = (0.25 + night * 0.6) * edgeFade
          ctx.beginPath()
          ctx.arc(p[0], p[1], rad, 0, 2 * Math.PI)
          ctx.fillStyle = `rgba(255,176,92,${a.toFixed(3)})`
          ctx.fill()
        } else {
          // 주간측(쿨 블루)
          const bright = (1 - frac * 0.78) * (0.55 + (1 - night) * 0.45)
          ctx.beginPath()
          ctx.arc(p[0], p[1], rad, 0, 2 * Math.PI)
          ctx.fillStyle = `rgba(174,198,255,${(0.3 + bright * 0.55).toFixed(3)})`
          ctx.fill()
        }
      }

      // ── 서울 HQ → 진출국 아크(화면 좌표상 위로 솟는 곡선) ──
      const SAMPLES = 48
      for (const m of markers) {
        const interp = d3.geoInterpolate(SEOUL, m)
        ctx.beginPath()
        let drawing = false
        for (let i = 0; i <= SAMPLES; i++) {
          const s = i / SAMPLES
          const ll = interp(s)
          if (d3.geoDistance(ll, center) >= HALF_PI - 0.01) {
            drawing = false
            continue
          }
          const p = projection(ll)
          if (!p) {
            drawing = false
            continue
          }
          // 화면 중심 기준 바깥으로 살짝 들어올려 비행 아크처럼
          const lift = 1 + 0.16 * Math.sin(Math.PI * s)
          const x = cx + (p[0] - cx) * lift
          const y = cy + (p[1] - cy) * lift
          if (!drawing) {
            ctx.moveTo(x, y)
            drawing = true
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.strokeStyle = 'rgba(174,198,255,0.4)'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 4])
        ctx.stroke()
        ctx.setLineDash([])
      }

      // ── 발광 마커(진출국) — 부드러운 펄스 ──
      const pulse = 0.5 + 0.5 * Math.sin(t / 350)
      for (const m of markers) {
        if (d3.geoDistance(m, center) >= HALF_PI - 0.02) continue
        const p = projection(m)
        if (!p) continue
        const halo = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 9 + pulse * 4)
        halo.addColorStop(0, 'rgba(77,139,255,0.55)')
        halo.addColorStop(1, 'rgba(77,139,255,0)')
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(p[0], p[1], 9 + pulse * 4, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(p[0], p[1], 2.6, 0, 2 * Math.PI)
        ctx.fillStyle = '#dceaff'
        ctx.fill()
      }

      // 서울 HQ 마커(밝게 강조)
      if (d3.geoDistance(SEOUL, center) < HALF_PI - 0.02) {
        const p = projection(SEOUL)
        if (p) {
          const halo = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 12)
          halo.addColorStop(0, 'rgba(255,255,255,0.7)')
          halo.addColorStop(1, 'rgba(174,198,255,0)')
          ctx.fillStyle = halo
          ctx.beginPath()
          ctx.arc(p[0], p[1], 12, 0, 2 * Math.PI)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(p[0], p[1], 3.2, 0, 2 * Math.PI)
          ctx.fillStyle = '#ffffff'
          ctx.fill()
        }
      }

      ctx.restore()

      if (t >= ZOOM_END && !finished) {
        finished = true
        onDone()
        return
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', layout)
    }
  }, [reducedMotion, onDone])

  return (
    <div
      ref={wrapRef}
      className="flex h-screen w-screen items-center justify-center overflow-hidden"
      style={{
        background:
          'radial-gradient(1200px 800px at 60% 38%, #022259 0%, #00153a 45%, #000a1f 100%)',
      }}
    >
      <canvas ref={canvasRef} aria-label="지구본 인트로" />
    </div>
  )
}
