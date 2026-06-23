// ProgressPanel(C9, FR-7.2·§5.3) — AISea 우상단 진행 패널.
// 잡별 카드: 전체 진행률 + 확장/축소로 상세 단계 바(리서치=시장·규제·상품·시스템·결과 생성,
// 보고서=데이터·렌더링·완료) + 닫기. 챗봇 상단 오버레이를 대체하는 단일 진행 표시 주체.
import { useState } from 'react'
import { useStore, store } from '../../store'
import { useJobPolling } from '../../hooks/useJobPolling'
import { mapStepToBars, overallPercent } from '../../utils/progress'
import type { JobRef } from '../../store'

export function ProgressPanel() {
  const jobs = useStore((s) => s.activeJobs)
  // 패널 전체 숨김/보임 — 카드별 확장/축소와는 별개의 패널 레벨 토글.
  const [hidden, setHidden] = useState(false)
  if (jobs.length === 0) return null

  // 숨김 상태: 우상단에 잡 개수 배지가 달린 작은 플로팅 버튼만 노출.
  // ⚠️ JobCard는 언마운트하지 않고 CSS(hidden)로만 감춘다 — 숨긴 중에도 폴링 유지.
  if (hidden) {
    return (
      <>
        <button
          onClick={() => setHidden(false)}
          aria-label={`진행 패널 보이기 (진행 중 ${jobs.length}건)`}
          className="animate-aisea-slide fixed right-lg top-[72px] z-overlay flex items-center gap-xs rounded-full border border-surface-border bg-surface-container-lowest px-md py-sm shadow-[0_12px_36px_rgba(20,23,28,0.14)] transition-colors hover:bg-surface-container"
        >
          <span className="h-[16px] w-[16px] flex-none animate-aisea-spin rounded-full border-[2.5px] border-surface-border border-t-primary" />
          <span className="font-body-sm text-[13px] font-bold">진행 상황</span>
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-on-primary">
            {jobs.length}
          </span>
        </button>
        {/* 폴링 유지를 위해 마운트만 하고 화면에서는 감춘다 */}
        <div className="hidden">
          {jobs.map((job) => (
            <JobCard key={job.jobId} job={job} />
          ))}
        </div>
      </>
    )
  }

  // 잡이 여럿이면 세로로 쌓되, 최신이 위로 오게.
  return (
    <div className="fixed right-lg top-[72px] z-overlay flex w-[300px] flex-col gap-sm">
      {/* 패널 헤더: 제목 + 전체 숨기기 토글 */}
      <div className="flex items-center justify-between px-1">
        <span className="font-label-sm text-label-sm text-outline">진행 상황 ({jobs.length})</span>
        <button
          onClick={() => setHidden(true)}
          aria-label="진행 패널 숨기기"
          className="flex h-[26px] w-[26px] items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          <span className="text-[15px] leading-none">–</span>
        </button>
      </div>
      {[...jobs].reverse().map((job) => (
        <JobCard key={job.jobId} job={job} />
      ))}
    </div>
  )
}

// 단일 잡 진행 카드 — 폴링 + 확장/축소 + 닫기 + (보고서) 열기.
function JobCard({ job }: { job: JobRef }) {
  const [expanded, setExpanded] = useState(true)
  const { step, percent, status, result, agents } = useJobPolling(job.jobId)
  const pct = overallPercent(percent)
  const done = status === 'succeeded'
  const failed = status === 'failed'
  const bars = step ? mapStepToBars(job.kind, step, percent, agents, job.domain) : []
  const reportId =
    result && 'report_id' in result ? (result as { report_id: string }).report_id : null

  const subtitle = failed
    ? '오류 발생'
    : done
      ? '생성 완료'
      : job.kind === 'report'
        ? '보고서 생성 중…'
        : job.kind === 'research'
          ? '리서치 진행 중…'
          : '진행 중…'

  const openReport = () => {
    store.removeJob(job.jobId)
    window.location.hash = `#/${job.domain}/${job.id}/report/${reportId}?mode=popup`
  }

  return (
    <div className="animate-aisea-slide rounded-[15px] border border-surface-border bg-surface-container-lowest p-md shadow-[0_12px_36px_rgba(20,23,28,0.14)]">
      {/* 헤더: 상태 아이콘 + 라벨 + 확장토글 + 닫기 */}
      <div className="mb-md flex items-center gap-sm">
        {done ? (
          <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-success text-[12px] text-on-primary">
            ✓
          </span>
        ) : failed ? (
          <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-error text-[12px] text-on-primary">
            !
          </span>
        ) : (
          <span className="h-[18px] w-[18px] flex-none animate-aisea-spin rounded-full border-[2.5px] border-surface-border border-t-primary" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-body-sm text-[13.5px] font-bold">{job.label}</div>
          <div className={`font-label-sm text-label-sm ${failed ? 'text-on-error-container' : 'text-outline'}`}>
            {subtitle}
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? '상세 접기' : '상세 펼치기'}
          aria-expanded={expanded}
          className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          <span className={`text-[12px] transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
        </button>
        <button
          onClick={() => store.removeJob(job.jobId)}
          aria-label="진행 카드 닫기"
          className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          <span className="text-[13px] leading-none">✕</span>
        </button>
      </div>

      {/* 전체 진행 바 */}
      <div className="mb-md flex items-center gap-sm">
        <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-surface-container">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              failed ? 'bg-error' : done ? 'bg-success' : 'bg-primary'
            }`}
            style={{ width: `${failed ? 100 : pct}%` }}
          />
        </div>
        <span className={`mono text-[13px] font-bold ${done ? 'text-success' : failed ? 'text-on-error-container' : 'text-primary'}`}>
          {pct}%
        </span>
      </div>

      {/* 상세 단계 바(확장 시) — 시장·규제·상품·시스템·결과 생성 등 */}
      {expanded && bars.length > 0 && (
        <div className="mb-md flex flex-col gap-xs border-t border-surface-border pt-md">
          {bars.map((b) => (
            <div key={b.key} className="flex items-center gap-sm">
              <span
                className={`flex-none font-label-sm text-label-sm ${
                  b.state === 'done'
                    ? 'text-success'
                    : b.state === 'failed'
                      ? 'text-on-error-container'
                      : b.state === 'active'
                        ? 'text-primary'
                        : 'text-on-surface-variant'
                }`}
                style={{ width: 76 }}
              >
                {b.state === 'done' ? '✓ ' : b.state === 'failed' ? '⚠ ' : ''}
                {b.label}
              </span>
              <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-surface-container">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    b.state === 'done'
                      ? 'bg-success'
                      : b.state === 'failed'
                        ? 'bg-error'
                        : 'bg-primary'
                  }`}
                  style={{ width: `${b.state === 'failed' ? 100 : b.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 보고서 완료 시 열기 버튼 */}
      {done && job.kind === 'report' && reportId && (
        <button
          onClick={openReport}
          className="w-full rounded-[10px] bg-success py-sm text-center font-body-sm text-[13px] font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          보고서 열기 →
        </button>
      )}
    </div>
  )
}
