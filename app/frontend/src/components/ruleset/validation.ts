// 룰셋 폼 검증(VR-1·2) — 순수 함수, 단위 테스트 대상(FT-5).
export interface CategoryWeights {
  market: number
  regulation: number
  environment: number
  system: number
}

export function weightsSum(w: CategoryWeights): number {
  return w.market + w.regulation + w.environment + w.system
}

export function isWeightsValid(w: CategoryWeights): boolean {
  return weightsSum(w) === 100
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
