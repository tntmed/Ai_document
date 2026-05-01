import os
import uuid
import tempfile
from typing import Optional
import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont
from datetime import datetime
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.models.signature import DocumentPdfVersion


class SignatureService:
    def __init__(self):
        self.signatures_dir = os.path.join(settings.STORAGE_PATH, "signatures")
        self.stamped_dir = os.path.join(settings.STORAGE_PATH, "stamped")
        os.makedirs(self.signatures_dir, exist_ok=True)
        os.makedirs(self.stamped_dir, exist_ok=True)

    def save_signature_image(self, file: UploadFile, user_id: int) -> str:
        """Save uploaded signature image and return the file path"""
        if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            raise HTTPException(status_code=400, detail="อนุญาตเฉพาะไฟล์ PNG หรือ JPG")
        
        # Read file content
        content = file.file.read()
        
        # Generate unique filename
        ext = os.path.splitext(file.filename or "")[-1].lower()
        filename = f"{user_id}_{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(self.signatures_dir, filename)
        
        # Save file
        with open(filepath, "wb") as f:
            f.write(content)
        
        return f"/storage/signatures/{filename}"

    def stamp_pdf(
        self,
        original_pdf_path: str,
        signature_image_path: str,
        page_number: int,
        x: float,
        y: float,
        width: Optional[float] = None,
        height: Optional[float] = None,
        stamp_text: Optional[str] = None
    ) -> str:
        """
        Stamp PDF with signature and optional text
        Returns path to the stamped PDF
        """
        if not os.path.exists(original_pdf_path):
            raise HTTPException(status_code=404, detail="ไม่พบไฟล์ PDF ต้นฉบับ")
        
        if not os.path.exists(signature_image_path):
            raise HTTPException(status_code=404, detail="ไม่พบไฟล์ลายเซ็น")
        
        # Generate output filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"stamped_{timestamp}_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(self.stamped_dir, output_filename)
        
        # Normalize paths for Windows compatibility
        original_pdf_path = os.path.normpath(original_pdf_path)
        signature_image_path = os.path.normpath(signature_image_path)
        output_path = os.path.normpath(output_path)

        try:
            # Open the original PDF
            doc = fitz.open(original_pdf_path)

            # Get the target page
            if page_number < 1 or page_number > len(doc):
                raise HTTPException(status_code=400, detail="หมายเลขหน้าไม่ถูกต้อง")

            page = doc[page_number - 1]

            # Add signature image
            if signature_image_path:
                # Load image bytes directly to avoid path issues on Windows
                with open(signature_image_path, "rb") as img_file:
                    img_bytes = img_file.read()

                # Add image to PDF
                rect = fitz.Rect(x, y, x + (width or 100), y + (height or 50))
                page.insert_image(rect, stream=img_bytes)
                
            
            # Add text stamp if provided
            if stamp_text:
                # Create a text annotation
                text_rect = fitz.Rect(x, y - 20, x + 200, y)
                annot = page.add_freetext_annot(
                    text_rect,
                    stamp_text,
                    fontsize=12,
                    fontname="helv",
                    text_color=(0, 0, 0),  # Black
                    fill_color=(1, 1, 1, 0.1),  # Semi-transparent white
                    align=0  # Left align
                )
                annot.update()
            
            # Save the stamped PDF
            doc.save(output_path)
            doc.close()
            
            return output_path
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการประทับลายเซ็น: {str(e)}")

    def create_pdf_version_record(
        self,
        db: Session,
        document_id: int,
        original_file_id: int,
        stamped_file_path: str,
        stamped_by: int,
        page_number: int,
        x_position: float,
        y_position: float,
        width: Optional[float],
        height: Optional[float],
        stamp_text: Optional[str],
        version_type: str = "SIGNED",
        is_final: bool = False
    ) -> DocumentPdfVersion:
        """Create a PDF version record in database"""
        version = DocumentPdfVersion(
            document_id=document_id,
            version_type=version_type,
            original_file_id=original_file_id,
            stamped_file_path=stamped_file_path,
            stamped_by=stamped_by,
            stamped_at=datetime.utcnow(),
            page_number=page_number,
            x_position=x_position,
            y_position=y_position,
            width=width,
            height=height,
            stamp_text=stamp_text,
            is_final=is_final
        )
        
        db.add(version)
        db.flush()
        
        return version

    def log_signature_action(
        self,
        db: Session,
        document_id: int,
        user_id: int,
        action: str,
        detail: Optional[str] = None,
        pdf_version_id: Optional[int] = None
    ) -> None:
        """Log signature-related actions"""
        from app.models.signature import SignatureAuditLog
        
        log = SignatureAuditLog(
            document_id=document_id,
            pdf_version_id=pdf_version_id,
            user_id=user_id,
            action=action,
            detail=detail,
            created_at=datetime.utcnow()
        )
        
        db.add(log)