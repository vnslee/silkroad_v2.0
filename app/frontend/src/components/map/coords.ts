// 국가 코드 → 대표 좌표[lon, lat]. 마커 배치용 간이 테이블(Q7=A).
// research 보유 국가 전체. 확장 시 world-atlas 중심 계산으로 대체 가능.
// (data/research/country/<CODE> 가 추가되면 여기에 좌표를 등록해야 지도에 마커가 뜬다.)
export const COUNTRY_COORDS: Record<string, [number, number]> = {
  AR: [-63.62, -38.42], // Argentina
  AT: [14.55, 47.52], // Austria
  BR: [-51.93, -14.24], // Brazil
  CA: [-106.35, 56.13], // Canada
  CL: [-71.54, -35.68], // Chile
  CN: [104.2, 35.86], // China
  DK: [9.5, 56.26], // Denmark
  ES: [-3.75, 40.46], // Spain
  FR: [2.21, 46.23], // France
  GB: [-3.44, 55.38], // United Kingdom
  ID: [113.92, -0.79], // Indonesia
  IN: [78.96, 20.59], // India
  IT: [12.57, 41.87], // Italy
  MX: [-102.55, 23.63], // Mexico
  NL: [5.29, 52.13], // Netherlands
  PL: [19.15, 51.92], // Poland
  PR: [-66.59, 18.22], // Puerto Rico
  PT: [-8.22, 39.4], // Portugal
}
