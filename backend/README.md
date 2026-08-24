# SANAQ Backend

## Google OAuth

Backend поддерживает Google OAuth 2.0 / OpenID Connect. Создайте в Google Cloud
Console OAuth client типа **Web application** и добавьте точный callback
`http://127.0.0.1:8000/api/v1/auth/google/callback` в Authorized redirect URIs.
Заполните `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` и
`FRONTEND_URL` в `backend/.env`. Client secret никогда не должен попадать во frontend.

Маршруты: `GET /api/v1/auth/google`, `GET /api/v1/auth/google/callback` и
`POST /api/v1/auth/google/exchange`. Последний обменивает короткоживущий одноразовый
код на штатную JWT-сессию SANAQ.

## Демо-аккаунты

Команда `python3 -m flask --app app seed-demo` создаёт учебный контент, демонстрационный класс и три аккаунта с единым паролем `SanaqDemo2026!`:

- `student@sanaq.demo` — ученик;
- `teacher@sanaq.demo` — учитель;
- `admin@sanaq.demo` — администратор.

При `SEED_DEMO_DATA=true` они создаются автоматически при запуске. В production-конфигурации seed и быстрый демо-вход отключены по умолчанию; включайте их только явно для демонстрационного стенда.

Стартовый Flask-бэкенд SANAQ, адаптированный из общего шаблона под контракт
[`API_ROUTES.md`](API_ROUTES.md). Все 145 маршрутов из документа зарегистрированы во Flask
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
Эта конфигурация предназначена только для локальной разработки. Production
Docker Compose использует Groq через backend-only ключ; браузер ключ не получает.
Если выбранный провайдер недоступен, API сохраняет вопрос и возвращает явно
помеченный безопасный fallback вместо скрытой заглушки.

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

Полный контур с frontend, PostgreSQL, PathNet и Groq запускается из корня
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
| GET | `/api/v1/lessons/:id/workbook.pdf`, `/modules/:id/workbook.pdf` | Брендированные пятистраничные A4-воркбуки |
| POST/GET | `/api/v1/attempts...` | Ответ, завершение попытки и результат |
| GET/POST | `/api/v1/ai/conversations...` | История и потоковые ответы выбранного AI provider |
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

## Уроки и воркбуки

Каждый опубликованный урок получает единый структурированный guide: цели, теорию,
опорную формулу, алгоритм, типичные ошибки, разобранные примеры, практику с ответами
и рефлексию. Этот же guide отображается во frontend и служит источником для PDF,
поэтому экран и печатный материал не расходятся по содержанию.

ReportLab собирает для урока ровно пять страниц A4. В production-образе установлен
DejaVu Sans для кириллицы; альтернативные шрифты можно указать переменными
`SANAQ_PDF_FONT_REGULAR` и `SANAQ_PDF_FONT_BOLD`. Учитель может включить автоматически
собранный PDF в назначение либо загрузить собственный PDF до 10 МБ. Загруженный файл
доступен только владельцу, администратору и ученикам назначенного класса.

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

Единый сервис планирования используется для preview, создания и пересчёта
сохранённого маршрута и выдачи следующего шага. `deterministic-planner-v1`
раскладывает результат ранжирования по календарю, соблюдает дневной лимит,
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

PathNet поддерживает режимы `off`, `shadow`, `canary` и `active`. В `shadow` его
прогнозы не меняют маршрут, в `canary` применяются для стабильной доли учеников,
а в `active` — для всех. Planner всегда повторно проверяет prerequisite-граф.
Любая ошибка checkpoint/inference или нарушение prerequisite переключает запрос
на deterministic planner и явно возвращает `fallback_used=true` с безопасным
`failure_code`. Применённая версия сохраняется в API и событии маршрута. Shadow-
метрики доступны через `GET /api/v1/admin/pathnet/metrics`.

Текущий локальный baseline `pathnet-v2-synthetic-outcomes` обучен на 10 000
симулированных учеников и 973 143 состояниях навыков. Его целевая функция —
ожидаемый учебный результат, а не простое копирование deterministic planner.
Метрики этого checkpoint характеризуют только синтетическую holdout-выборку и
не доказывают эффективность на реальных школьниках.

При `SEED_DEMO_DATA=true` создаются один предмет, три темы математики 9 класса,
шесть навыков, три урока и банк из 18 заданий — по три варианта на каждый навык.
Диагностика выбирает один стабильный вариант на навык для текущего прохождения,
а новое прохождение может получить другой набор. Seed можно безопасно запускать повторно:

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
