// FT-5: 룰셋 가중치 검증 — 합 100 판정·범위 클램프.
import { describe, expect, it } from 'vitest'
import { clamp, isWeightsValid, weightsSum } from '../components/ruleset/validation'

describe('ruleset validation', () => {
  it('합 100이면 valid', () => {
    expect(isWeightsValid({ market: 25, regulation: 25, environment: 25, system: 25 })).toBe(true)
  })
  it('합 100이 아니면 invalid', () => {
    expect(isWeightsValid({ market: 30, regulation: 25, environment: 25, system: 25 })).toBe(false)
    expect(weightsSum({ market: 30, regulation: 25, environment: 25, system: 25 })).toBe(105)
  })
  it('clamp 범위 제한', () => {
    expect(clamp(120, 0, 100)).toBe(100)
    expect(clamp(-5, 0, 100)).toBe(0)
    expect(clamp(0.7, 0, 1)).toBe(0.7)
  })
})
