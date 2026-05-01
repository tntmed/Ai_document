FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /storage/documents

# Strip Windows CRLF line endings that may be introduced on Windows hosts
RUN sed -i 's/\r//' start.sh && chmod +x start.sh

EXPOSE 8000

CMD ["sh", "start.sh"]
