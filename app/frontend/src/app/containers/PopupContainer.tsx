// 팝업 모드 컨테이너(§5.1) — M1 지도 위 오버레이(지도 반투명), 우상단 닫기·Esc·포커스 트랩(AR-3).
// 화면 컴포넌트는 모드 무지(Q2=A); 컨테이너만 사이즈/노출 결정.
// 고정 높이(85vh)를 줘서 자식의 h-full(iframe·flex)이 0으로 접히지 않게 한다.
import { useEffect, useRef } from 'react'
import { Icon } from '../../components/common/Icon'

interface Props {
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function PopupContainer({ onClose, title, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-popup flex items-center justify-center bg-on-surface/40 p-md backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      {/* 콘텐츠 — 바깥 클릭 닫힘 방지(stopPropagation), 고정 높이로 자식 h-full 보장 */}
      <div
        ref={ref}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-[0_24px_48px_rgba(0,32,78,0.24)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-md top-md z-chrome flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <Icon name="close" className="text-[20px]" />
        </button>
        {children}
      </div>
    </div>
  )
}
