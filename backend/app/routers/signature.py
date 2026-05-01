import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.signature import UserSignature, DocumentPdfVersion, SignatureAuditLog
from app.core.dependencies import get_current_user, get_user_role
from app.schemas.signature import (
    UserSignatureOut, UserSignatureCreate, StampRequest, PdfVersionOut, SignatureAuditLogOut
)
from app.services.signature_service import SignatureService

router = APIRouter(prefix="/signatures", tags=["signatures"])
signature_service = SignatureService()


def _can_manage_signatures(user: User) -> bool:
    """Only chief and admin can manage signatures"""
    role = get_user_role(user)
    return role in ("admin", "chief")


def _to_signature_out(sig: UserSignature) -> UserSignatureOut:
    return UserSignatureOut(
        id=sig.id,
        user_id=sig.user_id,
        signature_name=sig.signature_name,
        image_path=sig.image_path,
        is_default=sig.is_default,
        created_at=sig.created_at,
    )


def _to_pdf_version_out(version: DocumentPdfVersion) -> PdfVersionOut:
    return PdfVersionOut(
        id=version.id,
        document_id=version.document_id,
        version_type=version.version_type,
        original_file_id=version.original_file_id,
        stamped_file_path=version.stamped_file_path,
        stamped_by=version.stamped_by,
        stamped_at=version.stamped_at,
        page_number=version.page_number,
        x_position=version.x_position,
        y_position=version.y_position,
        width=version.width,
        height=version.height,
        stamp_text=version.stamp_text,
        is_final=version.is_final,
        stamped_by_name=version.user.full_name if version.user else None,
    )


def _to_audit_log_out(log: SignatureAuditLog) -> SignatureAuditLogOut:
    return SignatureAuditLogOut(
        id=log.id,
        document_id=log.document_id,
        pdf_version_id=log.pdf_version_id,
        user_id=log.user_id,
        action=log.action,
        detail=log.detail,
        created_at=log.created_at,
        user_name=log.user.full_name if log.user else None,
        document_no=log.document.document_no if log.document else None,
    )


@router.post("/upload", response_model=UserSignatureOut, status_code=status.HTTP_201_CREATED)
async def upload_signature(
    file: UploadFile = File(...),
    signature_name: str = Form(...),
    is_default: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _can_manage_signatures(current_user):
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์จัดการลายเซ็น")

    try:
        # Save signature image
        image_path = signature_service.save_signature_image(file, current_user.id)

        # If setting as default, unset any existing default
        if is_default:
            db.query(UserSignature).filter(
                UserSignature.user_id == current_user.id,
                UserSignature.is_default == True
            ).update({"is_default": False})

        # Create signature record
        signature = UserSignature(
            user_id=current_user.id,
            signature_name=signature_name,
            image_path=image_path,
            is_default=is_default
        )

        db.add(signature)
        db.flush()

        # Log the action
        signature_service.log_signature_action(
            db, None, current_user.id, "UPLOAD_SIGNATURE", f"อัปโหลดลายเซ็น: {signature_name}"
        )

        db.commit()

        return _to_signature_out(signature)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me", response_model=List[UserSignatureOut])
def get_my_signatures(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    signatures = (
        db.query(UserSignature)
        .filter(UserSignature.user_id == current_user.id)
        .order_by(UserSignature.is_default.desc(), UserSignature.created_at.desc())
        .all()
    )
    return [_to_signature_out(sig) for sig in signatures]


@router.delete("/{signature_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_signature(
    signature_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _can_manage_signatures(current_user):
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ลบลายเซ็น")
    
    signature = (
        db.query(UserSignature)
        .filter(
            UserSignature.id == signature_id,
            UserSignature.user_id == current_user.id
        )
        .first()
    )
    
    if not signature:
        raise HTTPException(status_code=404, detail="ไม่พบลายเซ็น")
    
    # Delete the image file
    try:
        abs_path = signature.image_path.replace("/storage/", settings.STORAGE_PATH + "/")
        if os.path.exists(abs_path):
            os.remove(abs_path)
    except:
        pass  # Don't fail if file deletion fails
    
    # Log the action
    signature_service.log_signature_action(
        db, None, current_user.id, "DELETE_SIGNATURE", f"ลบลายเซ็น: {signature.signature_name}"
    )
    
    db.delete(signature)
    db.commit()
    
    return None


@router.post("/documents/{document_id}/stamp", response_model=PdfVersionOut)
def stamp_document(
    document_id: int,
    payload: StampRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _can_manage_signatures(current_user):
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ประทับลายเซ็น")
    
    # Get the document and its original file
    from app.models.document import Document, DocumentFile
    
    document = (
        db.query(Document)
        .options(joinedload(Document.files))
        .filter(Document.id == document_id)
        .first()
    )
    
    if not document:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสาร")
    
    if not document.files:
        raise HTTPException(status_code=400, detail="เอกสารไม่มีไฟล์ PDF")
    
    # Get the signature
    signature = (
        db.query(UserSignature)
        .filter(
            UserSignature.id == payload.signature_id,
            UserSignature.user_id == current_user.id
        )
        .first()
    )
    
    if not signature:
        raise HTTPException(status_code=404, detail="ไม่พบลายเซ็น")
    
    # Get the original PDF file
    original_file = document.files[0]  # Assuming first file is the main PDF
    original_path = original_file.stored_path
    
    # Get absolute path for signature image
    signature_path = signature.image_path.replace("/storage/", settings.STORAGE_PATH + "/")
    
    # Stamp the PDF
    stamped_path = signature_service.stamp_pdf(
        original_pdf_path=original_path,
        signature_image_path=signature_path,
        page_number=payload.page_number,
        x=payload.x_position,
        y=payload.y_position,
        width=payload.width,
        height=payload.height,
        stamp_text=payload.stamp_text
    )
    
    # Create PDF version record
    version = signature_service.create_pdf_version_record(
        db=db,
        document_id=document_id,
        original_file_id=original_file.id,
        stamped_file_path=stamped_path.replace(settings.STORAGE_PATH, "/storage"),
        stamped_by=current_user.id,
        page_number=payload.page_number,
        x_position=payload.x_position,
        y_position=payload.y_position,
        width=payload.width,
        height=payload.height,
        stamp_text=payload.stamp_text,
        version_type=payload.version_type,
        is_final=payload.is_final
    )
    
    # Log the action
    signature_service.log_signature_action(
        db, document_id, current_user.id, "STAMP_DOCUMENT", 
        f"ประทับลายเซ็นบนเอกสาร {document.document_no}",
        pdf_version_id=version.id
    )
    
    db.commit()
    
    return _to_pdf_version_out(version)


@router.get("/documents/{document_id}/versions", response_model=List[PdfVersionOut])
def get_document_versions(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.document import Document
    
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสาร")
    
    versions = (
        db.query(DocumentPdfVersion)
        .options(joinedload(DocumentPdfVersion.user))
        .filter(DocumentPdfVersion.document_id == document_id)
        .order_by(DocumentPdfVersion.stamped_at.desc())
        .all()
    )
    
    return [_to_pdf_version_out(v) for v in versions]


@router.get("/documents/{document_id}/audit-logs", response_model=List[SignatureAuditLogOut])
def get_signature_audit_logs(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.document import Document
    
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสาร")
    
    logs = (
        db.query(SignatureAuditLog)
        .options(
            joinedload(SignatureAuditLog.user),
            joinedload(SignatureAuditLog.document)
        )
        .filter(SignatureAuditLog.document_id == document_id)
        .order_by(SignatureAuditLog.created_at.desc())
        .all()
    )
    
    return [_to_audit_log_out(log) for log in logs]