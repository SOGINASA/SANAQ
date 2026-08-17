# SANAQ: инструкция бэкендеру по развёртыванию на хосте

Этот файл — самостоятельный handoff для первого запуска и дальнейшего
обслуживания SANAQ. Канонический способ развёртывания — Docker Compose из корня
репозитория. Не нужно отдельно запускать Flask, PostgreSQL или Ollama на хосте.

## 1. Что разворачивается

```text
Публичный HTTPS
      |
      v
внешний Nginx/Caddy (хост)
      |
      v
frontend container :80
      |
      +---- /api/* ----> backend container :8000
                            |             |
                            v             v
                       PostgreSQL      Ollama/Qwen3
                                         |
                                      qwen3:8b
```

В backend image уже находятся:

- Flask + Gunicorn;
- PostgreSQL driver;
- CPU-only PyTorch;
- PathNet checkpoint
  `ml/artifacts/pathnet-v2-outcomes-notebook.pt`;
- deterministic planner и безопасный fallback.

PathNet работает в `shadow`: пользовательский маршрут строит deterministic
planner, а модель параллельно оценивает ранжирование. Ошибка Qwen также не
останавливает остальные функции — чат возвращает явно помеченный fallback.

Нельзя публиковать наружу порты PostgreSQL `5432`, backend `8000` и Ollama
`11434`. Публичным должен быть только frontend либо внешний HTTPS proxy.

## 2. Требования к хосту

Минимально:

- Linux x86_64/arm64;
- Docker Engine;
- Docker Compose v2;
- Git;
- 16 GB RAM для CPU-варианта Qwen3 8B;
- 15 GB свободного диска;
- домен, направленный A/AAAA-записью на сервер.

Проверить сервер:

```bash
uname -a
cat /etc/os-release
nproc
free -h
df -h /
docker --version
docker compose version
```

Для GPU дополнительно нужны рабочие `nvidia-smi` и NVIDIA Container Toolkit.

## 3. Получение репозитория

```bash
git clone <REPOSITORY_URL> sanaq
cd sanaq
```

Убедиться, что checkpoint реально приехал из Git:

```bash
test -s backend/ml/artifacts/pathnet-v2-outcomes-notebook.pt
ls -lh backend/ml/artifacts/pathnet-v2-outcomes-notebook.pt
```

Если файла нет, сборку не продолжать: PathNet readiness будет возвращать `503`.

## 4. Production environment

```bash
cp .env.production.example .env
chmod 600 .env
```

Сгенерировать три разных секрета:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Заполнить `.env`:

```dotenv
SECRET_KEY=<первый секрет>
JWT_SECRET_KEY=<второй секрет>
POSTGRES_PASSWORD=<третий секрет>

PUBLIC_ORIGIN=https://sanaq.example.kz
HTTP_PORT=127.0.0.1:8080
JWT_COOKIE_SECURE=true

DEFAULT_LOCALE=ru
DATA_MODE=production
SEED_DEMO_DATA=false
AUTO_CREATE_DB=true
MIGRATE_RUNTIME_SCHEMA=true

AI_MODEL=qwen3:8b
AI_TIMEOUT_SECONDS=120
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=500
AI_CONTEXT_TOKENS=8192
AI_THINKING=false
OLLAMA_NUM_PARALLEL=1
OLLAMA_MAX_QUEUE=32
OLLAMA_KEEP_ALIVE=10m

PATHNET_TOP_K=20
GUNICORN_WORKERS=2
GUNICORN_THREADS=4
TORCH_VERSION=2.11.0
```

`HTTP_PORT=127.0.0.1:8080` означает, что приложение доступно только локальному
reverse proxy хоста. Для временного запуска без внешнего Nginx можно поставить
`HTTP_PORT=80`, но публичный production обязан использовать HTTPS.

`.env` нельзя добавлять в Git, отправлять в чат или выводить в CI logs.

## 5. Валидация и сборка

Из корня репозитория:

```bash
docker compose config --quiet
docker compose build backend frontend
```

Ожидаемые image names:

```text
sanaq-backend:latest
sanaq-frontend:latest
```

Backend image не содержит notebook, тренировочные датасеты и Jupyter. CPU-only
PyTorch нужен только для inference маленькой PathNet.

## 6. Первый запуск PostgreSQL и Ollama

```bash
docker compose up -d postgres ollama
docker compose ps
docker compose logs --tail=100 postgres
docker compose logs --tail=100 ollama
```

Скачать Qwen в persistent volume:

```bash
docker compose exec ollama ollama pull qwen3:8b
docker compose exec ollama ollama list
```

Скачивание выполняется один раз. Веса хранятся в volume `ollama_data` и не
исчезают при пересборке backend/frontend.

Проверить ручной ответ:

```bash
docker compose exec ollama ollama run qwen3:8b
```

Для завершения интерактивного режима нажать `Ctrl+D`.

## 7. Запуск backend и frontend

```bash
docker compose up -d backend frontend
docker compose ps
docker compose logs --tail=150 backend
docker compose logs --tail=100 frontend
```

Все четыре сервиса должны иметь состояние `running`, сервисы с healthcheck —
`healthy`.

Проверка через локальный frontend proxy:

```bash
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:8080/api/v1/health
curl -fsS http://127.0.0.1:8080/api/v1/ready
```

В `/ready` ожидается:

```json
{
  "data": {
    "status": "ready",
    "checks": {
      "database": "ok",
      "pathnet": "ok:pathnet-v2-synthetic-outcomes-notebook",
      "ai": "ollama_configured_with_fallback"
    }
  }
}
```

Проверка соединения backend → Ollama:

```bash
docker compose exec backend python -c "import urllib.request; print(urllib.request.urlopen('http://ollama:11434/api/tags', timeout=5).status)"
```

