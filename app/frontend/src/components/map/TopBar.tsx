// 상단 바(C4, FR-2.4) — AISea mockup 스타일 1단 헤더.
// 좌→우: (로고 블록=CI+AISea) · (내비: 지도/국가 분석▾/권역 분석▾/보고서▾/룰셋) · spacer · (국가 검색) · (한/EN 토글)
// 레이아웃 탭·챗 버튼은 제외(사용자 결정). 드롭다운 항목은 실제 카탈로그로 채우고 상태배지 표기(가짜 점수 금지).
import { useState } from 'react'
import type { CountrySummary, Domain, RegionSummary } from '../../api/types'
import { store, useStore } from '../../store'
import { HyundaiCapitalCI } from '../common/HyundaiCapitalCI'

interface Props {
  countries: CountrySummary[]
  regions: RegionSummary[]
  /** 지도(홈) 활성 여부 — 내비 '지도' 강조. */
  onMap: boolean
  /** '지도' 복귀(알림 재노출 등 부수효과). */
  onGoMap: () => void
}

type MenuKey = 'country' | 'region' | 'report' | null

function nav(hash: string) {
  window.location.hash = hash
}

function statusBadge(c: { is_baseline?: boolean; has_report: boolean }): {
  label: string
  cls: string
} {
  if (c.is_baseline) return { label: '기준국', cls: 'bg-secondary-fixed text-on-secondary-fixed-variant' }
  if (c.has_report) return { label: '진출', cls: 'bg-success-container text-success' }
  return { label: '예정', cls: 'bg-surface-container text-text-secondary' }
}

