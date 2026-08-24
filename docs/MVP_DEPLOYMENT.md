# SANAQ MVP: Docker deployment

## Google OAuth production setup

Добавьте `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` в серверный `.env`. В Google
Cloud Console создайте OAuth client типа **Web application** и зарегистрируйте точный
Authorized redirect URI: `https://sanaq.example.kz/api/v1/auth/google/callback`, заменив
домен на значение `PUBLIC_ORIGIN`. OAuth client secret хранится только на сервере.

Канонический production-like запуск выполняется из корня репозитория через
`compose.yaml`. Compose поднимает три сервиса:

```text
Internet / HTTPS proxy
          |
          v
frontend (Nginx + React) :80
          |
          v
backend (Gunicorn + Flask + CPU PathNet) :8000
          |
          v
PostgreSQL

backend -- HTTPS --> Groq Chat Completions API
```

PostgreSQL и backend не публикуют порты хоста. Браузер обращается только к
frontend Nginx; Groq API key существует только в окружении backend.

## 1. Требования

- Linux-сервер с Docker Engine и Docker Compose v2;
- исходящий HTTPS-доступ к `api.groq.com`;
- минимум 2 GB RAM и 3 GB свободного диска;
- домен и внешний HTTPS reverse proxy для публичной эксплуатации.

## 2. Production environment

```bash
cp .env.production.example .env
chmod 600 .env
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Три результата записать в `SECRET_KEY`, `JWT_SECRET_KEY` и
`POSTGRES_PASSWORD`. Отдельно создать Groq key и записать только в
`GROQ_API_KEY`. Для публичного HTTPS установить:

```dotenv
PUBLIC_ORIGIN=https://sanaq.example.kz
JWT_COOKIE_SECURE=true
SEED_DEMO_DATA=false
DATA_MODE=production

AI_MODEL=llama-3.1-8b-instant
AI_RATE_LIMIT_PER_MINUTE=10
AI_DAILY_TOKEN_LIMIT=20000
PATHNET_MODE=shadow
PATHNET_CANARY_PERCENT=0
```

Файл `.env` нельзя коммитить, отправлять во frontend или выводить в CI logs.

## 3. Проверка и запуск

```bash
docker compose config --quiet
docker compose build backend frontend
docker compose up -d
docker compose ps
docker compose logs --tail=100 backend
```

Backend image содержит CPU-only PyTorch и checkpoint
`pathnet-v2-outcomes-notebook.pt`. Ollama, GPU overlay и model volume в
production-контуре отсутствуют.

Проверка:

```bash
curl -fsS http://127.0.0.1/api/v1/health
curl -fsS http://127.0.0.1/api/v1/ready
```

В readiness ожидаются `database=ok`, `ai=groq_configured_with_fallback` и при
`PATHNET_MODE=shadow|canary|active` — версия загруженного checkpoint.

## 4. Проверка AI

Отправить тестовое сообщение через штатный `/api/v1/ai/conversations/...`
поток. Успешное сообщение должно иметь модель из `AI_MODEL` и
`fallback_used=false`.

Если Groq недоступен, API честно возвращает:

```json
{
  "fallback_used": true,
  "failure_code": "ai_provider_unavailable"
}
```

Это проверяет только отказоустойчивость. Такой ответ не подтверждает работу
Groq и не должен засчитываться как успешный cloud AI test.

## 5. PathNet rollout

1. Оставить `PATHNET_MODE=shadow` и собрать метрики.
2. Включить `canary` с `PATHNET_CANARY_PERCENT=10`.
3. Проверить нулевое число prerequisite violations и fallback rate.
4. После проверки включить `active`.

Ответы preview, маршрута и next-step содержат `ranking.applied`,
`model_version`, `fallback_used` и безопасный `failure_code` при отказе.

## 6. Бэкап и обновление

```bash
docker compose exec -T postgres pg_dump -U sanaq -d sanaq > sanaq-backup.sql
git pull
docker compose build backend frontend
docker compose up -d
docker compose ps
```

Не выполнять `docker compose down -v`, если нужно сохранить PostgreSQL.

## 7. Перед публичным трафиком

- включить HTTPS и `JWT_COOKIE_SECURE=true`;
- отключить demo seed;
- настроить ежедневный backup PostgreSQL;
- проверить rate limit и дневной token budget AI-чата под ожидаемой нагрузкой;
- настроить мониторинг Groq `401`, `429`, timeout и fallback rate;
- проверить русские и казахские ответы на тестовом аккаунте;
- провести PathNet shadow/canary rollout до `active`.
