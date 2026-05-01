#!/bin/sh
set -e

echo "==> Waiting for PostgreSQL to be ready..."
python - <<'PYEOF'
import time, sys, os
import psycopg2

url = os.environ.get("DATABASE_URL", "")
for attempt in range(30):
    try:
        conn = psycopg2.connect(url)
        conn.close()
        print("PostgreSQL is ready.")
        sys.exit(0)
    except Exception as exc:
        print(f"  Attempt {attempt + 1}/30: {exc}")
        time.sleep(2)
print("ERROR: PostgreSQL did not become ready within 60 seconds.")
sys.exit(1)
PYEOF

echo "==> Running database migrations..."
alembic upgrade head

echo "==> Seeding initial data..."
python seed.py

echo "==> Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
