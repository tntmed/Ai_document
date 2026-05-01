"""
Routing Engine Service

Analyses document text and title against RoutingRule keywords,
returns a suggestion with confidence score and matched keywords.

Chief can override suggestion; override is logged to routing_feedback_logs.
"""

from __future__ import annotations
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.routing import RoutingRule
from app.models.document import Document
from app.schemas.routing import RoutingSuggestion


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def suggest_department(
    db: Session,
    text: str = "",
    title: str = "",
    document_type: Optional[str] = None,
) -> RoutingSuggestion:
    """
    Scan text and title against active routing rules.

    Returns the department with the most keyword matches, weighted by rule priority.
    Confidence is computed as: (weighted_matches / total_possible_weight).
    """
    rules = _load_active_rules(db, document_type)
    if not rules:
        return RoutingSuggestion(reason="ไม่มีกฎ Routing ที่ใช้งานได้")

    combined_text = (f"{title} {text}").lower()
    scores: dict[int, _DeptScore] = {}

    for rule in rules:
        keyword = rule.keyword.lower()
        if keyword in combined_text:
            dept_id = rule.target_department_id
            if dept_id not in scores:
                scores[dept_id] = _DeptScore(
                    department_id=dept_id,
                    department_name=rule.target_department.name,
                )
            scores[dept_id].add_match(keyword, rule.priority)

    if not scores:
        return RoutingSuggestion(reason="ไม่พบคำสำคัญที่ตรงกับกฎ Routing")

    # Pick department with highest weighted score
    best = max(scores.values(), key=lambda s: s.weighted_score)

    # Confidence: normalised by the max possible rule weight in the set
    max_possible = max(r.priority + 1 for r in rules)
    confidence = min(round(best.weighted_score / max_possible, 2), 1.0)

    return RoutingSuggestion(
        suggested_department_id=best.department_id,
        department_name=best.department_name,
        matched_keywords=best.matched_keywords,
        confidence=confidence,
        reason=_build_reason(best),
    )


def suggest_for_document(db: Session, document_id: int) -> RoutingSuggestion:
    """Shortcut to suggest for an existing document."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        return RoutingSuggestion(reason="ไม่พบเอกสาร")
    return suggest_department(
        db,
        text=doc.ocr_text or "",
        title=doc.title or "",
        document_type=doc.document_type,
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

class _DeptScore:
    def __init__(self, department_id: int, department_name: str):
        self.department_id = department_id
        self.department_name = department_name
        self.matched_keywords: List[str] = []
        self.weighted_score: float = 0.0

    def add_match(self, keyword: str, priority: int):
        if keyword not in self.matched_keywords:
            self.matched_keywords.append(keyword)
        self.weighted_score += priority + 1  # priority 0 → weight 1


def _load_active_rules(db: Session, document_type: Optional[str]) -> List[RoutingRule]:
    q = db.query(RoutingRule).filter(RoutingRule.is_active == True)
    if document_type:
        q = q.filter(
            (RoutingRule.document_type == None) | (RoutingRule.document_type == document_type)
        )
    return q.order_by(RoutingRule.priority.desc()).all()


def _build_reason(score: _DeptScore) -> str:
    kw_list = ", ".join(f'"{k}"' for k in score.matched_keywords[:5])
    return f"พบคำสำคัญ {kw_list} → แนะนำส่งให้ {score.department_name}"
