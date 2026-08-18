# SANAQ: handoff для backend/DevOps

Канонический production-запуск выполняется из корня репозитория через
`compose.yaml`. На хосте не нужно отдельно запускать Flask, PostgreSQL, Ollama
или локальную LLM.

## Архитектура

```text
HTTPS proxy -> frontend -> backend -> PostgreSQL
                            |
                            +-> Groq API по HTTPS
                            +-> CPU PathNet checkpoint внутри image
```

Публичным должен быть только frontend либо внешний HTTPS proxy. Groq key нельзя
передавать в `REACT_APP_*`, browser bundle, ответы API или логи.

## Подготовка

```bash
git clone <REPOSITORY_URL> sanaq
cd sanaq
test -s backend/ml/artifacts/pathnet-v2-outcomes-notebook.pt
cp .env.production.example .env
chmod 600 .env
```

Сгенерировать независимые `SECRET_KEY`, `JWT_SECRET_KEY` и
`POSTGRES_PASSWORD`, затем заполнить:

```dotenv
GROQ_API_KEY=<server-only Groq key>
AI_MODEL=llama-3.1-8b-instant
AI_TIMEOUT_SECONDS=30
AI_RATE_LIMIT_PER_MINUTE=10
AI_DAILY_TOKEN_LIMIT=20000

PATHNET_MODE=shadow
PATHNET_TOP_K=20
PATHNET_CANARY_PERCENT=0
```

Для production также установить `PUBLIC_ORIGIN`, `JWT_COOKIE_SECURE=true`,
`DATA_MODE=production` и `SEED_DEMO_DATA=false`.

## Валидация и запуск

```bash
docker compose config --quiet
docker compose build backend frontend
docker compose up -d
docker compose ps
docker compose logs --tail=150 backend
```

Ожидаются три сервиса: `frontend`, `backend`, `postgres`. Сервисов и volumes
Ollama быть не должно.

```bash
curl -fsS http://127.0.0.1/api/v1/health
curl -fsS http://127.0.0.1/api/v1/ready
```

Readiness должен показывать `groq_configured_with_fallback`. Это подтверждает
конфигурацию, но не выполняет платный Groq-запрос. Cloud AI проверяется только
штатным тестовым сообщением; `fallback_used=true` означает неуспешный Groq test.

## Отказы

- Groq `401`: проверить server-side key и не выводить его значение.
- Groq `429`: снизить нагрузку/добавить backoff и проверить лимиты аккаунта.
- Timeout/обрыв до первого token: API возвращает явно помеченный fallback.
- Обрыв после первого token: поток завершается `AI_STREAM_INTERRUPTED`, частичный
  ответ не сохраняется как завершённый.
- PathNet unavailable: readiness возвращает `503`, а запрос планирования
  использует deterministic fallback с `failure_code=pathnet_unavailable`.
- Prerequisite violation: результат PathNet не применяется; API возвращает
  `failure_code=prerequisite_violation`.

## Обновление и backup

```bash
docker compose exec -T postgres pg_dump -U sanaq -d sanaq > sanaq-backup.sql
git pull
docker compose build backend frontend
docker compose up -d
docker compose ps
```

Не использовать `docker compose down -v` без намерения удалить PostgreSQL.

## Чек-лист запуска

- [ ] `.env` имеет права `600` и не отслеживается Git;
- [ ] Groq key отсутствует во frontend и логах;
- [ ] `/ready` возвращает ожидаемую версию PathNet;
- [ ] реальный RU/KK Groq stream проверен с `fallback_used=false`;
- [ ] rate limit и дневной token budget настроены;
- [ ] PathNet запускается с `shadow`, затем `canary`, затем `active`;
- [ ] prerequisite violations равны нулю;
- [ ] backup PostgreSQL проверен восстановлением.
