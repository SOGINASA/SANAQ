# SANAQ Frontend

React-интерфейс рабочего MVP-сценария:

```text
регистрация → профиль → диагностика → маршрут → задание → объяснение → прогресс
```

## Запуск

Сначала запустите backend на порту `8000`, затем frontend:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm start
```

Frontend будет доступен на `http://localhost:3000`.

Проверки:

```powershell
npm test -- --watchAll=false
$env:GENERATE_SOURCEMAP='false'; npm run build
```

## Источники данных

Frontend не подставляет mock-данные при сетевой ошибке. Если backend недоступен, пользователь
видит явное сообщение об ошибке.

- `Backend API · демо seed` — данные пришли из API, но созданы демонстрационным seed;
- `Backend API · реальные данные` — backend работает в режиме `DATA_MODE=live`;
- `Проверенный fallback · не внешний AI` — объяснение сформировано локальным
  детерминированным алгоритмом, а не внешней AI-моделью.

Режим передаётся backend-заголовком `X-Data-Mode`. Автоматические mocks отключены через
`REACT_APP_ENABLE_MOCKS=false`.

## Авторизация

Access token хранится в `localStorage` и передаётся в `Authorization: Bearer ...`.
Refresh token остаётся в HttpOnly cookie. При обычном `401` API-клиент один раз обновляет
access token; ошибки login/register/refresh/logout не запускают повторный refresh.
