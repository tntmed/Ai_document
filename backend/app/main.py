from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.routers import auth, documents, tasks, comments, dashboard, routing, users, signature

app = FastAPI(
    title=settings.APP_TITLE,
    version="1.0.0",
    description="ระบบจัดการเอกสารเวิร์กโฟลว์ — ศูนย์คอมพิวเตอร์โรงพยาบาล",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploaded documents and signatures
os.makedirs(settings.STORAGE_PATH, exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_PATH, "signatures"), exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_PATH, "stamped"), exist_ok=True)

app.mount("/storage/documents", StaticFiles(directory=settings.STORAGE_PATH), name="storage")
app.mount("/storage/signatures", StaticFiles(directory=os.path.join(settings.STORAGE_PATH, "signatures")), name="signatures")
app.mount("/storage/stamped", StaticFiles(directory=os.path.join(settings.STORAGE_PATH, "stamped")), name="stamped")

# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(routing.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(signature.router, prefix="/api")  # Add signature router


@app.get("/api/health")
def health():
    return {"status": "ok", "service": settings.APP_TITLE}
