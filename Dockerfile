FROM python:3.12-slim AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt


FROM python:3.12-slim

WORKDIR /app

# Non-root user
RUN useradd -m -r -u 1001 garmin

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY --chown=garmin:garmin app/ ./app/

# Data directory (SQLite + auth tokens); mount a volume here
RUN mkdir -p /data/garmin && chown garmin:garmin /data/garmin

USER garmin

EXPOSE 8000

ENV DB_DIR=/data/garmin \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
