// 국가 코드 → 대표 좌표[lon, lat]. 마커 배치용 간이 테이블(Q7=A).
// research 보유 10개국 + 주요국. 확장 시 world-atlas 중심 계산으로 대체 가능.
export const COUNTRY_COORDS: Record<string, [number, number]> = {
  AT: [14.55, 47.52], // Austria
  BR: [-51.93, -14.24], // Brazil
  DK: [9.5, 56.26], // Denmark
  ES: [-3.75, 40.46], // Spain
  GB: [-3.44, 55.38], // United Kingdom
  IT: [12.57, 41.87], // Italy
  MX: [-102.55, 23.63], // Mexico
  NL: [5.29, 52.13], // Netherlands
  PL: [19.15, 51.92], // Poland
  PT: [-8.22, 39.4], // Portugal
}
