# SANAQ Backend — API-контракт для MVP

Документ описывает рекомендуемый REST API. Backend-команда может выбрать Node.js, Python или другой стек, сохранив публичный контракт.

## 1. Общие правила

- Базовый префикс: `/api/v1`.
- Формат: JSON, кодировка UTF-8.
- Авторизация: access JWT в заголовке `Authorization: Bearer <token>`; refresh token — в `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- Роли: `student`, `teacher`, `admin`.
- Идентификаторы: UUID.
- Время: ISO 8601 в UTC; часовой пояс пользователя хранить отдельно.
- Язык ответа: `Accept-Language: kk|ru|en`, для MVP обязательны `kk` и `ru`.
- Пагинация: `?page=1&page_size=20`; в ответе `items`, `page`, `page_size`, `total`.
- Идемпотентность важных POST-запросов: заголовок `Idempotency-Key`.
- Каждая AI-рекомендация должна иметь `reason`, `source_skill_ids`, `confidence` и версию модели/алгоритма для объяснимости.

Успешный ответ:

```json
{
  "data": {},
  "meta": { "request_id": "uuid" }
}
```

Ошибка:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Проверьте заполненные поля",
    "details": [{ "field": "grade", "message": "Допустимы классы 7–12" }],
    "request_id": "uuid"
  }
}
```

Основные коды: `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`, `503`.

## 2. Системные маршруты

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| GET | `/health` | public | Liveness-проверка процесса |
| GET | `/ready` | public | Проверка БД, cache и AI-провайдера |
| GET | `/meta` | public | Версия API, поддерживаемые языки и feature flags |

## 3. Авторизация и сессия

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| POST | `/auth/register` | public | Регистрация ученика или учителя |
| POST | `/auth/login` | public | Вход по email/телефону и паролю |
| POST | `/auth/refresh` | cookie | Обновление access token |
| POST | `/auth/logout` | user | Отзыв refresh-сессии |
| POST | `/auth/forgot-password` | public | Отправка одноразового кода/ссылки |
| POST | `/auth/reset-password` | public | Установка нового пароля |
| GET | `/auth/me` | user | Текущий пользователь, роль и настройки |
| GET | `/auth/sessions` | user | Активные устройства |
| DELETE | `/auth/sessions/:sessionId` | user | Завершение выбранной сессии |

Для несовершеннолетних предусмотреть флаги `parental_consent_required` и `parental_consent_status`; персональные данные собирать минимально.

## 4. Профили и настройки

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| GET | `/users/me` | user | Полный профиль |
| PATCH | `/users/me` | user | Имя, регион, часовой пояс, язык |
| GET | `/users/me/preferences` | user | UI, язык, уведомления, доступность |
| PATCH | `/users/me/preferences` | user | Изменение настроек |
| DELETE | `/users/me` | user | Запрос удаления аккаунта и данных |
| GET | `/students/me/profile` | student | Класс, предметы, цели и уровень |
| PUT | `/students/me/profile` | student | Создание/обновление учебного профиля |
| GET | `/teachers/me/profile` | teacher | Профиль учителя и школа |
| PUT | `/teachers/me/profile` | teacher | Создание/обновление профиля учителя |

## 5. Справочники образования

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| GET | `/catalog/grades` | public | Классы 7–12 |
| GET | `/catalog/subjects` | public | Доступные предметы |
| GET | `/catalog/subjects/:subjectId/topics?grade=` | user | Дерево тем и навыков; фильтр по классу 7–12 |
| GET | `/catalog/subjects/:subjectId/knowledge-graph?grade=` | user | Граф навыков выбранного класса со всеми необходимыми основами |
| GET | `/catalog/goals` | public | Экзамен, олимпиада, повторение и др. |
| GET | `/catalog/locales` | public | Поддерживаемые языки |

Тема содержит `prerequisite_skill_ids`, чтобы backend мог объяснить связи на карте знаний.

## 6. Диагностика

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| POST | `/diagnostics` | student | Создать попытку по предмету и цели |
| GET | `/diagnostics/:diagnosticId` | owner/teacher | Состояние попытки и прогресс |
| GET | `/diagnostics/:diagnosticId/next-question` | owner | Получить следующий адаптивный вопрос |
| POST | `/diagnostics/:diagnosticId/answers` | owner | Сохранить ответ и вычислить следующий шаг |
| POST | `/diagnostics/:diagnosticId/complete` | owner | Завершить попытку и построить профиль знаний |
| GET | `/diagnostics/:diagnosticId/result` | owner/teacher | Уровень, пробелы, сильные стороны, объяснение |
| GET | `/students/me/diagnostics` | student | История диагностик |

