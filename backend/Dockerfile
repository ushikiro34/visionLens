FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 (OpenCV 등)
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 앱 코드 복사
COPY . .

# 모델 디렉토리 생성
RUN mkdir -p models

EXPOSE 8000

# Railway는 PORT 환경변수를 주입함. --reload는 프로덕션에서 제거.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
