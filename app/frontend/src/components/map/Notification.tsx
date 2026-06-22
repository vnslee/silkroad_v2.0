// Notification(C4, FR-2.4·§6.1) — 지도 상단 안내, 진입 경로 진행 시 페이드아웃.
interface Props {
  message: string
  visible: boolean
}

export function Notification({ message, visible }: Props) {
  if (!visible) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute left-1/2 top-20 z-chrome -translate-x-1/2 rounded-full bg-primary px-lg py-sm text-body-sm text-on-primary shadow-md transition-opacity"
    >
      {message}
    </div>
  )
}
