// RulesetForm(C8, FR-6, Q5=A) — 3패널 폼 + 합 100 검증. 저장은 localStorage placeholder(백엔드 API 부재).
import { useState } from 'react'
import { type CategoryWeights, clamp, isWeightsValid, weightsSum } from './validation'

const STORAGE_KEY = 'silkroad.ruleset.draft'

export default function RulesetForm() {
  const [weights, setWeights] = useState<CategoryWeights>({
    market: 25,
    regulation: 25,
    environment: 25,
    system: 25,
  })
  const [thresholds, setThresholds] = useState({ transferThreshold: 50, systemGate: 50 })
  const [sources, setSources] = useState({ tier1: 1.0, tier2: 0.7, tier3: 0.4 })
  const [saved, setSaved] = useState(false)

  const sum = weightsSum(weights)
  const valid = isWeightsValid(weights)

  const setWeight = (k: keyof CategoryWeights, v: number) =>
    setWeights((w) => ({ ...w, [k]: clamp(v, 0, 100) }))

  const onSave = () => {
    // 백엔드 룰셋 저장 API 부재(Q5=A) → localStorage 임시 저장 + 후속 연동 안내
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ weights, thresholds, sources }))
    setSaved(true)
  }

  return (
    <div className="mx-auto max-w-4xl p-lg">
      <div className="mb-lg flex items-center justify-between">
        <h2 className="text-headline-lg text-on-surface">룰셋 설정</h2>
        <button
          className="rounded bg-primary px-lg py-sm text-on-primary disabled:opacity-40"
          disabled={!valid}
          onClick={onSave}
        >
          저장
        </button>
      </div>

      {/* 패널 1: 카테고리 가중치 */}
      <fieldset className="mb-lg rounded-md border border-surface-border p-md">
        <legend className="px-sm text-label-md uppercase text-on-surface-variant">
          카테고리 가중치 (합 {sum}%{!valid && ' — 100%여야 합니다'})
        </legend>
        {(['market', 'regulation', 'environment', 'system'] as const).map((k) => (
          <label key={k} className="mb-sm flex items-center gap-md">
            <span className="w-24 text-body-md capitalize">{k}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={weights[k]}
              onChange={(e) => setWeight(k, Number(e.target.value))}
              className="flex-1"
              aria-label={`${k} 가중치`}
            />
            <span className="w-12 text-right text-body-sm">{weights[k]}%</span>
          </label>
        ))}
        {!valid && (
          <p className="text-body-sm text-on-error-container">가중치 합이 100%가 되어야 저장할 수 있습니다.</p>
        )}
      </fieldset>

      {/* 패널 2: 임계값 신뢰 계수 */}
      <fieldset className="mb-lg rounded-md border border-surface-border p-md">
        <legend className="px-sm text-label-md uppercase text-on-surface-variant">임계값 계수 (0~100)</legend>
        <label className="mb-sm flex items-center gap-md">
          <span className="w-32 text-body-md">이식 임계</span>
          <input
            type="number"
            min={0}
            max={100}
            value={thresholds.transferThreshold}
            onChange={(e) =>
              setThresholds((t) => ({ ...t, transferThreshold: clamp(Number(e.target.value), 0, 100) }))
            }
            className="w-24 rounded border border-surface-border px-sm py-xs"
          />
        </label>
        <label className="flex items-center gap-md">
          <span className="w-32 text-body-md">시스템 게이트</span>
          <input
            type="number"
            min={0}
            max={100}
            value={thresholds.systemGate}
            onChange={(e) =>
              setThresholds((t) => ({ ...t, systemGate: clamp(Number(e.target.value), 0, 100) }))
            }
            className="w-24 rounded border border-surface-border px-sm py-xs"
          />
        </label>
      </fieldset>

      {/* 패널 3: 출처 신뢰 계수 */}
      <fieldset className="mb-lg rounded-md border border-surface-border p-md">
        <legend className="px-sm text-label-md uppercase text-on-surface-variant">출처 신뢰 계수 (0~1.0)</legend>
        {(['tier1', 'tier2', 'tier3'] as const).map((k) => (
          <label key={k} className="mb-sm flex items-center gap-md">
            <span className="w-24 text-body-md uppercase">{k}</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={sources[k]}
              onChange={(e) => setSources((s) => ({ ...s, [k]: clamp(Number(e.target.value), 0, 1) }))}
              className="w-24 rounded border border-surface-border px-sm py-xs"
            />
          </label>
        ))}
      </fieldset>

      {saved && (
        <p className="text-body-sm text-on-surface-variant">
          임시 저장되었습니다(브라우저). 백엔드 룰셋 저장 API 연동은 후속 작업입니다.
        </p>
      )}
    </div>
  )
}