`POST /answers` принимает `question_id`, ответ, время решения и номер попытки. Ответ возвращает только необходимую обратную связь; правильный ответ до завершения попытки не раскрывается.

## 7. Карта знаний и персональный маршрут

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| GET | `/students/me/knowledge-map?subject_id=` | student | Узлы, связи, mastery и состояние блокировки |
| GET | `/students/:studentId/knowledge-map` | linked teacher/admin | Карта конкретного ученика |
| GET | `/students/me/learning-paths` | student | Список маршрутов |
| POST | `/students/me/learning-paths` | student | Создать маршрут под цель |
| POST | `/students/me/study-plan/preview` | student | Календарный маршрут deterministic planner v1 |
| GET | `/learning-paths/:pathId` | owner/teacher | Шаги, прогресс, дедлайн и причины |
| POST | `/learning-paths/:pathId/recalculate` | owner/system | Перестроить маршрут после результата |
| GET | `/learning-paths/:pathId/next-step` | owner | Один рекомендуемый «шаг дня» |
| PATCH | `/learning-paths/:pathId` | owner | Цель, темп, дата экзамена |

Статусы узла: `locked`, `available`, `learning`, `mastered`, `review_due`. Уровень освоения хранить числом `0..1`, но показывать ученику понятную подпись.

## 8. Учебный контент

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| GET | `/modules` | user | Фильтр по предмету, классу, теме, языку |
| GET | `/modules/:moduleId` | user | Модуль и список уроков |
| GET | `/lessons/:lessonId` | user | Теория, примеры и доступные задания |
| POST | `/modules` | teacher/admin | Создать модуль |
| PATCH | `/modules/:moduleId` | author/admin | Изменить модуль |
| DELETE | `/modules/:moduleId` | author/admin | Архивировать модуль, не удалять физически |
| POST | `/modules/:moduleId/publish` | author/admin | Опубликовать после валидации |
| POST | `/lessons` | teacher/admin | Создать урок |
| PATCH | `/lessons/:lessonId` | author/admin | Изменить урок |
| DELETE | `/lessons/:lessonId` | teacher/admin | Удалить урок вместе с его заданиями |
| POST | `/materials/upload-url` | teacher/admin | Получить signed URL для загрузки файла |
| PUT | `/materials/:materialId/content` | signed token | Загрузить содержимое файла по одноразовой ссылке |
| GET | `/materials/:materialId/content` | owner/admin | Получить загруженный материал |

Контент имеет статусы `draft`, `review`, `published`, `archived`, автора, язык и версию.

## 9. Задания, попытки и обратная связь

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| GET | `/tasks/:taskId` | user | Условие без скрытого правильного ответа |
| POST | `/tasks` | teacher/admin | Создать задание |
| PATCH | `/tasks/:taskId` | author/admin | Изменить задание |
| DELETE | `/tasks/:taskId` | teacher/admin | Удалить задание |
| POST | `/tasks/:taskId/attempts` | student | Начать попытку |
| POST | `/attempts/:attemptId/answers` | owner | Отправить ответ |
| POST | `/attempts/:attemptId/complete` | owner | Завершить попытку |
| GET | `/attempts/:attemptId/result` | owner/teacher | Результат и объяснения |
| GET | `/students/me/attempts` | student | История попыток |

Ответ на отправку задания возвращает `is_correct`, `feedback`, `hint`, `mastery_change`, `next_difficulty` и `knowledge_map_changes`.

## 10. AI-ассистент SANA

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| POST | `/ai/conversations` | student | Создать диалог в контексте темы/задания |
| GET | `/ai/conversations` | student | Последние сохранённые диалоги ученика |
| GET | `/ai/conversations/:conversationId` | owner | История диалога |
| POST | `/ai/conversations/:conversationId/messages` | owner | Задать вопрос; обычный JSON-ответ |
| GET | `/ai/conversations/:conversationId/stream` | owner | SSE-поток ответа для интерфейса |
| POST | `/ai/explanations` | student | Объяснить ошибку в режиме `short`, `steps`, `real_life` |
| POST | `/ai/hints` | student | Подсказка без раскрытия ответа |
| POST | `/ai/feedback/:feedbackId/report` | user | Сообщить о неточном/небезопасном ответе |

