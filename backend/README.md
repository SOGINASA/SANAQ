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

Проверки:

```powershell
python -m pytest -q
```

Docker:

```powershell
docker compose up --build
```

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
| POST | `/api/v1/ai/explanations`, `/api/v1/ai/hints` | Серверный учебный движок на проверенном контенте |
| POST/GET | `/api/v1/ai/conversations...` | Сохраняемые диалоги учебного ассистента |
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
