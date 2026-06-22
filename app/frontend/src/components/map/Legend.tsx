// 범례(C4, FR-2.3) — mockup M1 우상단 Market Overview 카드 충실 재현. 색+텍스트 병행(AR-5).
export function Legend() {
  return (
    <div className="absolute right-lg top-lg z-chrome w-64 rounded-lg border border-surface-border bg-surface p-md shadow-[0_4px_12px_rgba(0,32,78,0.08)]">
      <h3 className="mb-sm font-label-md text-label-md uppercase tracking-wider text-text-secondary">
        진출 현황
      </h3>
      <div className="flex flex-col gap-sm">
        <div className="flex items-center gap-sm">
          <div className="h-3 w-3 rounded-full bg-secondary shadow-sm" />
          <span className="font-body-sm text-body-sm text-on-surface">진출국 (Active)</span>
        </div>
        <div className="flex items-center gap-sm">
          <div className="h-3 w-3 rounded-full border-2 border-dashed border-primary-container bg-transparent" />
          <span className="font-body-sm text-body-sm text-on-surface">진출예정국 (Planned)</span>
        </div>
      </div>
    </div>
  )
}
