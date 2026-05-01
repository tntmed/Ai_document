"""
Quick end-to-end smoke test for auto-assignment after upload.
Run from the backend/ directory:  python test_upload.py
"""
import sys, io, json
sys.path.insert(0, ".")

from app.database import SessionLocal
from app.models.user import User
from app.models.document import Document, DocumentStatus
from app.models.task import DocumentTask, TaskStatus, TaskStatusLog
from app.models.document import DocumentStatusLog, DocumentFile
from app.services.ocr_service import extract_text_from_pdf
from app.services import routing_service
from app.routers.documents import _auto_assign, _doc_no, _log_status
from app.core.security import hash_password
import os, uuid
from datetime import datetime
from app.config import settings


# ── minimal valid 1-page PDF ──────────────────────────────────────────────────
PDF_BYTES = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj "
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj "
    b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n"
    b"xref\n0 4\n"
    b"0000000000 65535 f\n"
    b"0000000009 00000 n\n"
    b"0000000058 00000 n\n"
    b"0000000115 00000 n\n"
    b"trailer<</Size 4/Root 1 0 R>>\n"
    b"startxref\n190\n%%EOF"
)


def sep(label):
    print(f"\n{'='*60}")
    print(f"  {label}")
    print('='*60)


def run():
    db = SessionLocal()
    try:
        # ── get admin user ────────────────────────────────────────────────────
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            print("ERROR: admin user not found – run seed.py first")
            return

        # ── save a fake PDF to storage ────────────────────────────────────────
        os.makedirs(settings.STORAGE_PATH, exist_ok=True)
        stored_name = f"test_{uuid.uuid4().hex}.pdf"
        stored_path = os.path.join(settings.STORAGE_PATH, stored_name)
        with open(stored_path, "wb") as f:
            f.write(PDF_BYTES)

        # ── Test 1: document whose title matches a routing keyword ─────────────
        sep("TEST 1 — title matches routing rule → expect auto-ASSIGNED")
        title_1 = "ขอย้ายคอมพิวเตอร์ไปห้อง 305"
        doc1 = Document(
            document_no=_doc_no(db),
            title=title_1,
            sender="แผนกการเงิน",
            received_date=datetime.utcnow(),
            document_type="REQUEST",
            priority="NORMAL",
            status="RECEIVED",
            ocr_text=title_1,
            created_by=admin.id,
            current_owner_id=admin.id,
        )
        db.add(doc1)
        db.flush()
        db.add(DocumentFile(
            document_id=doc1.id,
            original_filename="test.pdf",
            stored_path=stored_path,
            file_type="pdf",
            file_size=len(PDF_BYTES),
            uploaded_by=admin.id,
        ))
        _log_status(db, doc1.id, None, "RECEIVED", admin.id, "อัปโหลดทดสอบ")

        result1 = _auto_assign(db, doc1, title_1, title_1, "REQUEST", admin)
        db.commit()

        print(f"  assigned        : {result1.assigned}")
        print(f"  department_name : {result1.department_name}")
        print(f"  confidence      : {result1.confidence}")
        print(f"  matched_keywords: {result1.matched_keywords}")
        print(f"  reason          : {result1.reason}")
        print(f"  fallback_chief  : {result1.fallback_to_chief}")
        print(f"  doc.status      : {doc1.status}")

        # verify task was created
        tasks1 = db.query(DocumentTask).filter(DocumentTask.document_id == doc1.id).all()
        task_logs1 = db.query(TaskStatusLog).filter(
            TaskStatusLog.task_id.in_([t.id for t in tasks1])
        ).all() if tasks1 else []
        doc_logs1 = db.query(DocumentStatusLog).filter(
            DocumentStatusLog.document_id == doc1.id
        ).all()
        print(f"\n  tasks created   : {len(tasks1)}")
        for t in tasks1:
            print(f"    task #{t.id}: '{t.task_title}' status={t.status} dept={t.assigned_department_id}")
        print(f"  task logs       : {len(task_logs1)}")
        for tl in task_logs1:
            print(f"    {tl.from_status or 'None'} → {tl.to_status}  note={tl.note}")
        print(f"  doc status logs : {len(doc_logs1)}")
        for dl in doc_logs1:
            print(f"    {dl.from_status or 'None'} → {dl.to_status}  note={dl.note}")

        assert result1.assigned, "FAIL: expected auto-assigned=True"
        assert doc1.status == DocumentStatus.ASSIGNED, f"FAIL: doc status={doc1.status}"
        assert len(tasks1) == 1, f"FAIL: expected 1 task, got {len(tasks1)}"
        assert len(task_logs1) == 1, f"FAIL: expected 1 task log"
        print("\n  ✅ TEST 1 PASSED")

        # ── Test 2: duplicate upload → no second task ─────────────────────────
        sep("TEST 2 — duplicate upload same doc → expect NO new task")
        result1b = _auto_assign(db, doc1, title_1, title_1, "REQUEST", admin)
        db.commit()
        tasks1b = db.query(DocumentTask).filter(DocumentTask.document_id == doc1.id).all()
        print(f"  tasks after 2nd call: {len(tasks1b)}")
        assert len(tasks1b) == 1, f"FAIL: duplicate task created! got {len(tasks1b)}"
        print("  ✅ TEST 2 PASSED")

        # ── Test 3: title has no matching keyword → escalate to chief ──────────
        sep("TEST 3 — no keyword match → expect WAIT_CHIEF_REVIEW")
        title_3 = "ทดสอบเอกสารที่ไม่มีคำสำคัญ XYZ"
        doc3 = Document(
            document_no=_doc_no(db),
            title=title_3,
            sender="ทดสอบ",
            received_date=datetime.utcnow(),
            document_type="OTHER",
            priority="NORMAL",
            status="RECEIVED",
            ocr_text=title_3,
            created_by=admin.id,
            current_owner_id=admin.id,
        )
        db.add(doc3)
        db.flush()
        _log_status(db, doc3.id, None, "RECEIVED", admin.id, "อัปโหลดทดสอบ")
        result3 = _auto_assign(db, doc3, title_3, title_3, "OTHER", admin)
        db.commit()

        print(f"  assigned       : {result3.assigned}")
        print(f"  fallback_chief : {result3.fallback_to_chief}")
        print(f"  reason         : {result3.reason}")
        print(f"  doc.status     : {doc3.status}")

        doc_logs3 = db.query(DocumentStatusLog).filter(
            DocumentStatusLog.document_id == doc3.id
        ).all()
        print(f"  doc status logs: {len(doc_logs3)}")
        for dl in doc_logs3:
            print(f"    {dl.from_status or 'None'} → {dl.to_status}  note={dl.note}")

        assert not result3.assigned, "FAIL: should NOT be assigned"
        assert result3.fallback_to_chief, "FAIL: fallback_to_chief should be True"
        assert doc3.status == DocumentStatus.WAIT_CHIEF_REVIEW, f"FAIL: doc status={doc3.status}"
        print("\n  ✅ TEST 3 PASSED")

        sep("ALL TESTS PASSED ✅")

    except AssertionError as e:
        db.rollback()
        print(f"\n  ❌ {e}")
        sys.exit(1)
    except Exception as e:
        db.rollback()
        import traceback; traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    run()