Обязательные ограничения:

- контекст ограничен учебной темой и возрастом;
- AI сначала даёт подсказку, а не готовое решение;
- ответы проходят moderation/safety-проверку;
- в БД сохраняются модель, версия prompt, latency и источники;
- при недоступности AI возвращается заранее подготовленное объяснение;
- frontend всегда получает признак `generated_by_ai` и предупреждение о возможной ошибке;
- нельзя передавать AI лишние персональные данные ученика.

## 11. Интервальное повторение

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| GET | `/reviews/due` | student | Темы, которые пора повторить |
| POST | `/reviews/:reviewId/start` | owner | Начать короткое повторение |
| POST | `/reviews/:reviewId/complete` | owner | Записать результат и следующую дату |
| GET | `/students/me/review-calendar` | student | Календарь повторений |

Для MVP допустим объяснимый алгоритм SM-2-подобного типа; его версию хранить в результате.

## 12. Прогресс, цели и достижения

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| GET | `/students/me/progress/summary` | student | Общий прогресс и шаг дня |
| GET | `/students/me/curriculum-state?subject_id=&grade=` | student | Состояние навыков, блокировки и рекомендации для маршрута |
| GET | `/students/me/progress/topics` | student | Освоение тем и динамика |
| GET | `/students/me/weak-skills` | student | Приоритетные пробелы с причинами |
| GET | `/students/me/goals` | student | Учебные цели и дедлайны |
| POST | `/students/me/goals` | student | Создать цель |
| PATCH | `/goals/:goalId` | owner | Изменить цель |
| DELETE | `/goals/:goalId` | owner | Архивировать цель |
| GET | `/students/me/achievements` | student | Достижения и устойчивые навыки |
| GET | `/students/me/streak` | student | Серия полезных учебных действий |

Серия не должна поощрять бессмысленный вход: засчитывать только завершённый шаг, повторение или измеримый прогресс.

## 13. Классы и кабинет учителя

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| GET | `/teachers/me/dashboard` | teacher | Сводка групп, риски и последние события |
| GET | `/teachers/me/classes` | teacher | Список классов/групп |
| POST | `/classes` | teacher/admin | Создать группу и код приглашения |
| GET | `/classes/:classId` | linked teacher/admin | Карточка класса |
| PATCH | `/classes/:classId` | owner/admin | Изменить группу |
| POST | `/classes/:classId/join` | student | Вступить по коду |
| POST | `/classes/join` | student | Вступить в класс только по коду подключения |
| DELETE | `/classes/:classId/students/:studentId` | owner/admin | Удалить связь с группой |
| GET | `/classes/:classId/students` | linked teacher | Ученики и краткий прогресс |
| GET | `/classes/:classId/analytics` | linked teacher | Тепловая карта навыков класса |
| GET | `/classes/:classId/weak-skills` | linked teacher | Общие затруднения и группы риска |
| GET | `/teachers/students/:studentId/progress` | linked teacher | Детальный прогресс ученика |
| POST | `/teachers/students/:studentId/comments` | linked teacher | Сохранить комментарий ученику |

Учитель видит только учеников своих групп. Доступ к персональным данным проверяется на каждом запросе, а не только в UI.

## 14. Назначения учителя

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| POST | `/assignments` | teacher | Назначить модуль/задания группе или ученикам |
| GET | `/assignments` | teacher | Назначения с фильтрами |
| GET | `/assignments/:assignmentId` | linked user | Детали и результаты |
| PATCH | `/assignments/:assignmentId` | owner | Изменить дедлайн/состав до публикации |
| POST | `/assignments/:assignmentId/publish` | owner | Опубликовать назначение |
| GET | `/students/me/assignments` | student | Текущие и завершённые назначения |

## 15. Уведомления

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| GET | `/notifications` | user | Список уведомлений |
| GET | `/notifications/unread-count` | user | Счётчик непрочитанных |
| PATCH | `/notifications/:notificationId/read` | owner | Отметить прочитанным |
| POST | `/notifications/read-all` | user | Прочитать все |
| GET | `/notification-preferences` | user | Каналы и тихие часы |
| PATCH | `/notification-preferences` | user | Настроить напоминания |

