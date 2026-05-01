from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class UserSignatureBase(BaseModel):
    signature_name: str
    is_default: bool = False


class UserSignatureCreate(UserSignatureBase):
    pass


class UserSignatureOut(UserSignatureBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    image_path: str
    created_at: datetime


class StampRequest(BaseModel):
    signature_id: int
    page_number: int = 1
    x_position: float
    y_position: float
    width: Optional[float] = None
    height: Optional[float] = None
    stamp_text: Optional[str] = None
    version_type: str = "SIGNED"
    is_final: bool = False


class PdfVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    document_id: int
    version_type: str
    original_file_id: int
    stamped_file_path: str
    stamped_by: int
    stamped_at: datetime
    page_number: int
    x_position: float
    y_position: float
    width: Optional[float]
    height: Optional[float]
    stamp_text: Optional[str]
    is_final: bool
    
    # Relationships
    stamped_by_name: Optional[str] = None


class SignatureAuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    document_id: int
    pdf_version_id: Optional[int]
    user_id: int
    action: str
    detail: Optional[str]
    created_at: datetime
    
    # Relationships
    user_name: Optional[str] = None
    document_no: Optional[str] = None