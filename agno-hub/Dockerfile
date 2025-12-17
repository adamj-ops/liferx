# LifeRX Agno Hub - Railway Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Railway injects PORT - do NOT hardcode
# This is the #1 reason Railway deployments fail
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port $PORT"]

