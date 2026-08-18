# Legacy: локальная Qwen3 для SANAQ через Ollama

> Эта инструкция сохранена только для локальной/изолированной разработки.
> Канонический production Compose использует Groq и не содержит Ollama-сервис.

Документ предназначен для backend/DevOps-разработчика. Он описывает размещение
`qwen3:8b` через Ollama рядом с Flask Backend SANAQ.

## 1. Целевая архитектура

```text
Браузер ученика
       |
       | HTTPS
       v
Nginx / reverse proxy
       |
       v
SANAQ Backend :8000
       |
       | внутренняя Docker-сеть
       v
Ollama :11434
       |
       v
qwen3:8b в persistent volume
```

Порт Ollama нельзя публиковать в интернет. Клиентские приложения обращаются только
к SANAQ Backend. JWT, rate limiting, педагогические правила и сохранение истории
остаются на backend.

## 2. Требования к серверу

Нужен VPS/VDS или выделенный Linux-сервер с SSH, Docker и возможностью запускать
долгоживущие контейнеры. Обычный shared-хостинг для этого не подходит.

Перед установкой собрать характеристики:

```bash
uname -a
cat /etc/os-release
nproc
free -h
df -h /
docker --version
nvidia-smi
```

Практические ориентиры для `qwen3:8b` в квантовании Q4:

- CPU-only: желательно не менее 16 GB RAM; генерация будет заметно медленнее GPU;
- NVIDIA GPU: 12 GB VRAM или больше рекомендуется для модели, KV-cache и служебных
  аллокаций;
- диск: желательно не менее 15 GB свободного места под образ, модель и обновления;
- на первом этапе использовать один загруженный экземпляр модели и один параллельный
  запрос, затем измерить нагрузку.

Размер файла модели не равен требуемой памяти процесса. Потребление памяти растёт с
длиной контекста и количеством параллельных запросов.

## 3. Подготовка production environment

Скопировать `backend/.env.example` в секретное окружение сервера. Сам `.env` не
коммитить.

Минимальные AI-параметры для Docker-сети:

```dotenv
AI_PROVIDER=ollama
AI_BASE_URL=http://ollama:11434
AI_MODEL=qwen3:8b
AI_PROMPT_VERSION=sana-tutor-v1
AI_TIMEOUT_SECONDS=120
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=500
AI_CONTEXT_TOKENS=8192
AI_THINKING=false
```

Также обязательно задать уникальные production-секреты:

```dotenv
FLASK_ENV=production
SECRET_KEY=<long-random-value>
JWT_SECRET_KEY=<another-long-random-value>
JWT_COOKIE_SECURE=true
AUTO_CREATE_DB=false
SEED_DEMO_DATA=false
CORS_ORIGINS=https://<frontend-domain>
```

Сгенерировать значения можно менеджером секретов инфраструктуры или командой:

```bash
openssl rand -hex 32
```

Не выводить секреты в логи и CI output.

## 4. Docker Compose: CPU-вариант

В production Compose добавить сервис Ollama. Важное отличие между `expose` и
`ports`: используется только `expose`, поэтому `11434` доступен контейнерам в той же
сети, но не публикуется на интерфейс сервера.

```yaml
services:
  backend:
    build:
      context: .
    restart: unless-stopped
    env_file:
      - .env
    environment:
      AI_PROVIDER: ollama
      AI_BASE_URL: http://ollama:11434
      AI_MODEL: qwen3:8b
    depends_on:
      ollama:
        condition: service_healthy

  ollama:
    image: ollama/ollama:latest
    restart: unless-stopped
    expose:
      - "11434"
    environment:
      OLLAMA_CONTEXT_LENGTH: "8192"
      OLLAMA_NUM_PARALLEL: "1"
      OLLAMA_MAX_LOADED_MODELS: "1"
      OLLAMA_MAX_QUEUE: "32"
    volumes:
      - ollama_data:/root/.ollama
    healthcheck:
      test: ["CMD", "ollama", "list"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 20s

volumes:
  ollama_data:
```

