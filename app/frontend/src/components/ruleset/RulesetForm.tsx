// RulesetForm(C8, FR-6) — internal_latest.json의 실제 가중치/계수를 조회·편집·저장.
// 보고서 생성 엔진이 읽는 값(values·similarity_item_weights·tier_weights·decision_thresholds)을
// GET /api/ruleset 로 불러와 편집 후 PUT 으로 저장한다. 상단 드롭다운으로 과거 버전 스냅샷 로드 가능.
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { ApiError } from '../../api/client'
import type { RulesetPayload, RulesetSaveResult, RulesetVersionInfo } from '../../api/types'
import { clamp, isSumOne, sumWeights } from './validation'
import { SaveSuccessModal } from './SaveSuccessModal'

// 계수/임계 키 → 한글 라벨(없으면 키 그대로). 화면 가독성용.
const LABELS: Record<string, string> = {
  // report_blend
  w_biz: '사업매력도 비중',
  w_it: 'IT 준비도 비중',
  // decision_thresholds
  expansion_min_score: '확산 임계(≥ → B시스템 확산)',
  hq_build_min_score: '본사 구축 임계(≥ → 자체구축)',
}

const lbl = (k: string) => LABELS[k] ?? k

// 합이 1.0이어야 하는 가중치 그룹
const SUM_ONE_GROUPS = new Set([
  'biz_attractiveness',
  'it_readiness',
  'report_blend',
  'similarity_item_weights',
])

type WeightKey =
  | 'biz_attractiveness'
  | 'it_readiness'
  | 'report_blend'
  | 'similarity_item_weights'
  | 'tier_weights'
  | 'decision_thresholds'

export default function RulesetForm() {
  const [data, setData] = useState<RulesetPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // 저장 성공 시 결과(버전·스냅샷 파일) → 팝업 표시. null이면 팝업 닫힘.
  const [saveResult, setSaveResult] = useState<RulesetSaveResult | null>(null)
  // 버전 드롭다운 목록 + 현재 화면에 로드된 버전
  const [versions, setVersions] = useState<RulesetVersionInfo[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string>('')

  // 버전 목록 새로고침(초기·저장 후). 실패/비배열 응답이어도 본 폼은 동작하므로 빈 목록으로.
  const refreshVersions = () =>
    api
      .getRulesetVersions()
      .then((list) => setVersions(Array.isArray(list) ? list : []))
      .catch(() => undefined)

  useEffect(() => {
    let alive = true
    api
      .getRuleset()
      .then((d) => {
        if (!alive) return
        setData(d)
        setSelectedVersion(d.version ?? '')
      })
      .catch((e) =>
        alive && setLoadError(e instanceof ApiError ? e.message : '룰셋을 불러오지 못했습니다.'),
      )
    refreshVersions()
    return () => {
      alive = false
    }
  }, [])

  const setField = (group: WeightKey, key: string, value: number) => {
    setData((d) => (d ? { ...d, [group]: { ...d[group], [key]: value } } : d))
  }

  // 드롭다운에서 버전 선택 → 해당 버전 값 로드(latest는 plain GET, 그 외는 버전별 GET).
  const onSelectVersion = async (version: string) => {
    if (!version || version === selectedVersion) return
    setSaveError(null)
    const info = versions.find((v) => v.version === version)
    try {
      const loaded = info?.is_latest
        ? await api.getRuleset()
        : await api.getRulesetVersion(version)
      setData(loaded)
      setSelectedVersion(version)
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : `버전 v${version}을 불러오지 못했습니다.`)
    }
  }

  // 합=1.0 그룹들의 검증 상태(저장 가능 판정)
  const invalidGroups = useMemo(() => {
    if (!data) return []
    const bad: WeightKey[] = []
    for (const g of SUM_ONE_GROUPS) {
      const group = data[g as WeightKey] as Record<string, number>
      if (group && Object.keys(group).length && !isSumOne(group)) bad.push(g as WeightKey)
    }
    return bad
  }, [data])

  const canSave = !!data && invalidGroups.length === 0 && !saving
  // 최신 버전을 보고 있는지(드롭다운 안내 배지용). 목록이 비면 최신으로 간주.
  const isViewingLatest =
    versions.length === 0 || versions.some((v) => v.is_latest && v.version === selectedVersion)

  const onSave = async () => {
    if (!data) return
    setSaving(true)
    setSaveError(null)
    try {
      const out = await api.saveRuleset(data)
      setData(out.ruleset)
      setSaveResult(out)
      setSelectedVersion(out.version)
      await refreshVersions() // 새 버전 스냅샷을 드롭다운에 반영
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl p-lg">
        <h2 className="mb-md text-headline-lg text-on-surface">룰셋 설정</h2>
        <p className="text-body-md text-on-error-container">{loadError}</p>
      </div>
    )
  }
  if (!data) {
    return <div className="p-xl text-on-surface-variant">룰셋을 불러오는 중…</div>
  }

  return (
    <div className="mx-auto max-w-6xl p-lg">
      <div className="sticky top-0 z-10 mb-lg flex items-center justify-between gap-md bg-surface/95 py-sm backdrop-blur">
        <div>
          <h2 className="text-headline-lg text-on-surface">룰셋 설정</h2>
          <p className="text-body-sm text-on-surface-variant">보고서 생성에 쓰이는 가중치·계수</p>
        </div>
        <div className="flex items-center gap-md">
          <label className="flex items-center gap-sm text-body-sm text-on-surface-variant">
            버전
            <select
              className="rounded border border-surface-border bg-surface px-sm py-xs text-body-md text-on-surface"
              value={selectedVersion}
              onChange={(e) => onSelectVersion(e.target.value)}
              aria-label="룰셋 버전 선택"
            >
              {/* 현재 로드된 버전이 목록에 없을 수도 있어 안전하게 옵션 보강 */}
              {!versions.some((v) => v.version === selectedVersion) && selectedVersion && (
                <option value={selectedVersion}>v{selectedVersion}</option>
              )}
              {versions.map((v) => (
                <option key={v.file} value={v.version}>
                  v{v.version}
                  {v.is_latest ? ' (최신)' : ''}
                </option>
              ))}
            </select>
          </label>
          <button
            className="rounded bg-primary px-lg py-sm text-on-primary disabled:opacity-40"
            disabled={!canSave}
            onClick={onSave}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      {invalidGroups.length > 0 && (
        <p className="mb-md rounded bg-error-container px-md py-sm text-body-sm text-on-error-container">
          합이 100%가 아닌 가중치 그룹이 있어 저장할 수 없습니다.
        </p>
      )}

      {!isViewingLatest && (
        <p className="mb-md rounded bg-surface-container px-md py-sm text-body-sm text-on-surface-variant">
          과거 버전 <strong>v{selectedVersion}</strong>을 보고 있습니다. 저장하면 새 버전으로 기록됩니다.
        </p>
      )}

      {/* 2단: 좌=점수 가중치(합 100%) / 우=임계값·계수. 좁은 화면은 1단으로 떨어진다. */}
      <div className="grid grid-cols-1 gap-x-lg lg:grid-cols-2">
        {/* 좌열 — ① 점수 가중치 */}
        <section>
          <p className="mb-lg text-body-sm text-on-surface-variant">
            ① 점수 가중치 — 각 그룹 합이 <strong>100%(1.0)</strong>가 되어야 합니다.
          </p>

          <WeightGroup
            title="사업매력도 항목 가중치"
            hint="values.biz_attractiveness — 매력도 점수 산식 항목 비중"
            group="biz_attractiveness"
            values={data.biz_attractiveness}
            sumOne
            onChange={setField}
          />
          <WeightGroup
            title="IT 준비도 항목 가중치"
            hint="values.it_readiness — IT 준비도 점수 산식 항목 비중"
            group="it_readiness"
            values={data.it_readiness}
            sumOne
            onChange={setField}
          />
          <WeightGroup
            title="보고서 종합 점수 혼합비"
            hint="values.report_blend — 매력도↔IT 종합 점수 가중"
            group="report_blend"
            values={data.report_blend}
            sumOne
            onChange={setField}
          />
          <WeightGroup
            title="유사도 항목 가중치"
            hint="similarity_item_weights — 종합 유사도 산정 항목 비중"
            group="similarity_item_weights"
            values={data.similarity_item_weights}
            sumOne
            onChange={setField}
          />
        </section>

        {/* 우열 — ② 임계값·계수 */}
        <section>
          <p className="mb-lg text-body-sm text-on-surface-variant">② 임계값·계수</p>

          <WeightGroup
            title="출처 신뢰 계수 (Tier)"
            hint="tier_weights — 출처 신뢰도별 점수 가중 배수 (0~1.0). Tier1은 1.0 고정 권장"
            group="tier_weights"
            values={data.tier_weights}
            min={0}
            max={1}
            step={0.05}
            onChange={setField}
          />
          <WeightGroup
            title="시스템 결정 임계값"
            hint="decision_thresholds — 유사도 기반 시스템 전략 분기 (0~100)"
            group="decision_thresholds"
            values={data.decision_thresholds}
            min={0}
            max={100}
            step={1}
            onChange={setField}
          />
        </section>
      </div>

      {saveError && <p className="text-body-sm text-on-error-container">{saveError}</p>}

      {saveResult && (
        <SaveSuccessModal result={saveResult} onClose={() => setSaveResult(null)} />
      )}
    </div>
  )
}

