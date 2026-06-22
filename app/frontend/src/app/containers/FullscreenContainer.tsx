// 풀사이즈 모드 컨테이너(§5.1) — 전체 점유, 상단 메뉴 유지, 닫기 대신 뒤로.
interface Props {
  onBack: () => void
  title?: string
  children: React.ReactNode
}

export function FullscreenContainer({ onBack, title, children }: Props) {
  return (
    <section className="fixed inset-0 z-overlay flex flex-col bg-background" aria-label={title}>
      <div className="flex items-center gap-sm border-b border-surface-border px-margin-mobile py-sm md:px-margin-desktop">
        <button
          type="button"
          onClick={onBack}
          aria-label="뒤로 가기"
          className="rounded px-sm py-xs text-on-surface-variant hover:bg-surface-container"
        >
          ← 뒤로
        </button>
        {title && <h1 className="text-headline-md text-on-surface">{title}</h1>}
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </section>
  )
}
