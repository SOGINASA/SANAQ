# SANAQ Backend

Стартовый Flask-бэкенд SANAQ, адаптированный из общего шаблона под контракт
[`API_ROUTES.md`](API_ROUTES.md). Все 111 маршрутов из документа зарегистрированы во Flask
и проверяются автоматическим контрактным тестом. Все маршруты возвращают данные из серверной
логики и базы данных; успешные frontend-заглушки не используются.

## Стек

- Flask и application factory;
- SQLAlchemy + Flask-Migrate;
- SQLite локально, возможность подключить PostgreSQL через `DATABASE_URL`;
- JWT access token в `Authorization`, refresh token в HttpOnly cookie;
- bcrypt для паролей;
- pytest;
- Docker/Gunicorn.

## Быстрый старт

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python app.py
```

API будет доступен по адресу `http://localhost:8000/api/v1`.

### Локальная Qwen3 для SANA

Ollama запускается нативно на компьютере, отдельно от Flask:

```bash
ollama serve
ollama pull qwen3:8b
```

При обычном запуске Flask используется `AI_BASE_URL=http://127.0.0.1:11434`.
При запуске backend через Docker Compose адрес автоматически меняется на
`http://host.docker.internal:11434`. Остальные параметры модели перечислены в
`.env.example`. Если Ollama остановлена или не успела ответить, API сохраняет вопрос и
возвращает явно помеченный безопасный fallback вместо скрытой заглушки.

При запуске `MIGRATE_RUNTIME_SCHEMA=true` backend идемпотентно создаёт недостающие
таблицы AI-диалогов и добавляет совместимые AI-колонки, не изменяя существующие данные.
Для production этот флаг нужно оставить включённым хотя бы на первом запуске версии.

Проверки:

```powershell
python -m pytest -q
```

Backend-only Docker для локальной проверки:

```powershell
docker compose up --build
```

Полный контур с frontend, PostgreSQL, PathNet и Ollama запускается из корня
репозитория по инструкции `docs/MVP_DEPLOYMENT.md`.

Отдельный технический handoff для backend/DevOps со всеми командами хоста:
[`docs/BACKEND_HOST_HANDOFF.md`](docs/BACKEND_HOST_HANDOFF.md).

## Реализованные группы маршрутов

| Метод | URL | Назначение |
|---|---|---|
| GET | `/api/v1/health` | Liveness |
| GET | `/api/v1/ready` | Проверка БД |
| GET | `/api/v1/meta` | Версия, языки, feature flags |
| POST | `/api/v1/auth/register` | Регистрация ученика/учителя |
| POST | `/api/v1/auth/login` | Вход |
| POST | `/api/v1/auth/refresh` | Обновление access token по cookie |
| POST | `/api/v1/auth/logout` | Очистка auth cookies |
| GET | `/api/v1/auth/me` | Текущий пользователь |
| POST | `/api/v1/auth/forgot-password` | Запрос сброса пароля |
| POST | `/api/v1/auth/reset-password` | Сброс пароля |
| GET/DELETE | `/api/v1/auth/sessions...` | Просмотр и отзыв refresh-сессий |
| GET/PATCH/DELETE | `/api/v1/users/me...` | Профиль и настройки пользователя |
| GET/PUT | `/api/v1/students/me/profile` | Учебный профиль ученика |
| GET/PUT | `/api/v1/teachers/me/profile` | Профиль учителя |
| GET | `/api/v1/catalog/...` | Классы, предметы, темы, цели и языки |
| GET/POST | `/api/v1/diagnostics...` | Адаптивная диагностика и результат |
| GET/POST/PATCH | `/api/v1/learning-paths...` | Персональный маршрут и следующий шаг |
| GET | `/api/v1/modules...`, `/lessons...`, `/tasks...` | Учебный контент без скрытых ответов |
| POST/GET | `/api/v1/attempts...` | Ответ, завершение попытки и результат |
| GET/POST | `/api/v1/ai/conversations...` | История и потоковые ответы Qwen3 через Ollama |
| POST | `/api/v1/ai/explanations`, `/api/v1/ai/hints` | Серверный учебный движок на проверенном контенте |
| GET | `/api/v1/students/me/progress...` | Прогресс и слабые навыки |
| GET | `/api/v1/students/me/knowledge-map` | Узлы mastery и зависимости |
| GET/POST/PATCH | `/api/v1/classes...`, `/api/v1/assignments...` | Классы, ученики и назначения учителя |
| GET/PATCH/POST | `/api/v1/notifications...`, `/api/v1/reviews...` | Уведомления и интервальные повторения |
| POST/PATCH/DELETE | `/api/v1/modules...`, `/api/v1/lessons...`, `/api/v1/tasks...` | Управление учебным контентом |
| GET | `/api/v1/admin/users` | Список пользователей для admin |
| PATCH | `/api/v1/admin/users/:id/status` | Роль и статус пользователя |