Не копировать модель внутрь Docker image: это увеличит образ и будет заставлять
заново переносить веса при каждом релизе. Модель должна храниться в named volume
`ollama_data`.

## 5. NVIDIA GPU-вариант

Сначала на хосте должны работать драйвер и `nvidia-smi`. Затем установить NVIDIA
Container Toolkit по официальной инструкции:

- https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- https://github.com/ollama/ollama/blob/main/docs/docker.mdx

Проверить доступ Docker к GPU:

```bash
docker run --rm --gpus all ubuntu nvidia-smi
```

Если команда не видит GPU, Ollama в контейнере тоже его не увидит.

Для GPU к сервису `ollama` добавить:

```yaml
services:
  ollama:
    gpus: all
```

Если используемая версия Docker Compose не поддерживает `gpus: all`, применить
reservation:

```yaml
services:
  ollama:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

После запуска проверить фактическое размещение модели:

```bash
docker compose exec ollama ollama ps
```

В колонке `PROCESSOR` ожидается `100% GPU`. Если отображается `100% CPU`, проверить
NVIDIA runtime и логи Ollama.

## 6. Первый запуск и скачивание модели

Поднять только Ollama:

```bash
docker compose up -d ollama
docker compose ps
docker compose logs --tail=100 ollama
```

Скачать модель в persistent volume:

```bash
docker compose exec ollama ollama pull qwen3:8b
docker compose exec ollama ollama list
```

Проверить ответ внутри контейнера:

```bash
docker compose exec ollama ollama run qwen3:8b
```

Тестовый запрос через API из Docker-сети:

```bash
docker compose exec backend python -c "import json, urllib.request; payload=json.dumps({'model':'qwen3:8b','stream':False,'think':False,'messages':[{'role':'user','content':'Ответь одним словом: готов?'}]}).encode(); request=urllib.request.Request('http://ollama:11434/api/chat',data=payload,headers={'Content-Type':'application/json'}); print(json.load(urllib.request.urlopen(request,timeout=120))['message']['content'])"
```

После успешного теста поднять backend:

```bash
docker compose up -d --build backend
docker compose ps
docker compose logs --tail=100 backend
```

## 7. Проверка SANAQ API

Проверка конфигурации без раскрытия секретов:

```bash
curl -sS https://<api-domain>/api/v1/meta
curl -sS https://<api-domain>/api/v1/ready
```

В `/meta` ожидается:

```json
{
  "feature_flags": {
    "ai_provider": "ollama",
    "ai_model": "qwen3:8b"
  }
}
```

Полный chat endpoint защищён JWT. Проверять его нужно через тестового ученика или
интеграционный smoke-test, не отключая авторизацию.

Ожидаемый SSE-контракт:

```text
event: token
data: {"text":"..."}

