// 범례(C4, FR-2.3) — AISea 좌하단 blur 칩. 색+텍스트 병행(AR-5). 의미는 진출 매력도/현황.
export function Legend() {
  return (
    <div className="absolute bottom-lg left-lg z-chrome flex items-center gap-md rounded-[11px] border border-surface-border bg-[rgba(255,255,255,0.92)] px-md py-sm font-label-md text-[11.5px] text-on-surface-variant shadow-[0_4px_14px_rgba(20,23,28,0.06)] backdrop-blur-[8px]">
      <span className="font-semibold text-on-surface">진출 현황</span>
      <span className="flex items-center gap-xs">
        <span className="h-[11px] w-[11px] rounded-full border-[1.5px] border-white bg-primary" />
        진출
      </span>
      <span className="flex items-center gap-xs">
        <span className="h-[11px] w-[11px] rounded-full border-[1.5px] border-dashed border-primary bg-white" />
        진출예정
      </span>
      <span className="flex items-center gap-xs">
        <span className="h-[11px] w-[11px] rounded-[3px] bg-[#D6C29A]" />
        진출 권역
      </span>
      <span className="flex items-center gap-xs">
        <span className="h-[11px] w-[11px] rounded-[3px] border border-dashed border-[#C2B492] bg-[#E7DEC8]" />
        미진출 권역
      </span>
    </div>
  )
}
