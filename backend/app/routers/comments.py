from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.user import User
from app.models.comment import Comment
from app.core.dependencies import get_current_user
from app.schemas.comment import CommentCreate, CommentOut, CommentListOut

router = APIRouter(prefix="/comments", tags=["comments"])


def _comments_query(db: Session):
    return db.query(Comment).options(joinedload(Comment.user))


def _to_out(c: Comment) -> CommentOut:
    return CommentOut(
        id=c.id,
        document_id=c.document_id,
        task_id=c.task_id,
        user_id=c.user_id,
        user_full_name=c.user.full_name if c.user else None,
        comment_text=c.comment_text,
        created_at=c.created_at,
    )


@router.post("", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def create_comment(
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.document_id and not payload.task_id:
        raise HTTPException(status_code=400, detail="ต้องระบุ document_id หรือ task_id")

    comment = Comment(
        document_id=payload.document_id,
        task_id=payload.task_id,
        user_id=current_user.id,
        comment_text=payload.comment_text,
    )
    db.add(comment)
    db.commit()

    # Reload with user relationship to avoid lazy-load after session context
    loaded = _comments_query(db).filter(Comment.id == comment.id).first()
    return _to_out(loaded)


@router.get("/document/{doc_id}", response_model=CommentListOut)
def get_document_comments(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comments = (
        _comments_query(db)
        .filter(Comment.document_id == doc_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return CommentListOut(items=[_to_out(c) for c in comments], total=len(comments))


@router.get("/task/{task_id}", response_model=CommentListOut)
def get_task_comments(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comments = (
        _comments_query(db)
        .filter(Comment.task_id == task_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return CommentListOut(items=[_to_out(c) for c in comments], total=len(comments))
