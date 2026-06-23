// 범례(C4, FR-2.3) — AISea 좌하단 blur 칩. 색+텍스트 병행(AR-5).
// 마커 2종(기진출국·진출후보국)만 표시. 권역색은 hover 시에만 나타나므로 상시 범례에서 제외.
export function Legend() {
  return (
    <div className="absolute bottom-lg left-lg z-chrome flex items-center gap-md rounded-[11px] border border-surface-border bg-[rgba(255,255,255,0.92)] px-md py-sm font-label-md text-[11.5px] text-on-surface-variant shadow-[0_4px_14px_rgba(20,23,28,0.06)] backdrop-blur-[8px]">
      <span className="font-semibold text-on-surface">진출 현황</span>
      <span className="flex items-center gap-xs">
        <span className="h-[11px] w-[11px] rounded-full border-[1.5px] border-white bg-[#1B3451] shadow-[0_0_0_1.5px_#1B3451]" />
        기진출국
      </span>
      <span className="flex items-center gap-xs">
        <span className="h-[11px] w-[11px] rounded-full border-[1.5px] border-white bg-primary shadow-[0_0_0_1.5px_#3F6CB4]" />
        진출후보국
      </span>
    </div>
  )
}