## 16. Администрирование

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| GET | `/admin/users` | admin | Поиск и управление пользователями |
| PATCH | `/admin/users/:userId/status` | admin | Блокировка/восстановление |
| GET | `/admin/pathnet/metrics` | admin | Метрики shadow-сравнения PathNet и deterministic planner |
| GET | `/admin/content/review` | admin | Очередь модерации контента |
| POST | `/admin/content/:contentId/approve` | admin | Одобрить публикацию |
| POST | `/admin/content/:contentId/reject` | admin | Вернуть с причиной |
| GET | `/admin/ai/reports` | admin | Жалобы на AI-ответы |
| PATCH | `/admin/ai/reports/:reportId` | admin | Обработать жалобу |
| GET | `/admin/audit-log` | admin | Журнал критических действий |

## 17. Аналитические события

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| POST | `/events/batch` | user | Пакет разрешённых продуктовых событий |

Минимальные события: `onboarding_completed`, `diagnostic_started`, `diagnostic_completed`, `recommendation_opened`, `recommendation_reason_viewed`, `lesson_completed`, `answer_submitted`, `explanation_mode_changed`, `review_completed`, `goal_created`.

Не отправлять в аналитику текст свободных AI-диалогов и персональные ответы без отдельного согласия.

## 18. Основные модели данных

- `User`: id, role, name, locale, region, timezone, consent flags, status.
- `StudentProfile`: user_id, grade, subject_ids, goal_ids, accessibility settings.
- `TeacherProfile`: user_id, school, subject_ids.
- `Classroom`: id, teacher_id, name, invite_code, student links.
- `Subject`, `Topic`, `Skill`, `PrerequisiteEdge`.
- `Diagnostic`, `DiagnosticQuestion`, `DiagnosticAnswer`, `DiagnosticResult`.
- `KnowledgeState`: student_id, skill_id, mastery, confidence, last_seen_at, next_review_at.
- `LearningPath`, `LearningStep`, `RecommendationReason`.
- `Module`, `Lesson`, `Task`, `TaskVersion`.
- `Attempt`, `Answer`, `Feedback`.
- `Goal`, `Assignment`, `Achievement`, `Notification`.
- `AIConversation`, `AIMessage`, `AITrace`, `AIReport`.
- `AuditLog`.

## 19. События домена

Backend полезно разделить на модули, но для хакатона развернуть единым модульным приложением. Границы модулей могут общаться событиями:

- `diagnostic.completed` → обновить карту и построить маршрут;
- `attempt.completed` → пересчитать mastery и сложность;
- `knowledge.mastery_changed` → обновить карту, достижения и учительскую аналитику;
- `review.scheduled` → создать напоминание;
- `assignment.published` → уведомить учеников;
- `ai.feedback_reported` → создать запись модерации.

## 20. Приоритет реализации

### P0 — обязательный вертикальный срез

`health`, auth, профиль ученика, справочники, диагностика, результат, learning path, модули, попытка задания, серверное объяснение, прогресс, классы и teacher dashboard.

### P1 — усиливает демо

Карта знаний, интервальное повторение, двуязычность, достижения, уведомления, создание контента учителем.

### P2 — после хакатона

Полная админ-панель, загрузка файлов, расширенная модерация, несколько школ, push/SMS, offline sync и внешние интеграции.

## 21. Минимальные нефункциональные требования

- OpenAPI/Swagger генерируется из кода и доступен только в dev/staging.
- Валидация всех входных DTO и ограничение длины свободного текста.
- Rate limit отдельно для auth и AI-маршрутов.
- Пароли — Argon2id или bcrypt с безопасными параметрами.
- CORS только для известных frontend origin.
- Централизованные логи с `request_id`, без токенов и учебных ответов.
- Индексы по `user_id`, `student_id`, `class_id`, `subject_id`, `next_review_at`.
- Seed-данные для одного предмета, 2–3 тем, ученика, учителя и класса.
- Тесты критического пути: диагностика → маршрут → попытка → прогресс → кабинет учителя.
- timeout и retry для серверного учебного движка и внешнего AI-провайдера при его подключении.
