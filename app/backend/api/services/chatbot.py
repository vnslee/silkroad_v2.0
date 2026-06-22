"""챗봇 서비스 (C12, L7·L8) — §6.5 분기. 무상태(Q5=A).

데이터 보유 시 Bedrock 텍스트 답변, 없으면 needs_research 신호만 반환(직접 트리거
안 함 — 프론트가 동의 후 research API 호출). history는 요청으로 전달(서버 세션 없음).
"""
from __future__ import annotations

from typing import List, Optional

from .. import config
from ..schemas import ChatResponse, ChatTurn
from . import bedrock_client, storage_resolver

_log = config.get_logger("chatbot")

_SYSTEM = (
    "너는 글로벌 오토파이낸스 진출 진단 서비스의 컨설턴트 챗봇이다. "
    "제공된 참고 컨텍스트(국가/권역 리서치 요약)에 근거해 간결하고 실무적으로 답하라. "
    "근거 없는 수치를 지어내지 말고, 모르면 모른다고 답하라."
)


def _summarize(data: dict) -> str:
    """L8 컨텍스트 요약 — overall_insight + 핵심 score/gate items(토큰 절약)."""
    parts: List[str] = []
    oi = data.get("overall_insight")
    if oi:
        parts.append(f"[종합] {oi}")
    items = data.get("items") or []
    picked = 0
    for it in items:
        if it.get("role") in ("score", "gate"):
            seg = f"- {it.get('item')}: {it.get('value', '')} {it.get('unit', '')}".rstrip()
            ins = it.get("insight")
            if ins:
                seg += f" — {ins}"
            parts.append(seg)
            picked += 1
            if picked >= 12:  # 핵심 N개만(토큰 절약)
                break
    return "\n".join(parts)


def handle(
    domain: str,
    target_id: str,
    message: str,
    history: Optional[List[ChatTurn]] = None,
    member_codes: Optional[List[str]] = None,
) -> ChatResponse:
    """챗봇 1턴 처리. §6.5 분기."""
    exists = storage_resolver.research_exists(domain, target_id)

    if domain == "region" and member_codes:
        missing = [
            c
            for c in member_codes
            if not storage_resolver.research_exists("country", c)
        ]
    else:
        missing = []

    # 부분 데이터(§6.5.2) — 권역은 있으나 일부 멤버 누락.
    if domain == "region" and exists and missing:
        return ChatResponse(
            needs_research=True,
            missing_codes=missing,
            research_suggestion="일부 국가 정보가 부족합니다. 리서치를 진행할까요?",
        )

    # 보유 → LLM 답변.
    if exists and not missing:
        data = storage_resolver._load_latest_research(domain, target_id) or {}
        ctx = _summarize(data)
        hist = [{"role": t.role, "content": t.content} for t in (history or [])]
        answer = bedrock_client.generate_text(
            message, system=_SYSTEM, context=ctx, history=hist
        )
        return ChatResponse(answer=answer)

    # 없음(§6.5.1/6.5.2).
    sug = "외부 리서치를 진행할까요?"
    if domain == "region":
        sug += " 포함할 국가를 알려주세요."
    return ChatResponse(needs_research=True, research_suggestion=sug)
