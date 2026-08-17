# SANAQ MVP: Docker deployment

Канонический production-like запуск выполняется из корня репозитория через
`compose.yaml`. Он поднимает четыре сервиса:

```text
Internet / HTTPS proxy
          |
          v
frontend (Nginx + React) :80
          |
          v
backend (Gunicorn + Flask + PathNet) :8000
       |                         |
       v                         v
PostgreSQL                    Ollama / Qwen3
```

PostgreSQL, backend и Ollama не публикуют порты хоста. Браузер обращается только
к frontend Nginx; `/api/*` проксируется в backend, включая SSE-ответы чата.

## 1. Требования

- Linux-сервер с Docker Engine и Docker Compose v2;
- минимум 16 GB RAM для CPU-запуска `qwen3:8b`;
- не менее 15 GB свободного диска для образов и Ollama volume;
- домен и внешний HTTPS reverse proxy для публичной эксплуатации.

PathNet занимает около 15 KB. Основной объём диска и памяти использует Qwen3.

## 2. Production environment

Из корня репозитория:

```bash
cp .env.production.example .env
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Три результата записать соответственно в `SECRET_KEY`, `JWT_SECRET_KEY` и
`POSTGRES_PASSWORD`. Для публичного HTTPS изменить:

```dotenv
PUBLIC_ORIGIN=https://sanaq.example.kz
JWT_COOKIE_SECURE=true
SEED_DEMO_DATA=false
DATA_MODE=production
```

Файл `.env` нельзя коммитить.

## 3. Проверка конфигурации и сборка

```bash
docker compose config --quiet
docker compose build backend frontend
```

Backend image устанавливает CPU-only PyTorch и содержит проверенный checkpoint
`pathnet-v2-outcomes-notebook.pt`. Jupyter, pandas и тренировочный датасет в
production image не входят.

## 4. PostgreSQL и Qwen3

```bash
docker compose up -d postgres ollama
docker compose ps
docker compose exec ollama ollama pull qwen3:8b
docker compose exec ollama ollama list
```

Веса Qwen сохраняются в named volume `ollama_data` и не скачиваются заново после
пересборки приложения.

Для NVIDIA GPU после установки NVIDIA Container Toolkit использовать:

```bash
docker compose -f compose.yaml -f compose.gpu.yaml up -d
```

## 5. Запуск приложения

```bash
docker compose up -d backend frontend
docker compose ps
docker compose logs --tail=100 backend
```

Локальная проверка без внешнего HTTPS proxy:

```bash
curl -fsS http://127.0.0.1/api/v1/health
curl -fsS http://127.0.0.1/api/v1/ready
```

В readiness ожидаются:

```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "pathnet": "ok:pathnet-v2-synthetic-outcomes-notebook",
    "ai": "ollama_configured_with_fallback"
  }
}
```

Проверить Qwen из backend-сети:

```bash
docker compose exec backend python -c "import urllib.request; print(urllib.request.urlopen('http://ollama:11434/api/tags', timeout=5).status)"
```

## 6. Режимы отказа

- Если Qwen временно недоступна, чат возвращает явно помеченный безопасный
  fallback; остальные страницы продолжают работать.
- Если PathNet не загрузилась, `/ready` возвращает `503`, но deterministic planner
  остаётся реализацией маршрута.
- PathNet работает в `shadow`: она измеряет альтернативное ранжирование, но не
  может нарушить prerequisite-граф или сломать план ученика.

## 7. Бэкап и обновление

Бэкап PostgreSQL:

```bash
docker compose exec -T postgres pg_dump -U sanaq -d sanaq > sanaq-backup.sql
```

Обновление:

```bash
git pull
docker compose build backend frontend
docker compose up -d
docker compose ps
curl -fsS http://127.0.0.1/api/v1/ready
```

Не выполнять `docker compose down -v`, если нужно сохранить PostgreSQL и
скачанные веса Qwen.

## 8. Что обязательно сделать перед публичным трафиком

- поставить HTTPS reverse proxy и установить `JWT_COOKIE_SECURE=true`;
- отключить demo seed после создания нужных аккаунтов и контента;
- настроить ежедневный backup PostgreSQL;
- ограничить доступ к SSH и Docker socket;
- настроить мониторинг RAM/CPU/GPU, места на диске и `5xx`;
- добавить rate limit для AI-чата перед нагрузочным запуском;
- продолжать PathNet shadow-сбор на реальных обезличенных событиях.