Успешные ответы используют envelope `data/meta`, ошибки — `error` с `request_id`,
как определено в контракте. Роли: `student`, `teacher`, `admin`; идентификаторы — UUID.

Все URL из `API_ROUTES.md` зарегистрированы с рабочей серверной логикой. Контрактный тест
проверяет точное совпадение URL и HTTP-методов с Flask-приложением.

## Демонстрационные данные

Основной каталог математики для 7–12 классов хранится в
`data/curriculum/mathematics_7_12.v1.json`: 60 тем, 180 атомарных навыков и
201 направленная связь предпосылок на
русском и казахском языках. Для каждого навыка заданы оценка времени,
сложность и важность — эти поля позже используются генератором маршрута.
Импорт идемпотентный:

```powershell
python -m flask --app app seed-curriculum
```

Каталог можно получать целиком или фильтровать по классу:
`GET /api/v1/catalog/subjects/mathematics/topics?grade=9`.
Для планировщика доступен граф навыков:
`GET /api/v1/catalog/subjects/mathematics/knowledge-graph?grade=9`. Он возвращает
все навыки выбранного класса и рекурсивно добавляет необходимые основы прошлых
классов.
Состояние конкретного ученика поверх этого графа доступно через
`GET /api/v1/students/me/curriculum-state?subject_id=mathematics&grade=9`.
Навыки получают состояния `ready`, `blocked`, `learning`, `gap`, `mastered` или
`review_due`, а ответ содержит причины блокировки и первые рекомендации.

## Планировщик, задания и ML

`deterministic-planner-v1` строит календарный preview через
`POST /api/v1/students/me/study-plan/preview`. Он соблюдает дневной лимит,
разблокирует навыки только после prerequisites и добавляет интервальные
повторения через 1, 3 и 7 дней. При нехватке времени остаток явно возвращается в
`unscheduled`.

Генераторы заданий находятся в `services/task_generation/`. Числовые шаблоны
имеют независимый валидатор ответа; для ещё не покрытых математических типов
используется валидируемый conceptual fallback. Все 180 навыков проходят общий
контракт `taskgen-v1`.

Сервер автоматически пишет обезличенные события начала попытки, ответа,
завершения, диагностики, повторения и построения плана. Сырые ответы, токены и
пароли запрещены валидатором событий.

Симулятор и компактный PathNet расположены в `ml/`. Полная инструкция по
созданию датасета и обучению приведена в `ml/README.md`. PyTorch вынесен в
`requirements-ml.txt` и не требуется обычному API-процессу.

Для пошагового запуска и визуального анализа есть Jupyter Notebook
`notebooks/pathnet_training_v2.ipynb`: он показывает распределения данных,
loss/F1/MAE по эпохам, confusion matrix, сравнение с baseline и примеры
предсказаний.

PathNet подключается к API только через `PATHNET_MODE=shadow`: его прогнозы не
меняют пользовательский маршрут, а сравниваются с deterministic planner. Метрики
доступны администратору через `GET /api/v1/admin/pathnet/metrics`. Любая ошибка
загрузки или inference автоматически оставляет deterministic план рабочим.

Текущий локальный baseline `pathnet-v2-synthetic-outcomes` обучен на 10 000
симулированных учеников и 973 143 состояниях навыков. Его целевая функция —
ожидаемый учебный результат, а не простое копирование deterministic planner.
Метрики этого checkpoint характеризуют только синтетическую holdout-выборку и
не доказывают эффективность на реальных школьниках.

При `SEED_DEMO_DATA=true` создаются один предмет, три темы математики 9 класса,
шесть навыков, шесть диагностических вопросов, три урока и шесть заданий. Seed можно
безопасно запускать повторно:

```powershell
python -m flask --app app seed-demo
```

Реализованный критический путь:

```text
диагностика → mastery по навыкам → результат → learning path →
задание → серверное объяснение → завершение попытки → карта и прогресс
```

## Структура

```text
backend/
├── app.py              фабрика Flask, middleware, callbacks и CLI
├── config.py           окружения и настройки
├── models.py           текущие SQLAlchemy-модели
├── routes/             HTTP-контроллеры
├── services/           бизнес-логика следующих вертикальных срезов
├── utils/              ответы и role-based access
├── tests/              интеграционные тесты API
└── database/           локальная SQLite, не коммитится
```
