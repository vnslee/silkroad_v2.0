// ChatWidget(C5, FR-3, L6) — AISea C1 충실 재현.
// 다크 헤더 / 버블(유저=블루·봇=흰 카드) / 퀵프롬프트 칩 / 둥근 입력 바 / 다크 pill FAB.
// chatOpen은 store 구독(상단바 챗 버튼·FAB가 공유). API/needs_research/리서치+폴링 로직 불변(§5.2).
import { useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import type { ChatAction, ChatTurn, Domain, JobKind } from '../../api/types'
import { useStore, store } from '../../store'
import { useJobPolling } from '../../hooks/useJobPolling'

interface Pending {
  domain: Domain
  id: string
  missingCodes: string[]
}

// 칩 한 개의 메타: 라벨 + 클릭 동작 키.
const ACTION_LABELS: Record<ChatAction, string> = {
  summary: '국가 상세 정보 요약하기',
  research: '리서치 수행',
  re_research: '리서치 재수행',
  report: '보고서 생성',
  re_report: '보고서 재생성',
}

const QUICK_PROMPTS = [
  '스페인 시장 진단 보고서 만들어줘',
  '유럽 권역 내 Quick-win 가능 국가 분석',
]

export function ChatWidget() {
  const open = useStore((s) => s.chatOpen)
  const activePopup = useStore((s) => s.activePopup)
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: 'assistant',
      content:
        '안녕하세요 👋 AISea 진단 어시스턴트예요.\n진출을 검토 중인 국가나 권역을 말씀해 주시면 리스크 진단을 도와드릴게요.',
    },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  // 초기 대상은 스페인이지만, 백엔드가 질문에서 식별한 대상(resolved_*)으로 매 턴 갱신한다.
  // (이전엔 고정이라 어떤 질문이든 ES 데이터로만 답하는 버그가 있었음 — §6.5)
  const [target, setTarget] = useState<{ domain: Domain; id: string }>({ domain: 'country', id: 'ES' })
  const [pending, setPending] = useState<Pending | null>(null)
  // 현재 노출 중인 선택지 칩(상세요약/리서치/보고서). resp.actions로 세팅.
  const [actions, setActions] = useState<ChatAction[]>([])
  // 상세 요약 분기 대기 — 사용자가 '상세 화면' vs '요약' 중 선택.
  const [summaryAsk, setSummaryAsk] = useState<{ domain: Domain; id: string } | null>(null)
  // 챗봇 상단 진행 팝업: 리서치/보고서 트리거 시 잡 진행률을 챗봇 위에 표시.
  const [activeJob, setActiveJob] = useState<
    { jobId: string; kind: JobKind; label: string } | null
  >(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToEnd = () => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, 30)
  }
  useEffect(scrollToEnd, [turns, typing])

  // 진행 중 잡 폴링 — 완료/실패 시 챗봇 안내. 잡 카드는 제거하지 않고(우상단 진행 패널이
  // 완료 상태·상세 바를 계속 보여주도록) 사용자가 패널에서 직접 닫는다.
  useJobPolling(activeJob?.jobId ?? null, {
    onDone: (result) => {
      const job = activeJob
      setActiveJob(null)
      if (job?.kind === 'research') {
        pushAssistant('리서치가 완료되었습니다. 다시 질문해 주시면 데이터를 바탕으로 답변드릴게요.')
        setPending(null)
        // 신규/갱신 국가가 카탈로그에 반영됐으므로 지도가 마커를 재조회하도록 신호.
        store.refreshCountries()
      } else if (job?.kind === 'report') {
        const reportId =
          result && 'report_id' in result ? (result as { report_id: string }).report_id : null
        pushAssistant(
          reportId
            ? `보고서 생성이 완료되었습니다 (${reportId}). 메일로 공유하시겠어요?`
            : '보고서 생성이 완료되었습니다.',
        )
      }
    },
    onError: (msg) => {
      const kind = activeJob?.kind
      setActiveJob(null)
      pushAssistant(`${kind === 'report' ? '보고서 생성' : '리서치'} 중 오류가 발생했습니다: ${msg}`)
    },
  })

  function pushAssistant(content: string) {
    setTyping(false)
    setTurns((t) => [...t, { role: 'assistant', content }])
  }

  async function send(text: string) {
    if (!text.trim()) return
    const next: ChatTurn[] = [...turns, { role: 'user', content: text }]
    setTurns(next)
    setInput('')
    setTyping(true)
    setActions([])
    setSummaryAsk(null)
    try {
      const resp = await api.chat({
        domain: target.domain,
        target_id: target.id,
        message: text,
        history: next,
      })
      // 백엔드가 질문에서 식별한 대상을 다음 턴 대상으로 반영(ES 고정 버그 방지, §6.5).
      const resolved =
        resp.resolved_domain && resp.resolved_target_id
          ? { domain: resp.resolved_domain, id: resp.resolved_target_id }
          : target
      if (resolved.domain !== target.domain || resolved.id !== target.id) {
        setTarget(resolved)
      }
      if (resp.answer) pushAssistant(resp.answer)
      else setTyping(false)

      // 명시적 의도(보유국 재리서치/보고서 생성) → 확인 없이 즉시 트리거.
      if (resp.auto_trigger && resp.needs_report) {
        if (resp.research_suggestion) pushAssistant(resp.research_suggestion)
        startReport(resolved.domain, resolved.id)
      } else if (resp.auto_trigger && resp.needs_research) {
        if (resp.research_suggestion) pushAssistant(resp.research_suggestion)
        startResearch({ domain: resolved.domain, id: resolved.id, missingCodes: resp.missing_codes })
      } else if (resp.needs_research || resp.needs_report) {
        // 확인 필요(미보유국 등) → 제안 문구 + 예/아니오 칩.
        setPending({
          domain: resolved.domain,
          id: resolved.id,
          missingCodes: resp.missing_codes,
        })
        if (resp.research_suggestion) pushAssistant(resp.research_suggestion)
      }

      // 보유국 QA → 선택지 칩 노출(상세요약/리서치 재수행/보고서).
      setActions(resp.actions ?? [])
    } catch (e) {
      pushAssistant(`오류가 발생했습니다: ${String(e)}`)
    }
  }

  function startResearch(p: Pending) {
    // 정책: 권역 신규 리서치는 지원하지 않는다(보유 권역만 운용). 방어적 가드 — 백엔드도 403.
    if (p.domain === 'region') {
      setPending(null)
      setActions([])
      pushAssistant(
        '권역 단위 신규 리서치는 현재 지원하지 않습니다. 권역 내 개별 국가의 리서치를 도와드릴 수 있어요.',
      )
      return
    }
    api
      .triggerResearch(p.domain, p.id, undefined)
      .then((job) => {
        setPending(null)
        setActions([])
        setActiveJob({ jobId: job.job_id, kind: 'research', label: `${p.id} 리서치` })
        store.addJob({ jobId: job.job_id, kind: 'research', domain: p.domain, id: p.id, label: `${p.id} 리서치` })
        pushAssistant('리서치를 시작했습니다. 진행 상황은 상단에 표시됩니다…')
      })
      .catch((e) => pushAssistant(`리서치 트리거 실패: ${String(e)}`))
  }

  function startReport(domain: Domain, id: string) {
    api
      .createReport(domain, id)
      .then((job) => {
        setActions([])
        setActiveJob({ jobId: job.job_id, kind: 'report', label: `${id} 보고서` })
        store.addJob({ jobId: job.job_id, kind: 'report', domain, id, label: `${id} 보고서` })
        pushAssistant('보고서 생성을 시작했습니다. 진행 상황은 상단에 표시됩니다…')
      })
      .catch((e) => pushAssistant(`보고서 생성 트리거 실패: ${String(e)}`))
  }

  // 선택지 칩 클릭 처리.
  function onAction(action: ChatAction) {
    setActions([])
    if (action === 'summary') {
      // 상세 화면 vs 요약 — 사용자에게 추가 질의(요구사항).
      setSummaryAsk({ domain: target.domain, id: target.id })
      pushAssistant(`${target.id} 정보를 상세 화면에서 보시겠어요, 아니면 요약으로 받으시겠어요?`)
      return
    }
    if (action === 'research' || action === 're_research') {
      startResearch({ domain: target.domain, id: target.id, missingCodes: [] })
      return
    }
    if (action === 'report' || action === 're_report') {
      startReport(target.domain, target.id)
    }
  }

  // 상세 요약 분기: 상세 화면 열기 / 챗봇에서 요약 받기.
  function onSummaryChoice(openDetail: boolean) {
    const ask = summaryAsk
    setSummaryAsk(null)
    if (!ask) return
    if (openDetail) {
      store.setChatOpen(false)
      window.location.hash = `#/${ask.domain}/${ask.id}/detail?mode=popup`
    } else {
      send(`${ask.id} 핵심 지표를 요약해줘`)
    }
  }

  // ── FAB (다크 pill) ──
  if (!open) {
    return (
      <button
        type="button"
        aria-label="AISea 어시스턴트 열기"
        onClick={() => store.setChatOpen(true)}
        className="absolute bottom-[26px] right-[78px] z-chat flex h-[52px] animate-aisea-slide items-center gap-md rounded-full bg-primary-container pl-[18px] pr-[20px] text-on-primary shadow-[0_10px_30px_rgba(20,23,28,0.28)] transition-colors hover:bg-aisea-dark-2"
      >
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-primary">
          <span className="block h-[11px] w-[13px] rounded-[4px] border-2 border-white" />
        </span>
        <span className="font-body-md text-[14px] font-semibold">AISea에게 물어보기</span>
      </button>
    )
  }

  // 위치 — 팝업 활성 시 좌하단(§5.2), 아니면 중앙
  const wrap = activePopup
    ? 'items-end justify-start p-lg'
    : 'items-center justify-center'
  const box = activePopup
    ? 'h-[54%] min-h-[440px] w-[30%] min-w-[340px]'
    : 'h-[62%] min-h-[520px] max-h-[90%] w-[46%] min-w-[420px]'

  return (
    <div className={`pointer-events-none absolute inset-0 z-chat flex ${wrap}`}>
      <div
        role="dialog"
        aria-label="AISea 어시스턴트"
        className={`pointer-events-auto relative flex animate-aisea-op flex-col overflow-hidden rounded-[18px] border border-surface-border bg-surface-container-lowest shadow-[0_24px_70px_rgba(20,23,28,0.26)] ${box}`}
      >
        {/* 진행 상황은 우상단 메인 프로그레스 패널(ProgressPanel)에서 상세 표시한다.
            (이전엔 챗봇 상단 오버레이로 떴으나 위치가 어색해 패널로 일원화) */}

        {/* 헤더 (다크) */}
        <div className="flex flex-none items-center gap-md bg-primary-container px-md py-md text-on-primary">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-primary">
            <span className="block h-[11px] w-[13px] rounded-[4px] border-2 border-white" />
          </div>
          <div className="flex-1">
            <div className="font-body-md text-[14px] font-bold">AISea 어시스턴트</div>
            <div className="flex items-center gap-xs font-label-sm text-label-sm text-on-primary-container">
              <span className="inline-block h-[6px] w-[6px] rounded-full bg-success" />
              진단 엔진 온라인
            </div>
          </div>
          <button
            onClick={() => store.setChatOpen(false)}
            aria-label="챗봇 닫기"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-on-primary-container transition-colors hover:bg-white/10"
          >
            <span className="text-[16px] leading-none">✕</span>
          </button>
        </div>

        {/* 대화 영역 */}
        <div
          ref={scrollRef}
          aria-live="polite"
          className="flex flex-1 flex-col gap-md overflow-y-auto bg-surface-light p-lg"
        >
          {turns.map((t, i) => (
            <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-[14px] px-md py-sm font-body-sm text-[13.5px] leading-relaxed ${
                  t.role === 'user'
                    ? 'bg-primary text-on-primary'
                    : 'border border-surface-border bg-surface-container-lowest text-on-surface'
                }`}
              >
                {t.content}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="flex gap-[4px] rounded-[14px] border border-surface-border bg-surface-container-lowest px-md py-md">
                <span className="h-[6px] w-[6px] rounded-full bg-outline" style={{ animation: 'aisea-pulse 1s infinite' }} />
                <span className="h-[6px] w-[6px] rounded-full bg-outline" style={{ animation: 'aisea-pulse 1s infinite .2s' }} />
                <span className="h-[6px] w-[6px] rounded-full bg-outline" style={{ animation: 'aisea-pulse 1s infinite .4s' }} />
              </div>
            </div>
          )}
          {/* 예/아니오 확인(미보유국 리서치 등). 거절 시 보유국 한정 안내. */}
          {pending && !activeJob && !summaryAsk && (
            <div className="flex gap-sm">
              <button
                className="rounded-full bg-primary px-md py-sm font-label-md text-label-md text-on-primary"
                onClick={() => startResearch(pending)}
              >
                예, 리서치 진행
              </button>
              <button
                className="rounded-full bg-surface-container px-md py-sm font-label-md text-label-md text-on-surface-variant"
                onClick={() => {
                  setPending(null)
                  pushAssistant(
                    '알겠습니다. 보유 중인 국가 정보에 한해서만 답변드릴 수 있어요. 다른 국가를 물어봐 주세요.',
                  )
                }}
              >
                아니오
              </button>
            </div>
          )}

          {/* 상세 요약 분기: 상세 화면 / 요약 */}
          {summaryAsk && !activeJob && (
            <div className="flex gap-sm">
              <button
                className="rounded-full bg-primary px-md py-sm font-label-md text-label-md text-on-primary"
                onClick={() => onSummaryChoice(true)}
              >
                상세 화면 열기
              </button>
              <button
                className="rounded-full bg-surface-container px-md py-sm font-label-md text-label-md text-on-surface-variant"
                onClick={() => onSummaryChoice(false)}
              >
                요약으로 받기
              </button>
            </div>
          )}

          {/* 선택지 칩(보유국 QA): 상세요약 / 리서치(재)수행 / 보고서(재)생성 */}
          {actions.length > 0 && !pending && !summaryAsk && !activeJob && (
            <div className="flex flex-wrap gap-xs">
              {actions.map((a) => (
                <button
                  key={a}
                  onClick={() => onAction(a)}
                  className="rounded-full border border-primary/30 bg-primary-fixed px-md py-xs font-label-md text-label-md text-primary transition-colors hover:bg-primary-fixed-dim"
                >
                  {ACTION_LABELS[a]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 하단: 퀵프롬프트 + 입력 */}
        <div className="flex-none border-t border-surface-border bg-surface-container-lowest px-md py-sm">
          {turns.length <= 1 && (
            <div className="mb-sm flex flex-wrap gap-xs">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-[9px] bg-primary-fixed px-md py-xs font-body-sm text-[12px] font-medium leading-snug text-primary transition-colors hover:bg-primary-fixed-dim"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <form
            className="flex items-center gap-sm rounded-[12px] bg-surface-container py-[5px] pl-md pr-[5px]"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              className="flex-1 bg-transparent font-body-sm text-[13.5px] text-on-surface outline-none placeholder:text-outline"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="진출 시장에 대해 물어보세요…"
              aria-label="질문 입력"
            />
            <button
              type="submit"
              aria-label="전송"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-primary text-[15px] text-on-primary transition-colors hover:bg-inverse-primary"
            >
              ↑
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