event: done
data: {"message":{...}}
```

## 8. Nginx и потоковые ответы

Для SSE необходимо отключить proxy buffering и увеличить read timeout:

```nginx
location /api/ {
    proxy_pass http://backend:8000;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 180s;
    proxy_send_timeout 180s;
    add_header X-Accel-Buffering no;
}
```

TLS обязателен. Сертификат можно выпустить через инфраструктуру хостинга или
Let's Encrypt. Не смешивать HTTPS frontend с HTTP API: браузер заблокирует mixed
content.

Frontend production build должен получить публичный URL backend:

```dotenv
REACT_APP_API_URL=https://<api-domain>/api/v1
REACT_APP_AI_STREAM_URL=https://<api-domain>/api/v1
```

После изменения переменных Create React App необходимо пересобрать: эти значения
встраиваются в bundle во время `npm run build`.

## 9. Безопасность

Обязательные ограничения:

1. Не публиковать порт `11434` через firewall, Docker `ports` или reverse proxy.
2. Не вызывать Ollama напрямую из браузера.
3. Оставить JWT-проверку на `/ai/conversations...`.
4. Настроить rate limiting отдельно для авторизации и AI-запросов.
5. Ограничить размер тела запроса и длину сообщения.
6. Не передавать модели email, телефон, имя школы и другие лишние данные ребёнка.
7. Не записывать полный prompt и персональные данные в production-логи.
8. Разрешить CORS только production-доменам frontend.
9. Ограничить доступ к Docker socket и `.env`.
10. Настроить резервное копирование БД; volume модели резервировать необязательно,
    потому что её можно повторно скачать.

Ollama — внутренний inference-компонент, а не публичный security boundary.

## 10. Производительность и конкуренция

Начальные безопасные настройки:

```dotenv
AI_CONTEXT_TOKENS=8192
AI_MAX_TOKENS=500
AI_TIMEOUT_SECONDS=120
AI_THINKING=false
```

```yaml
OLLAMA_NUM_PARALLEL: "1"
OLLAMA_MAX_LOADED_MODELS: "1"
OLLAMA_MAX_QUEUE: "32"
```

Не увеличивать `OLLAMA_NUM_PARALLEL` без нагрузочного теста. Дополнительные
параллельные запросы увеличивают память, необходимую под контекст. При высокой
нагрузке backend должен ограничивать частоту запросов на пользователя и возвращать
понятный `429`, а не допускать исчерпание RAM/VRAM.

Минимальные метрики:

- latency до первого токена;
- полная длительность ответа;
- число активных и ожидающих запросов;
- процент fallback-ответов;
- RAM, VRAM и CPU/GPU utilization;
- количество `429`, timeout и ошибок Ollama.

## 11. Диагностика

Состояние контейнеров:

```bash
docker compose ps
docker compose logs --tail=200 backend
docker compose logs --tail=200 ollama
```

Модели и загрузка в память:

```bash
docker compose exec ollama ollama list
docker compose exec ollama ollama ps
```

Проверка сети из backend:

```bash
docker compose exec backend python -c "import urllib.request; print(urllib.request.urlopen('http://ollama:11434/api/tags',timeout=5).status)"
```

Если `/api/tags` доступен, но чат зависает:

- проверить свободную RAM/VRAM;
- посмотреть `docker stats`;
- временно уменьшить `AI_CONTEXT_TOKENS` до `4096`;
- оставить `OLLAMA_NUM_PARALLEL=1`;
- проверить, не буферизует ли nginx SSE;
- проверить, приходит ли `event: token` через публичный HTTPS endpoint.

Если модель отвечает через Ollama, но SANAQ использует fallback:

- проверить `AI_BASE_URL=http://ollama:11434` внутри backend-контейнера;
- убедиться, что модель называется ровно `qwen3:8b`;
- проверить timeout и traceback backend;
- убедиться, что оба сервиса находятся в одной Compose network.

## 12. Обновление и откат

Перед обновлением сохранить текущие версии image tags. Для предсказуемого production
лучше зафиксировать версии вместо постоянного использования `latest`.

Обновление приложения:

```bash
docker compose pull
docker compose build backend
docker compose up -d
docker compose ps
```

Обновление Ollama не удаляет модель, пока named volume `ollama_data` не удалён.
Не выполнять `docker compose down -v`, если нужно сохранить скачанные веса.

После каждого обновления выполнить:

```bash
docker compose exec ollama ollama list
curl -sS https://<api-domain>/api/v1/ready
```

Затем провести один авторизованный диалог и проверить, что в сохранённом сообщении:

- `generated_by_ai` равен `true`;
- `model_version` равен `qwen3:8b`;
- SSE завершается событием `done`;
- ответ появляется в истории разговора.

## 13. Официальные ссылки

- Ollama для Linux: https://docs.ollama.com/linux
- Ollama в Docker: https://github.com/ollama/ollama/blob/main/docs/docker.mdx
- Qwen3 в Ollama: https://ollama.com/library/qwen3
- NVIDIA Container Toolkit: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html

