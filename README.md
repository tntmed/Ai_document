# ระบบจัดการเอกสารเวิร์กโฟลว์ (Document Workflow System)

ระบบจัดการเอกสารภายในสำหรับศูนย์คอมพิวเตอร์โรงพยาบาล — แยกจากระบบ Oracle/HIS

## คุณสมบัติหลัก

- รับเอกสารสแกน/PDF เข้าระบบโดยธุรการ
- ผู้อำนวยการ (Chief) ตรวจสอบและมอบหมายงาน
- ระบบแนะนำหน่วยงานอัตโนมัติด้วย Routing Engine
- ติดตามสถานะงานแบบ Real-time
- Timeline การเปลี่ยนสถานะทุกขั้นตอน
- รองรับ OCR ในอนาคต (Phase 2)

## Technology Stack

| Layer     | Technology                         |
|-----------|------------------------------------|
| Frontend  | React 18 + Vite + Tailwind CSS     |
| Backend   | Python 3.11 + FastAPI              |
| Database  | PostgreSQL 15                      |
| ORM       | SQLAlchemy 2.0 + Alembic           |
| Auth      | JWT (python-jose)                  |
| Storage   | Local filesystem `/storage/documents` |
| Deploy    | Docker Compose                     |

## แผนภาพ Workflow

```
ธุรการ Upload PDF
      │
      ▼
[RECEIVED] ──► [WAIT_CHIEF_REVIEW]
                      │
                      ▼ Chief มอบหมาย
                 [ASSIGNED]
                      │
                      ▼ รับงาน
                 [IN_PROGRESS]
                      │
                      ▼ เสร็จงาน
               [DONE_BY_SECTION]
                      │
                      ▼ คืนธุรการ
             [RETURNED_TO_ADMIN]
                      │
                      ▼ ปิดเรื่อง
                  [CLOSED]
```

## หน่วยงานในระบบ

| รหัส    | ชื่อหน่วยงาน   |
|---------|--------------|
| ADMIN   | ธุรการ        |
| IT-NET  | อินเตอร์เนต   |
| PROG    | โปรแกรมเมอร์  |
| TECH    | ช่าง          |

## สิทธิ์ผู้ใช้งาน

| Role           | สิทธิ์                                              |
|----------------|-----------------------------------------------------|
| admin          | จัดการผู้ใช้, ดูทุกอย่าง, ปิดเรื่อง                  |
| chief          | รีวิวเอกสาร, มอบหมายงาน, ดูทุกอย่าง                  |
| admin_staff    | อัปโหลดเอกสาร, ปิดเรื่อง                              |
| department_head| รับงาน, มอบงานในหน่วยงาน, ดูงานหน่วยงาน              |
| staff          | รับงาน, อัปเดตสถานะ, เพิ่มความคิดเห็น                |
| viewer         | ดูข้อมูลเท่านั้น                                       |

## การติดตั้งด้วย Docker Compose

### 1. Clone / วางโฟลเดอร์โปรเจกต์

```bash
cd document-workflow-system
```

### 2. สร้างไฟล์ .env

```bash
cp .env.example .env
# แก้ไข SECRET_KEY และตั้งค่าตามต้องการ
```

### 3. Build และ Start

```bash
docker-compose up --build -d
```

### 4. รอ Migrations และ Seed data เสร็จ

```bash
docker-compose logs -f backend
# รอจนเห็น "Application startup complete"
```

### 5. เปิดใช้งาน

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## การติดตั้งแบบ Development (ไม่ใช้ Docker)

### ต้องการ
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# ตั้งค่า .env (แก้ DATABASE_URL เป็น localhost)
cp ../.env.example .env
# แก้ไข DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/docworkflow

# Run migrations
alembic upgrade head

# Seed ข้อมูลเริ่มต้น
python seed.py

# Start server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# เปิดที่ http://localhost:5173
```

## บัญชีเริ่มต้น

| Username | Password | Role        |
|----------|----------|-------------|
| admin    | admin123 | admin       |
| chief    | chief123 | chief       |
| thurakarn| staff123 | admin_staff (ธุรการ) |
| netsec   | staff123 | staff (อินเตอร์เนต) |
| dev1     | staff123 | staff (โปรแกรมเมอร์) |
| tech1    | staff123 | staff (ช่าง) |

## API Documentation

เมื่อ Backend ทำงาน ดู Swagger UI ได้ที่: http://localhost:8000/docs

### Endpoints หลัก

```
POST   /api/auth/login                    # เข้าสู่ระบบ
GET    /api/auth/me                       # ข้อมูลผู้ใช้ปัจจุบัน

POST   /api/documents/upload              # อัปโหลดเอกสาร
GET    /api/documents                     # รายการเอกสาร
GET    /api/documents/{id}               # รายละเอียดเอกสาร
PATCH  /api/documents/{id}               # แก้ไขเอกสาร
POST   /api/documents/{id}/assign        # มอบหมายงาน
POST   /api/documents/{id}/close         # ปิดเรื่อง
GET    /api/documents/{id}/timeline      # Timeline สถานะ

GET    /api/tasks                         # รายการงานทั้งหมด
GET    /api/tasks/my                      # งานของฉัน
PATCH  /api/tasks/{id}/status            # อัปเดตสถานะงาน
POST   /api/tasks/{id}/complete          # เสร็จสิ้นงาน

GET    /api/dashboard/summary            # สรุปภาพรวม
GET    /api/dashboard/by-department      # สรุปตามหน่วยงาน
GET    /api/dashboard/overdue-tasks      # งานที่เกินกำหนด

POST   /api/routing/suggest              # แนะนำหน่วยงาน
GET    /api/routing/rules               # กฎ Routing
POST   /api/routing/rules               # เพิ่มกฎ
PATCH  /api/routing/rules/{id}          # แก้ไขกฎ

GET    /api/users                        # รายการผู้ใช้ (admin)
POST   /api/users                        # เพิ่มผู้ใช้ (admin)
```

## โครงสร้างโปรเจกต์

```
document-workflow-system/
├── backend/
│   ├── app/
│   │   ├── core/           # Security, Dependencies
│   │   ├── models/         # SQLAlchemy Models
│   │   ├── routers/        # API Endpoints
│   │   ├── schemas/        # Pydantic Schemas
│   │   ├── services/       # Business Logic
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── alembic/            # Database Migrations
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── start.sh
│   └── seed.py
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios API Clients
│   │   ├── components/     # Shared Components
│   │   ├── pages/          # Page Components
│   │   ├── store/          # Zustand State
│   │   └── utils/          # Utilities
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

## OCR (Phase 2)

ระบบเตรียมพร้อมสำหรับ OCR โดย:
- `backend/app/services/ocr_service.py` มีโครงสร้างพร้อม
- ใน Phase 1: คืนค่า mock text
- ใน Phase 2: เปลี่ยนเป็น PaddleOCR หรือ Tesseract

```python
# เปลี่ยนใน ocr_service.py:
# จาก: return mock_text
# เป็น: return paddleocr_extract(file_path)
```

## License

Internal use only — Hospital Computer Center
