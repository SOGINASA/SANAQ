FROM python:3.11-slim AS runtime

ARG TORCH_VERSION=2.11.0

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PATHNET_MODEL_PATH=/app/ml/artifacts/pathnet-v2-outcomes-notebook.pt

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-production.txt ./
RUN pip install --no-cache-dir -r requirements-production.txt \
    && pip install --no-cache-dir \
        "torch==${TORCH_VERSION}" \
        --index-url https://download.pytorch.org/whl/cpu

COPY . .
RUN addgroup --system sanaq \
    && adduser --system --ingroup sanaq sanaq \
    && mkdir -p /app/database \
    && chown -R sanaq:sanaq /app \
    && chmod +x /app/entrypoint.sh

USER sanaq

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/ready', timeout=4)" || exit 1

CMD ["/app/entrypoint.sh"]