Ожидается HTTP `200`.

## 8. Внешний HTTPS proxy

Пример server block Nginx на хосте:

```nginx
server {
    listen 80;
    server_name sanaq.example.kz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sanaq.example.kz;

    ssl_certificate /etc/letsencrypt/live/sanaq.example.kz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sanaq.example.kz/privkey.pem;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 180s;
        proxy_send_timeout 180s;
        proxy_buffering off;
    }
}
```

После настройки:

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -fsS https://sanaq.example.kz/api/v1/ready
```

Если используется Caddy/Traefik, требования те же: проксировать на
`127.0.0.1:8080`, не буферизовать SSE и передавать `X-Forwarded-*`.

## 9. Проверка PathNet

Проверить checkpoint непосредственно внутри image:

```bash
docker compose exec backend python -c "from services.pathnet_inference import load_pathnet; print(load_pathnet('/app/ml/artifacts/pathnet-v2-outcomes-notebook.pt')[1])"
```

После создания или пересчёта маршрутов проверить настоящие shadow-события:

```bash
docker compose exec backend python -m ml.evaluate_shadow \
  --model-version pathnet-v2-synthetic-outcomes-notebook \
  --minimum-samples 1 \
  --minimum-overlap 0 \
  --maximum-failure-rate 1 \
  --maximum-latency-ms 10000
```

Это диагностические пороги. Для допуска модели нужны реальные данные и строгая
проверка минимум на 1000 событиях. PathNet пока не должна становиться главным
planner.

## 10. PostgreSQL: данные и backup

Volumes:

```text
postgres_data — база пользователей, прогресса, чатов и событий;
ollama_data   — веса Qwen.
```

Создать backup:

```bash
mkdir -p backups
docker compose exec -T postgres pg_dump -U sanaq -d sanaq > backups/sanaq-$(date +%F-%H%M).sql
```

Проверить, что файл не пустой:

```bash
ls -lh backups/
```

Восстановление выполнять только в согласованное окно обслуживания и сначала
проверять на отдельной БД.

Никогда не выполнять `docker compose down -v` без отдельного подтверждения:
команда удалит volumes с PostgreSQL и Qwen.

## 11. Обновление приложения

Перед обновлением сделать backup БД. Затем:

```bash
git pull --ff-only
docker compose config --quiet
docker compose build backend frontend
docker compose up -d backend frontend
docker compose ps
curl -fsS https://sanaq.example.kz/api/v1/ready
```

`postgres_data` и `ollama_data` при этом сохраняются.

## 12. Откат

До обновления сохранить текущий Git commit:

```bash
git rev-parse HEAD
```

При неудачном релизе перейти на предыдущий известный commit и пересобрать только
приложение:

```bash
git checkout <PREVIOUS_GOOD_COMMIT>
docker compose build backend frontend
docker compose up -d backend frontend
```

Не откатывать PostgreSQL автоматически вместе с кодом. Если релиз изменял схему,
сначала сверить совместимость или восстановить проверенный backup.

## 13. Диагностика

### Backend не становится healthy

```bash
docker compose logs --tail=250 backend
docker compose exec backend python -c "import torch; print(torch.__version__)"
docker compose exec backend ls -lh /app/ml/artifacts/
```

Типовые причины:

- `model_not_found` — checkpoint отсутствует в Git/image;
- `torch_unavailable` — backend image собран не из production Dockerfile;
- `database unavailable` — PostgreSQL не healthy или неверный пароль;
- ошибка schema — проверить `AUTO_CREATE_DB` и `MIGRATE_RUNTIME_SCHEMA`.

### Чат отвечает fallback

```bash
docker compose exec ollama ollama list
docker compose exec ollama ollama ps
docker compose logs --tail=250 ollama
docker compose logs --tail=250 backend
```

Проверить, что модель называется ровно как `AI_MODEL`, а `AI_BASE_URL` внутри
backend равен `http://ollama:11434` — это уже задано в Compose.

### Qwen отвечает слишком медленно

- проверить `docker stats`;
- уменьшить `AI_CONTEXT_TOKENS` до `4096`;
- оставить `OLLAMA_NUM_PARALLEL=1`;
- проверить наличие GPU через `ollama ps`;
- не увеличивать параллелизм без замера RAM/VRAM.

### Frontend открыт, но API недоступно

```bash
docker compose logs --tail=150 frontend
docker compose ps
curl -i http://127.0.0.1:8080/api/v1/health
```

Не нужно указывать публичный backend URL в React: production build использует
same-origin `/api/v1`, а Nginx внутри frontend проксирует запросы.

## 14. GPU-вариант

После установки NVIDIA Container Toolkit:

```bash
docker compose -f compose.yaml -f compose.gpu.yaml up -d
docker compose exec ollama ollama ps
```

В `PROCESSOR` ожидается GPU. PathNet остаётся CPU-only: она маленькая и не требует
GPU.

## 15. Чек-лист передачи

- [ ] DNS направлен на сервер;
- [ ] `.env` заполнен реальными секретами и имеет права `600`;
- [ ] checkpoint PathNet присутствует;
- [ ] Compose config проходит;
- [ ] PostgreSQL healthy;
- [ ] `qwen3:8b` скачана и видна в `ollama list`;
- [ ] backend и frontend healthy;
- [ ] `/api/v1/ready` показывает database/pathnet `ok`;
- [ ] HTTPS работает;
- [ ] регистрация, вход, чат и пересчёт маршрута проверены вручную;
- [ ] backup PostgreSQL настроен;
- [ ] мониторинг RAM, диска и `5xx` настроен;
- [ ] Ollama/PostgreSQL/backend не опубликованы наружу;
- [ ] `docker compose down -v` запрещён в обычном runbook.
