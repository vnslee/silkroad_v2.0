// 상단 바(C4, FR-2.4) — mockup M1 헤더 충실 재현.
// 좌: CI 로고 영역 / 중앙: 타이틀+서브 / 우: 언어·설정. 메뉴 드롭다운(§5.4)은 로고 영역 클릭.
import { useState } from 'react'
import { store, useStore } from '../../store'
import { Icon } from '../common/Icon'

const MENU_ITEMS = [
  { key: 'map', label: '지도' },
  { key: 'country', label: '국가 진단' },
  { key: 'region', label: '권역 진단' },
  { key: 'ruleset', label: '룰셋 설정' },
  { key: 'about', label: '서비스 소개' },
]

interface Props {
  onMenuSelect?: (key: string) => void
}

export function TopBar({ onMenuSelect }: Props) {
  const [open, setOpen] = useState(false)
  const lang = useStore((s) => s.lang)

  return (
    <header className="absolute inset-x-0 top-0 z-chrome flex items-center justify-between border-b border-surface-border bg-surface-container-lowest px-lg py-md">
      {/* 좌: 로고/메뉴 */}
      <div className="relative flex flex-1 items-center">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="메뉴 열기"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-xs text-primary transition-opacity hover:opacity-80"
        >
          <Icon name="menu" />
          <span className="text-headline-md font-bold tracking-tight">Hyundai Capital</span>
        </button>
        {open && (
          <ul
            role="menu"
            className="absolute left-0 top-full mt-sm w-48 rounded-lg border border-surface-border bg-surface-container-lowest py-xs shadow-[0_4px_12px_rgba(0,32,78,0.12)]"
          >
            {MENU_ITEMS.map((m) => (
              <li key={m.key} role="none">
                <button
                  role="menuitem"
                  className="block w-full px-md py-sm text-left font-body-md text-on-surface transition-colors hover:bg-surface-variant"
                  onClick={() => {
                    setOpen(false)
                    onMenuSelect?.(m.key)
                  }}
                >
                  {m.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 중앙: 타이틀 */}
      <div className="flex flex-col items-center">
        <span className="font-headline-md text-headline-md font-bold tracking-tight text-primary">
          글로벌 진출 진단
        </span>
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
          Global Diagnostics
        </span>
      </div>

      {/* 우: 언어·설정 */}
      <div className="flex flex-1 justify-end gap-md">
        <button
          type="button"
          aria-label="언어 전환"
          onClick={() => store.setLang(lang === 'ko' ? 'en' : 'ko')}
          className="flex items-center gap-xs text-primary transition-opacity hover:opacity-80"
        >
          <Icon name="language" />
          <span className="font-label-md text-label-md">{lang === 'ko' ? '한' : 'EN'}</span>
        </button>
        <button
          type="button"
          aria-label="설정"
          className="text-primary transition-opacity hover:opacity-80"
        >
          <Icon name="settings" />
        </button>
      </div>
    </header>
  )
}
