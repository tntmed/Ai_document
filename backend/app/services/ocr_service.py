"""
OCR Service — Phase 1 (Mock)

Returns mock extracted text from uploaded PDFs.
In Phase 2, replace `_run_ocr_engine` with PaddleOCR or Tesseract.

Usage:
    text = extract_text_from_pdf("/storage/documents/abc.pdf")
"""

import os
import random
from typing import Optional


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract text from a PDF file.

    Phase 1: Returns deterministic mock text based on filename.
    Phase 2: Replace _run_ocr_engine with real implementation.
    """
    if not os.path.exists(file_path):
        return ""

    # Phase 2 hook: uncomment one of these:
    # return _paddleocr_extract(file_path)
    # return _tesseract_extract(file_path)

    return _mock_extract(file_path)


# ---------------------------------------------------------------------------
# Phase 1 — Mock implementation
# ---------------------------------------------------------------------------

_MOCK_SAMPLES = [
    "ขอส่งซ่อมคอมพิวเตอร์ที่ชำรุด จำนวน 2 เครื่อง ในแผนก OPD",
    "ขอติดตั้งโปรแกรม HIS บนเครื่องคอมพิวเตอร์ใหม่ แผนก ER",
    "ขอเพิ่ม IP Address สำหรับอุปกรณ์เครือข่ายใหม่",
    "ขอ reset password ให้ผู้ใช้งาน นางสาวสมหญิง รัตนโกเมศ",
    "ขอย้ายคอมพิวเตอร์จากห้อง 201 ไปห้อง 305",
    "ระบบงานทะเบียนผู้ป่วยมีปัญหา ไม่สามารถบันทึกข้อมูลได้",
    "ขอเชื่อมต่อ Wi-Fi ในห้องประชุม อาคาร 3 ชั้น 2",
    "ขอลงโปรแกรม Microsoft Office บนเครื่องคอมพิวเตอร์",
    "สายแลน (LAN) ในแผนก ICU ขาด ขอให้ช่างมาซ่อม",
    "ขอเพิ่มความเร็ว Internet สำหรับแผนก Radiology",
]


def _mock_extract(file_path: str) -> str:
    """Return a deterministic mock text based on the file path hash."""
    seed = sum(ord(c) for c in file_path)
    random.seed(seed)
    sample = random.choice(_MOCK_SAMPLES)
    return f"[OCR Mock] {sample}\n\nไฟล์: {os.path.basename(file_path)}"


# ---------------------------------------------------------------------------
# Phase 2 stubs — implement when ready
# ---------------------------------------------------------------------------

def _paddleocr_extract(file_path: str) -> str:
    """
    Extract text using PaddleOCR.
    Install: pip install paddlepaddle paddleocr pdf2image
    """
    raise NotImplementedError("PaddleOCR not configured (Phase 2)")


def _tesseract_extract(file_path: str) -> str:
    """
    Extract text using Tesseract OCR.
    Install: pip install pytesseract pdf2image
    Requires: tesseract-ocr system package with tha language pack
    """
    raise NotImplementedError("Tesseract not configured (Phase 2)")
