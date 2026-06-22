// ChatWidget(C5, FR-3, L6) — C1 mockup 충실 재현.
// 위젯 FAB(material 아이콘+ping) / 헤더(아바타·타이틀) / 말풍선 / 모드 토글 / 입력 바.
// needs_research 분기(domain·missing_codes)·리서치+폴링·위치 규칙(§5.2)·무상태 history(Q4=A).
import { useState } from 'react'
import { api } from '../../api/client'
import type { ChatTurn, Domain } from '../../api/types'
import { useStore, store } from '../../store'
import { useJobPolling } from '../../hooks/useJobPolling'
import { Icon } from '../common/Icon'

interface Pending {
  domain: Domain
  id: string
  missingCodes: string[]
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: 'assistant',
      content:
        '안녕하세요. 글로벌 진출 진단 어시스턴트입니다. 국가·권역 진단이나 시장 분석에 대해 무엇이든 물어보세요.',
    },
  ])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'internal' | 'external'>('internal')
  const [target] = useState<{ domain: Domain; id: string }>({ domain: 'country', id: 'ES' })
  const [pending, setPending] = useState<Pending | null>(null)
  const [researchJob, setResearchJob] = useState<string | null>(null)

  const activePopup = useStore((s) => s.activePopup)
  const position = activePopup
    ? 'bottom-lg left-lg'
    : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'

  useJobPolling(researchJob, {
    onDone: () => {
      store.removeJob(researchJob ?? '')
      setResearchJob(null)
      pushAssistant('리서치가 완료되었습니다. 다시 질문해 주시면 데이터를 바탕으로 답변드릴게요.')
      setPending(null)
    },
    onError: (msg) => {
      setResearchJob(null)
      pushAssistant(`리서치 중 오류가 발생했습니다: ${msg}`)
    },
  })

  function pushAssistant(content: string) {
    setTurns((t) => [...t, { role: 'assistant', content }])
  }

  async function send(text: string) {
    if (!text.trim()) return
    const next: ChatTurn[] = [...turns, { role: 'user', content: text }]
    setTurns(next)
    setInput('')
    try {
      const resp = await api.chat({
        domain: target.domain,
        target_id: target.id,
        message: text,
        history: next,
      })
      if (resp.answer) pushAssistant(resp.answer)
      if (resp.needs_research) {
        setPending({ domain: target.domain, id: target.id, missingCodes: resp.missing_codes })
        pushAssistant(resp.research_suggestion ?? '보유 정보가 없습니다. 리서치를 진행할까요?')
      }
    } catch (e) {
      pushAssistant(`오류가 발생했습니다: ${String(e)}`)
    }
  }

  function startResearch() {
    if (!pending) return
    const body = pending.domain === 'region' ? { member_codes: pending.missingCodes } : undefined
    api
      .triggerResearch(pending.domain, pending.id, body)
      .then((job) => {
        setResearchJob(job.job_id)
        store.addJob({
          jobId: job.job_id,
          kind: 'research',
          domain: pending.domain,
          id: pending.id,
          label: `${pending.id} 리서치`,
        })
        pushAssistant('리서치를 시작했습니다. 잠시만 기다려 주세요…')
      })
      .catch((e) => pushAssistant(`리서치 트리거 실패: ${String(e)}`))
  }

  // ── FAB ──
  if (!open) {
    return (
      <button
        type="button"
        aria-label="어시스턴트 열기"
        onClick={() => setOpen(true)}
        className="group absolute bottom-lg left-lg z-chat flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_12px_24px_rgba(0,32,78,0.2)] transition-transform duration-200 hover:scale-105"
      >
        <Icon name="smart_toy" filled className="text-[26px]" />
        <span className="absolute inset-0 animate-ping rounded-full border-2 border-primary opacity-40" />
      </button>
    )
  }

  // ── 챗봇 카드 ──
  return (
    <div
      className={`absolute z-chat flex h-[70vh] max-h-[640px] w-[min(90vw,440px)] flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-[0_12px_24px_rgba(0,32,78,0.16)] ${position}`}
      role="dialog"
      aria-label="진단 어시스턴트"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-surface-border px-lg py-md">
        <div className="flex items-center gap-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container">
            <Icon name="smart_toy" filled className="text-on-primary-container text-[20px]" />
          </div>
          <div>
            <h2 className="font-headline-md text-headline-md leading-tight text-primary">
              진단 어시스턴트
            </h2>
            <p className="mt-0.5 font-label-sm text-label-sm uppercase tracking-widest text-text-secondary">
              Powered by Hyundai Capital AI
            </p>
          </div>
        </div>
        <button
          aria-label="챗봇 닫기"
          onClick={() => setOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-variant hover:text-primary"
        >
          <Icon name="close" className="text-[20px]" />
        </button>
      </div>

      {/* 대화 영역 */}
      <div className="flex flex-1 flex-col gap-lg overflow-y-auto p-lg" aria-live="polite">
        {turns.map((t, i) =>
          t.role === 'assistant' ? (
            <div key={i} className="flex max-w-[85%] gap-md">
              <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-container">
                <Icon name="smart_toy" filled className="text-on-primary-container text-sm" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-surface-border bg-surface p-md font-body-md text-body-md text-on-surface shadow-[0_4px_8px_rgba(0,32,78,0.04)]">
                {t.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex max-w-[85%] flex-row-reverse gap-md self-end">
              <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container">
                <Icon name="person" className="text-on-secondary-container text-sm" />
              </div>
              <div className="rounded-2xl rounded-tr-sm bg-primary p-md font-body-md text-body-md text-on-primary shadow-[0_4px_8px_rgba(0,32,78,0.08)]">
                {t.content}
              </div>
            </div>
          ),
        )}
        {pending && !researchJob && (
          <div className="flex gap-sm">
            <button
              className="rounded-full bg-primary px-md py-sm font-label-md text-label-md text-on-primary"
              onClick={startResearch}
            >
              예, 리서치 진행
            </button>
            <button
              className="rounded-full bg-surface-container-high px-md py-sm font-label-md text-label-md text-on-surface-variant"
              onClick={() => setPending(null)}
            >
              아니오
            </button>
          </div>
        )}
      </div>

      {/* 하단: 모드 토글 + 입력 */}
      <div className="flex flex-col gap-md border-t border-surface-border px-lg py-md shadow-[0_-4px_12px_rgba(0,32,78,0.04)]">
        <div className="flex items-center justify-center">
          <div className="inline-flex rounded-full border border-surface-border bg-surface-container-high p-1">
            <button
              onClick={() => setMode('internal')}
              className={`flex items-center gap-2 rounded-full px-md py-sm font-label-md text-label-md transition-all ${
                mode === 'internal'
                  ? 'bg-surface-container-lowest text-primary shadow-[0_2px_4px_rgba(0,32,78,0.08)]'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <Icon name="database" className="text-[16px]" /> 내부 데이터
            </button>
            <button
              onClick={() => setMode('external')}
              className={`flex items-center gap-2 rounded-full px-md py-sm font-label-md text-label-md transition-all ${
                mode === 'external'
                  ? 'bg-surface-container-lowest text-primary shadow-[0_2px_4px_rgba(0,32,78,0.08)]'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <Icon name="travel_explore" className="text-[16px]" /> 외부 리서치
            </button>
          </div>
        </div>

        <form
          className="flex items-center gap-sm"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <input
            className="h-[48px] w-full rounded-lg border border-surface-border bg-surface px-md font-body-md text-body-md text-on-surface placeholder:text-text-disabled focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="질문을 입력하세요…"
            aria-label="질문 입력"
          />
          <button
            type="submit"
            aria-label="전송"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_2px_4px_rgba(0,32,78,0.16)] transition-colors hover:bg-primary-container hover:text-on-primary-container"
          >
            <Icon name="send" className="text-[18px]" />
          </button>
        </form>
        <p className="text-center font-label-sm text-label-sm text-text-disabled">
          AI 응답에는 부정확한 내용이 있을 수 있습니다. 중요한 정보는 확인해 주세요.
        </p>
      </div>
    </div>
  )
}
