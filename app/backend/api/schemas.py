"""Pydantic 모델 — 요청/응답·잡 상태 (C7).

Python 3.9 호환: `from __future__ import annotations` + typing.Optional/Literal 사용.
모든 모델은 model_dump() ↔ model_validate() 라운드트립 동치(PBT-02).
"""
from __future__ import annotations

from typing import Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field

Domain = Literal["country", "region"]
JobState = Literal["queued", "running", "succeeded", "failed"]
# 리서치 잡 step(calling_bedrock/saving)을 추가. 기존 보고서 잡 step은 불변(BR-COMPAT-1).
JobStep = Literal[
    "queued", "generating", "rendering", "calling_bedrock", "saving", "done"
]


# ── 카탈로그 (FR-1) ─────────────────────────────────────────────
class CountrySummary(BaseModel):
    code: str
    name: str
    name_ko: Optional[str] = None
    region: Optional[str] = None
    is_baseline: bool = False
    has_detail: bool = False
    has_report: bool = False


class RegionSummary(BaseModel):
    code: str
    name: str
    name_ko: Optional[str] = None
    baseline_country: Optional[str] = None
    has_detail: bool = False
    has_report: bool = False


class ExistenceInfo(BaseModel):
    domain: Domain
    target_id: str
    exists: bool
    has_detail: bool = False
    has_report: bool = False
    can_research: bool = True
    latest_report_id: Optional[str] = None


# ── 산출물 참조 (FR-4) ──────────────────────────────────────────
class ReportRef(BaseModel):
    report_id: str
    report_type: Optional[str] = None
    title: Optional[str] = None
    generated_at: Optional[str] = None
    json_url: str
    html_url: str
    pdf_url: str


class ReportListResponse(BaseModel):
    domain: Domain
    target_id: str
    reports: List[ReportRef] = Field(default_factory=list)


# ── 잡 (FR-3) ───────────────────────────────────────────────────
class JobResult(BaseModel):
    domain: Domain
    target_id: str
    report_id: str
    json_url: str
    html_url: str
    pdf_url: Optional[str] = None


class ResearchJobResult(BaseModel):
    """리서치 잡 성공 결과. 보고서 JobResult와 별개(리서치는 리포트 채번 없음)."""

    domain: Domain
    target_id: str
    latest_url: Optional[str] = None
    schema_version: Optional[str] = None


class DetailJobResult(BaseModel):
    """상세화면 렌더링 잡 성공 결과(3차 확장). 보고서 채번 없이 detail HTML URL만."""

    domain: Domain
    target_id: str
    html_url: Optional[str] = None


class JobCreatedResponse(BaseModel):
    job_id: str
    status: JobState = "queued"
    status_url: str


class JobStatus(BaseModel):
    job_id: str
    kind: str = "report"
    status: JobState
    step: JobStep
    percent: int = 0
    message: Optional[str] = None
    # 보고서 잡=JobResult, 리서치 잡=ResearchJobResult, 상세화면 잡=DetailJobResult.
    result: Optional[Union[JobResult, ResearchJobResult, DetailJobResult]] = None
    error: Optional[str] = None
    params: Dict[str, str] = Field(default_factory=dict)


# ── 리서치 (FR-1·4) ─────────────────────────────────────────────
class ResearchTriggerRequest(BaseModel):
    """region 리서치 POST body. country는 body 불필요(segment만 선택)."""

    member_codes: List[str] = Field(default_factory=list)
    segment: Optional[str] = None


# ── 챗봇 (FR-3) ─────────────────────────────────────────────────
class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    domain: Domain
    target_id: str
    message: str
    history: Optional[List[ChatTurn]] = None
    member_codes: Optional[List[str]] = None


class ChatResponse(BaseModel):
    answer: Optional[str] = None
    needs_research: bool = False
    research_suggestion: Optional[str] = None
    missing_codes: List[str] = Field(default_factory=list)
