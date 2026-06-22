// AppShell(C1) — 라우팅·진입 모드 컨테이너 선택·전역 레이아웃·딥링크 인트로 스킵(L1·L2).
import { lazy, Suspense, useState } from 'react'
import { useRoute } from './app/useRoute'
import { isDeepLink } from './app/route'
import { PopupContainer } from './app/containers/PopupContainer'
import { FullscreenContainer } from './app/containers/FullscreenContainer'
import { GlobeIntro } from './components/map/GlobeIntro'
import { MapView } from './components/map/MapView'
import { ChatWidget } from './components/chat/ChatWidget'
import { ProgressPanel } from './components/progress/ProgressPanel'

// 라우트 화면 코드 스플리팅(NFR Q3=A)
const DetailView = lazy(() => import('./components/detail/DetailView'))
const ReportView = lazy(() => import('./components/report/ReportView'))
const RulesetForm = lazy(() => import('./components/ruleset/RulesetForm'))

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

export default function App() {
  const { route, navigate, goHome } = useRoute()
  // 딥링크면 인트로 스킵
  const [introDone, setIntroDone] = useState(
    () => typeof window !== 'undefined' && isDeepLink(window.location.hash),
  )

  if (!introDone) {
    return <GlobeIntro reducedMotion={prefersReducedMotion()} onDone={() => setIntroDone(true)} />
  }

  // 화면(모드 무지) — 컨테이너가 모드로 래핑(Q2=A)
  const overlay = route.screen !== 'map' && (
    <Suspense fallback={<div className="p-xl text-on-surface-variant">로딩 중…</div>}>
      {route.screen === 'detail' && route.domain && route.id && (
        <DetailView domain={route.domain} code={route.id} mode={route.mode} />
      )}
      {route.screen === 'report' && route.domain && route.id && (
        <ReportView domain={route.domain} code={route.id} reportId={route.reportId} mode={route.mode} />
      )}
      {route.screen === 'ruleset' && <RulesetForm />}
    </Suspense>
  )

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <MapView
        onSelectCountry={(code) => navigate({ screen: 'detail', domain: 'country', id: code, mode: 'popup' })}
        onSelectRegion={(region) => navigate({ screen: 'detail', domain: 'region', id: region, mode: 'popup' })}
      />

      {overlay && route.mode === 'popup' && (
        <PopupContainer onClose={goHome}>{overlay}</PopupContainer>
      )}
      {overlay && route.mode === 'fullscreen' && (
        <FullscreenContainer onBack={goHome}>{overlay}</FullscreenContainer>
      )}

      <ProgressPanel />
      <ChatWidget />
    </div>
  )
}