export function TopBar({ countries, regions, onMap, onGoMap }: Props) {
  const [menu, setMenu] = useState<MenuKey>(null)
  const [search, setSearch] = useState('')
  const lang = useStore((s) => s.lang)

  const blue = onMap ? 'text-primary' : 'text-on-surface-variant'
  const close = () => setMenu(null)
  const toggle = (k: Exclude<MenuKey, null>) => setMenu((m) => (m === k ? null : k))

  // 검색 — name/name_ko/code 부분일치, 첫 매칭국으로 팝업 진입(AISea mockup onSearchKey 패턴).
  const runSearch = () => {
    const q = search.trim().toLowerCase()
    if (!q) return
    const hit = countries.find(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.name_ko ?? '').toLowerCase().includes(q),
    )
    if (hit) {
      close()
      setSearch('')
      nav(`#/country/${hit.code}/detail?mode=popup`)
    }
  }

  return (
    <header
      className="absolute inset-x-0 top-0 z-chrome flex h-[60px] items-center gap-md border-b border-surface-border bg-[rgba(243,246,249,0.86)] px-lg backdrop-blur-[14px]"
    >
      {/* 로고 블록 — CI + 구분선 + AISea(mono). 클릭 시 메인 지도로. */}
      <button
        type="button"
        onClick={() => {
          close()
          onGoMap()
        }}
        aria-label="메인 지도로 이동"
        className="flex flex-none items-center gap-md rounded-lg pr-xs transition-opacity hover:opacity-80"
      >
        <HyundaiCapitalCI />
        <span className="h-[17px] w-px bg-surface-border" />
        <span className="font-mono text-[18px] font-bold tracking-tight text-on-surface">AISea</span>
      </button>

      {/* 내비 — 각 항목별 드롭다운을 트리거 아래에 앵커 */}
      <nav className="flex flex-none items-center gap-[2px] whitespace-nowrap text-[14px]">
        <button
          onClick={() => {
            close()
            onGoMap()
          }}
          className={`rounded-lg px-md py-sm font-medium ${blue}`}
        >
          지도
        </button>
        <NavMenu
          label="국가 분석"
          open={menu === 'country'}
          onToggle={() => toggle('country')}
          onClose={close}
        >
          <Dropdown title="국가 정보 · 풀사이즈">
            {countries.slice(0, 8).map((c) => {
              const b = statusBadge(c)
              return (
                <DropdownRow
                  key={c.code}
                  onClick={() => {
                    close()
                    nav(`#/country/${c.code}/detail?mode=fullscreen`)
                  }}
                >
                  <span className="truncate">{c.name_ko ? `${c.name_ko} (${c.name})` : c.name}</span>
                  <span className={`rounded px-sm py-[1px] font-label-sm text-label-sm ${b.cls}`}>{b.label}</span>
                </DropdownRow>
              )
            })}
          </Dropdown>
        </NavMenu>
        <NavMenu
          label="권역 분석"
          open={menu === 'region'}
          onToggle={() => toggle('region')}
          onClose={close}
        >
          <Dropdown title="권역 정보 · 풀사이즈">
            {regions.map((r) => {
              const b = statusBadge(r)
              return (
                <DropdownRow
                  key={r.code}
                  onClick={() => {
                    close()
                    nav(`#/region/${r.code}/detail?mode=fullscreen`)
                  }}
                >
                  <span className="truncate">{r.name_ko ? `${r.name_ko} (${r.name})` : r.name}</span>
                  <span className={`rounded px-sm py-[1px] font-label-sm text-label-sm ${b.cls}`}>{b.label}</span>
                </DropdownRow>
              )
            })}
          </Dropdown>
        </NavMenu>
        <NavMenu
          label="보고서"
          open={menu === 'report'}
          onToggle={() => toggle('report')}
          onClose={close}
        >
          <Dropdown title="진단 보고서 · 풀사이즈">
            <DropdownRow
              onClick={() => {
                close()
                openFirstReport('country', countries)
              }}
            >
              <span>📄 국가 진단 보고서</span>
            </DropdownRow>
            <DropdownRow
              onClick={() => {
                close()
                openFirstReport('region', regions)
              }}
            >
              <span>🗂️ 권역 진단 보고서</span>
            </DropdownRow>
          </Dropdown>
        </NavMenu>
        <button
          onClick={() => {
            close()
            nav('#/ruleset?mode=fullscreen')
          }}
          className="rounded-lg px-md py-sm font-medium text-on-surface-variant"
        >
          룰셋
        </button>
      </nav>

      <div className="flex-1" />

      {/* 국가 검색 */}
      <div className="flex flex-none items-center gap-sm rounded-[9px] border border-surface-border bg-surface-container-lowest px-md py-[7px]">
        <span className="text-[13px] text-outline">⌕</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runSearch()
          }}
          placeholder="국가 검색…"
          aria-label="국가 검색"
          className="w-[160px] bg-transparent font-body-sm text-[13px] text-on-surface outline-none placeholder:text-outline"
        />
      </div>

      {/* 한/EN 번역 토글 */}
      <button
        type="button"
        onClick={() => store.setLang(lang === 'ko' ? 'en' : 'ko')}
        aria-label={lang === 'ko' ? '영문으로 전환' : '한글로 전환'}
        className="flex flex-none items-center gap-xs rounded-lg border border-surface-border bg-surface-container-lowest px-sm py-xs font-label-md text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
      >
        <span className={lang === 'ko' ? 'text-primary' : ''}>한</span>
        <span className="text-outline-variant">/</span>
        <span className={lang === 'en' ? 'text-primary' : ''}>EN</span>
      </button>
    </header>
  )
}

// 내비 메뉴 항목 — 트리거 버튼 + (열림 시) 트리거 아래 앵커된 드롭다운.
function NavMenu({
  label,
  open,
  onToggle,
  onClose,
  children,
}: {
  label: string
  open: boolean
  onToggle: () => void
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-xs rounded-lg px-md py-sm font-medium text-on-surface-variant"
      >
        {label}
        <span className="text-[9px] opacity-50">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[1]" onClick={onClose} />
          {children}
        </>
      )}
    </div>
  )
}

function Dropdown({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      role="menu"
      className="absolute left-0 top-[calc(100%+6px)] z-[2] w-[244px] animate-aisea-pop rounded-[13px] border border-surface-border bg-surface-container-lowest p-[7px] shadow-[0_16px_44px_rgba(20,23,28,0.14)]"
    >
      <div className="px-md pb-xs pt-sm font-label-sm text-label-sm tracking-wide text-outline">{title}</div>
      {children}
    </div>
  )
}

function DropdownRow({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-sm rounded-[9px] px-md py-sm text-left font-body-sm text-body-sm transition-colors hover:bg-surface-container"
    >
      {children}
    </button>
  )
}

// 보고서 메뉴 — 보고서 보유 첫 대상으로 풀사이즈 진입(없으면 첫 항목).
function openFirstReport(
  domain: Domain,
  list: Array<{ code: string; has_report: boolean }>,
) {
  const target = list.find((x) => x.has_report) ?? list[0]
  if (target) nav(`#/${domain}/${target.code}/report?mode=fullscreen`)
}
