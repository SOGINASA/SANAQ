# SANAQ

AI-платформа персонального обучения для школьников 7–12 классов Казахстана. Проект создаётся для трека Social Impact на Future Minds Hackathon 2026.

## Идея

SANAQ выявляет пробелы ученика, показывает их на «живом созвездии знаний» и строит объяснимый маршрут до учебной цели. AI-спутник SANA помогает разобрать ошибку в нескольких форматах и возвращает к теме до того, как знание забудется.

Подробности: [продуктовая концепция](docs/PRODUCT_CONCEPT.md).

## Структура

```text
SANAQ/
├── ТЗ/                         исходные материалы хакатона
├── docs/                       продуктовые документы
├── frontend/                   Create React App + Tailwind + Zustand
│   ├── public/
│   └── src/
│       ├── app/                провайдеры и роутинг
│       ├── assets/             изображения, иконки, шрифты
│       ├── components/         layout, navigation, feedback
│       ├── entities/           сущности предметной области
│       ├── features/           независимые возможности продукта
│       ├── pages/              URL-страницы
│       ├── shared/             общая инфраструктура и UI-kit
│       └── widgets/            крупные блоки экранов
└── backend/
    └── API_ROUTES.md           контракт API для backend-команды
```

## Локальный запуск frontend

```bash
cd frontend
npm install
npm start
```

Production-сборка:

```bash
cd frontend
npm run build
```

## Текущее состояние

- frontend создан официальным Create React App, без Vite;
- Tailwind CSS и Zustand установлены;
- создан модульный файловый каркас;
- UI-файлы намеренно оставлены пустыми до следующего этапа реализации;
- backend-код не создавался; для backend-команды подготовлен API-контракт.
