// 상단 바(C4, FR-2.4) — 2단 헤더.
// 1행: (좌)AISea 로고 · (중앙)현대캐피탈 CI + 타이틀 정중앙 · (우)메뉴 접기/펴기 토글
// 2행: 내비 메뉴(지도/국가 분석▾/권역 분석▾/보고서▾/룰셋) — 토글로 숨길 수 있음.
// 드롭다운 항목은 실제 카탈로그(CountrySummary/RegionSummary)로 채우고 상태배지를 표기(가짜 점수 금지).
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
  const [navOpen, setNavOpen] = useState(true)

  const blue = onMap ? 'text-primary' : 'text-on-surface-variant'
  const close = () => setMenu(null)
  const toggle = (k: Exclude<MenuKey, null>) => setMenu((m) => (m === k ? null : k))
  const lang = useStore((s) => s.lang)

  return (
    <header className="absolute inset-x-0 top-0 z-chrome border-b border-surface-border bg-[rgba(255,255,255,0.86)] backdrop-blur-[14px]">
      {/* ── 1행: (좌)한/영 토글 · (중앙)CI 타이틀 · (우)메뉴 토글 ── */}
      <div className="relative flex h-[60px] items-center px-lg">
        {/* 좌: 한/영 번역 토글 */}
        <button
          type="button"
          onClick={() => store.setLang(lang === 'ko' ? 'en' : 'ko')}
          aria-label={lang === 'ko' ? '영문으로 전환' : '한글로 전환'}
          className="flex items-center gap-xs rounded-lg border border-surface-border bg-surface-container-lowest px-sm py-xs font-label-md text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          <span className={lang === 'ko' ? 'text-primary' : ''}>한</span>
          <span className="text-outline-variant">/</span>
          <span className={lang === 'en' ? 'text-primary' : ''}>EN</span>
        </button>

        {/* 중앙: 현대캐피탈 CI + 타이틀(정중앙 고정) — 클릭 시 메인 지도로 */}
        <button
          type="button"
          onClick={() => {
            close()
            onGoMap()
          }}
          aria-label="메인 지도로 이동"
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-md rounded-lg px-sm py-xs transition-opacity hover:opacity-80"
        >
          <HyundaiCapitalCI />
          <span className="h-[18px] w-px bg-surface-border" />
          <span className="font-headline-md text-[16px] font-bold tracking-tight text-on-surface">
            글로벌 진출 전략 Agent
          </span>
        </button>

        <div className="flex-1" />

        {/* 우: 메뉴 접기/펴기 */}
        <button
          type="button"
          onClick={() => {
            close()
            setNavOpen((v) => !v)
          }}
          aria-expanded={navOpen}
          aria-label={navOpen ? '메뉴 숨기기' : '메뉴 보기'}
          className="flex items-center gap-xs rounded-lg px-md py-sm font-label-md text-label-md font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          <span className="text-[15px] leading-none">☰</span>
          <span>메뉴</span>
        </button>
      </div>

      {/* ── 2행: 내비(접을 수 있음) — 중앙 정렬 + 옅은 투명 배경(경계 모호) ── */}
      {navOpen && (
        <nav className="relative flex h-[44px] items-center justify-center gap-[2px] border-t border-white/30 bg-white/20 px-lg text-[14px] backdrop-blur-[6px]">
          <button
            onClick={() => {
              close()
              onGoMap()
            }}
            className={`rounded-lg px-md py-sm font-medium ${blue}`}
          >
            지도
          </button>
          <NavItem label="국가 분석" open={menu === 'country'} onClick={() => toggle('country')} />
          <NavItem label="권역 분석" open={menu === 'region'} onClick={() => toggle('region')} />
          <NavItem label="보고서" open={menu === 'report'} onClick={() => toggle('report')} />
          <button
            onClick={() => {
              close()
              nav('#/ruleset?mode=fullscreen')
            }}
            className="rounded-lg px-md py-sm font-medium text-on-surface-variant"
          >
            룰셋
          </button>

          {/* 드롭다운들 — 중앙 정렬 메뉴 기준 가운데 표시 */}
          {menu && <div className="fixed inset-0 z-[1]" onClick={close} />}
          {menu === 'country' && (
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
                    <span className="truncate">
                      {c.name_ko ? `${c.name_ko} (${c.name})` : c.name}
                    </span>
                    <span className={`rounded px-sm py-[1px] font-label-sm text-label-sm ${b.cls}`}>{b.label}</span>
                  </DropdownRow>
                )
              })}
            </Dropdown>
          )}
          {menu === 'region' && (
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
          )}
          {menu === 'report' && (
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
          )}
        </nav>
      )}
    </header>
  )
}

function NavItem({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-haspopup="menu"
      aria-expanded={open}
      className="flex items-center gap-xs rounded-lg px-md py-sm font-medium text-on-surface-variant"
    >
      {label}
      <span className="text-[9px] opacity-50">▾</span>
    </button>
  )
}

function Dropdown({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      role="menu"
      className="absolute left-1/2 top-[40px] z-[2] w-[244px] -translate-x-1/2 animate-aisea-pop rounded-[13px] border border-surface-border bg-surface-container-lowest p-[7px] shadow-[0_16px_44px_rgba(20,23,28,0.14)]"
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
