// API 클라이언트(C2) — fetch 래퍼 + 호출 메서드. 서버상태 라이브러리 없이 경량(Q6=A).
// HTML/PDF·detail GET 은 fetch 하지 않고 paths.*() URL 을 iframe src / anchor 로 직접 사용.
import { paths } from './paths'
import type {
  ChatRequest,
  ChatResponse,
  CountrySummary,
  Domain,
  ExistenceInfo,
  JobCreatedResponse,
  JobStatus,
  RegionSummary,
  ReportListResponse,
  ResearchTriggerRequest,
} from './types'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let resp: Response
  try {
    resp = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    })
  } catch (e) {
    throw new ApiError(0, `네트워크 오류: ${String(e)}`)
  }
  if (!resp.ok) {
    let detail = resp.statusText
    try {
      const body = await resp.json()
      detail = body?.detail ?? detail
    } catch {
      /* 본문 파싱 실패는 무시 */
    }
    throw new ApiError(resp.status, detail)
  }
  if (resp.status === 204) return undefined as T
  return (await resp.json()) as T
}

export const api = {
  // 카탈로그
  getCountries: () => request<CountrySummary[]>(paths.countries()),
  getRegions: () => request<RegionSummary[]>(paths.regions()),
  getExistence: (domain: Domain, id: string) =>
    request<ExistenceInfo>(paths.existence(domain, id)),

  // 상세화면 비동기 렌더 잡(3차 확장). 동기 표시는 paths.detail() 을 iframe src 로.
  triggerDetail: (domain: Domain, id: string) =>
    request<JobCreatedResponse>(paths.detail(domain, id), { method: 'POST' }),
  // 상세 데이터 스냅샷 버전 목록(P1/P2 버전 선택)
  getDetailVersions: (domain: Domain, id: string) =>
    request<string[]>(paths.detailVersions(domain, id)),

  // 보고서
  listReports: (domain: Domain, id: string) =>
    request<ReportListResponse>(paths.reports(domain, id)),
  createReport: (domain: Domain, id: string) =>
    request<JobCreatedResponse>(paths.reports(domain, id), { method: 'POST' }),

  // 잡 폴링
  getJob: (jobId: string) => request<JobStatus>(paths.job(jobId)),

  // 리서치(비동기 잡)
  triggerResearch: (domain: Domain, id: string, body?: ResearchTriggerRequest) =>
    request<JobCreatedResponse>(paths.research(domain, id), {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),

  // 챗봇(동기)
  chat: (req: ChatRequest) =>
    request<ChatResponse>(paths.chat(), { method: 'POST', body: JSON.stringify(req) }),
}
