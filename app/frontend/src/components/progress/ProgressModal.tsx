// ProgressModal(C9/PS2, FR-7.1) — PS2 mockup 충실: 전체 진행(굵은 바) + 단계별 바 + 상태 배지.
import type { JobKind } from '../../api/types'
import { useJobPolling } from '../../hooks/useJobPolling'
import { mapStepToBars, overallPercent } from '../../utils/progress'
import { Icon } from '../common/Icon'

interface Props {
  jobId: string
  kind: JobKind
  onViewReport?: (reportId: string) => void
}

function StatusBadge({ state }: { state: 'pending' | 'active' | 'done' }) {
  if (state === 'active')
    return (
      <span className="animate-pulse rounded-full bg-primary/10 px-sm py-xs font-label-sm text-label-sm text-primary">
        분석 중…
      </span>
    )
  if (state === 'done')
    return (
      <span className="rounded-full bg-surface-variant px-sm py-xs font-label-sm text-label-sm text-on-surface-variant">
        완료
      </span>
    )
  return (
    <span className="rounded-full bg-surface-variant px-sm py-xs font-label-sm text-label-sm text-on-surface-variant">
      대기
    </span>
  )
}

export function ProgressModal({ jobId, kind, onViewReport }: Props) {
  const { step, percent, status, result } = useJobPolling(jobId)
  const bars = step ? mapStepToBars(kind, step, percent) : []
  const total = overallPercent(percent)
  const reportId =
    result && 'report_id' in result ? (result as { report_id: string }).report_id : null

  return (
    <div className="flex flex-col">
      <div className="border-b border-surface-border p-lg">
        <h2 className="mb-xs font-headline-md text-headline-md text-primary">진단 진행 상황</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          맞춤 보고서를 생성하고 있습니다
        </p>
      </div>

      <div className="flex flex-col gap-xl p-lg">
        {/* 전체 진행 — 굵은 바 */}
        <div>
          <div className="mb-sm flex justify-between font-headline-md text-headline-md text-primary">
            <span>전체 진행</span>
            <span>{total}%</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-surface-variant">
            <div
              className="h-4 rounded-full bg-primary-container transition-all duration-500"
              style={{ width: `${total}%` }}
            />
          </div>
        </div>

        <div className="h-px w-full bg-surface-border" />

        {/* 단계별 바 */}
        <div className="flex flex-col gap-lg">
          {bars.map((b) => (
            <div key={b.key} className="flex flex-col gap-xs">
              <div className="flex items-center justify-between">
                <span className="font-body-md font-medium text-on-surface">{b.label}</span>
                <StatusBadge state={b.state} />
              </div>
              <div className="flex items-center gap-md">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-variant">
                  <div
                    className="h-2 rounded-full bg-primary-container transition-all"
                    style={{ width: `${b.percent}%` }}
                  />
                </div>
                <span className="w-10 text-right font-body-sm font-semibold text-primary-container">
                  {b.percent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 푸터 */}
      <div className="flex justify-end gap-md border-t border-surface-border bg-surface-light p-lg">
        {status === 'succeeded' && reportId && onViewReport ? (
          <button
            className="flex items-center gap-sm rounded-lg bg-primary px-lg py-sm font-label-md text-label-md text-on-primary transition-transform hover:scale-[0.98]"
            onClick={() => onViewReport(reportId)}
          >
            <Icon name="visibility" className="text-[18px]" /> 보고서 보기
          </button>
        ) : (
          <button
            disabled
            className="flex cursor-not-allowed items-center gap-sm rounded-lg bg-surface-variant px-lg py-sm font-label-md text-label-md text-on-surface-variant shadow-sm"
          >
            <Icon name="lock" className="text-[18px]" /> 보고서 보기
          </button>
        )}
      </div>
      {status === 'failed' && (
        <p className="px-lg pb-lg font-body-sm text-on-error-container">진행 중 오류가 발생했습니다.</p>
      )}
    </div>
  )
}
