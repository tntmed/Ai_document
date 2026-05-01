from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User
from app.models.routing import RoutingRule, RoutingFeedbackLog
from app.core.dependencies import get_current_user, require_chief_or_admin
from app.schemas.routing import (
    RoutingRuleCreate, RoutingRuleUpdate, RoutingRuleOut,
    RoutingSuggestRequest, RoutingSuggestion, RoutingFeedbackCreate,
)
from app.services import routing_service

router = APIRouter(prefix="/routing", tags=["routing"])


def _load_rule(db: Session, rule_id: int) -> RoutingRule:
    return (
        db.query(RoutingRule)
        .options(joinedload(RoutingRule.target_department))
        .filter(RoutingRule.id == rule_id)
        .first()
    )


def _rule_out(rule: RoutingRule) -> RoutingRuleOut:
    return RoutingRuleOut(
        id=rule.id,
        keyword=rule.keyword,
        target_department_id=rule.target_department_id,
        department_name=rule.target_department.name if rule.target_department else None,
        document_type=rule.document_type,
        priority=rule.priority,
        is_active=rule.is_active,
        created_at=rule.created_at,
    )


@router.post("/suggest", response_model=RoutingSuggestion)
def suggest(
    payload: RoutingSuggestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.document_id:
        return routing_service.suggest_for_document(db, payload.document_id)
    return routing_service.suggest_department(
        db,
        text=payload.text or "",
        title=payload.title or "",
    )


@router.post("/feedback", status_code=status.HTTP_201_CREATED)
def save_feedback(
    payload: RoutingFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_chief_or_admin),
):
    log = RoutingFeedbackLog(
        document_id=payload.document_id,
        system_suggested_department_id=payload.system_suggested_department_id,
        chief_selected_department_id=payload.chief_selected_department_id,
        feedback_note=payload.feedback_note,
    )
    db.add(log)
    db.commit()
    return {"message": "บันทึก feedback เรียบร้อย"}


@router.get("/rules", response_model=list[RoutingRuleOut])
def list_rules(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rules = (
        db.query(RoutingRule)
        .options(joinedload(RoutingRule.target_department))
        .order_by(RoutingRule.priority.desc(), RoutingRule.keyword)
        .all()
    )
    return [_rule_out(r) for r in rules]


@router.post("/rules", response_model=RoutingRuleOut, status_code=status.HTTP_201_CREATED)
def create_rule(
    payload: RoutingRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_chief_or_admin),
):
    rule = RoutingRule(**payload.model_dump())
    db.add(rule)
    db.commit()
    loaded = _load_rule(db, rule.id)
    return _rule_out(loaded)


@router.patch("/rules/{rule_id}", response_model=RoutingRuleOut)
def update_rule(
    rule_id: int,
    payload: RoutingRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_chief_or_admin),
):
    rule = db.query(RoutingRule).filter(RoutingRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="ไม่พบกฎ")

    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(rule, key, value)
    db.commit()
    loaded = _load_rule(db, rule_id)
    return _rule_out(loaded)


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_chief_or_admin),
):
    rule = db.query(RoutingRule).filter(RoutingRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="ไม่พบกฎ")
    db.delete(rule)
    db.commit()

