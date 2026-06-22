// ProgressPanel(C9, FR-7.2·§5.3) — 진행 중 잡 있고 PS2 비활성이면 우상단 카드.
// 상세보기 → ProgressModal 정중앙. 진행 없으면 미렌더.
import { useState } from 'react'
import { useStore, store } from '../../store'
import { ProgressModal } from './ProgressModal'

export function ProgressPanel() {
  const jobs = useStore((s) => s.activeJobs)
  const [openJobId, setOpenJobId] = useState<string | null>(null)

  if (jobs.length === 0) return null

  const openJob = jobs.find((j) => j.jobId === openJobId)

  return (
    <>
      {/* 우상단 카드 — PS2(모달) 비활성 시 */}
      {!openJob && (
        <div className="fixed right-md top-20 z-overlay w-64 rounded-md bg-surface-container-lowest p-md shadow-lg">
          <h3 className="mb-sm text-label-md uppercase text-on-surface-variant">진행 중</h3>
          <ul className="space-y-sm">
            {jobs.map((j) => (
              <li key={j.jobId} className="flex items-center justify-between text-body-sm">
                <span className="truncate">{j.label}</span>
                <button
                  className="text-secondary hover:underline"
                  onClick={() => setOpenJobId(j.jobId)}
                >
                  상세보기
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* PS2 모달 — 정중앙 */}
      {openJob && (
        <div className="fixed inset-0 z-popup flex items-center justify-center bg-on-surface/40 p-md">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-md bg-surface-container-lowest shadow-xl">
            <button
              aria-label="닫기"
              className="absolute right-md top-md text-on-surface-variant"
              onClick={() => setOpenJobId(null)}
            >
              ✕
            </button>
            <ProgressModal
              jobId={openJob.jobId}
              kind={openJob.kind}
              onViewReport={(reportId) => {
                store.removeJob(openJob.jobId)
                setOpenJobId(null)
                window.location.hash = `#/${openJob.domain}/${openJob.id}/report/${reportId}?mode=popup`
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