// ── 가중치/계수 그룹 편집기 ──────────────────────────────────────
function WeightGroup({
  title,
  hint,
  group,
  values,
  sumOne = false,
  min = 0,
  max = 1,
  step = 0.05,
  onChange,
}: {
  title: string
  hint?: string
  group: WeightKey
  values: Record<string, number>
  sumOne?: boolean
  min?: number
  max?: number
  step?: number
  onChange: (group: WeightKey, key: string, value: number) => void
}) {
  const keys = Object.keys(values)
  if (keys.length === 0) return null

  const total = sumWeights(values)
  const valid = !sumOne || isSumOne(values)
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`

  return (
    <fieldset className="mb-lg rounded-md border border-surface-border p-md">
      <legend className="px-sm text-label-md uppercase text-on-surface-variant">
        {title}
        {sumOne && (
          <span className={valid ? 'text-on-surface-variant' : 'text-on-error-container'}>
            {' '}— 합 {pct(total)}
            {!valid && ' (100% 필요)'}
          </span>
        )}
      </legend>
      {hint && <p className="mb-sm px-sm text-body-sm text-on-surface-variant">{hint}</p>}
      {keys.map((k) => (
        <label key={k} className="mb-sm flex items-center gap-md">
          <span className="w-48 shrink-0 text-body-md">{lbl(k)}</span>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={values[k]}
            onChange={(e) => onChange(group, k, clamp(Number(e.target.value), min, max))}
            className="w-28 rounded border border-surface-border px-sm py-xs"
            aria-label={`${title} ${lbl(k)}`}
          />
          {sumOne && <span className="w-16 text-right text-body-sm text-on-surface-variant">{pct(values[k])}</span>}
        </label>
      ))}
    </fieldset>
  )
}
