export const subjects = [
  { id: 'math', name: 'Математика', icon: 'Calculator', color: 'lavender' },
  { id: 'physics', name: 'Физика', icon: 'Atom', color: 'mint' },
  { id: 'chemistry', name: 'Химия', icon: 'FlaskConical', color: 'coral' },
  { id: 'history', name: 'История Казахстана', icon: 'Landmark', color: 'lime' },
];

export const diagnosticQuestions = [
  {
    id: 1,
    skill: 'Разложение на множители',
    question: 'Разложите выражение x² − 9 на множители.',
    answers: ['(x − 3)(x + 3)', '(x − 9)(x + 1)', '(x − 3)²', 'x(x − 9)'],
    correct: 0,
    explanation: 'Это разность квадратов: a² − b² = (a − b)(a + b). Здесь a = x, b = 3.',
  },
  {
    id: 2,
    skill: 'Линейные уравнения',
    question: 'Найдите x: 3x + 7 = 22.',
    answers: ['3', '5', '7', '15'],
    correct: 1,
    explanation: 'Вычитаем 7 из обеих частей: 3x = 15. Делим на 3 и получаем x = 5.',
  },
  {
    id: 3,
    skill: 'Квадратные уравнения',
    question: 'Сколько корней имеет уравнение x² + 4x + 4 = 0?',
    answers: ['Ни одного', 'Один', 'Два', 'Бесконечно много'],
    correct: 1,
    explanation: 'Дискриминант равен нулю, поэтому у уравнения один корень: x = −2.',
  },
  {
    id: 4,
    skill: 'Функции',
    question: 'Чему равно значение y = 2x − 1 при x = 4?',
    answers: ['6', '7', '8', '9'],
    correct: 1,
    explanation: 'Подставляем x = 4: y = 2 × 4 − 1 = 7.',
  },
];

export const learningModules = [
  {
    id: 'factorization',
    title: 'Разложение на множители',
    description: 'Закрой базовый пробел перед квадратными уравнениями.',
    progress: 68,
    duration: '18 мин',
    lessons: 4,
    status: 'active',
  },
  {
    id: 'quadratics',
    title: 'Квадратные уравнения',
    description: 'Дискриминант, корни и проверка решений.',
    progress: 34,
    duration: '25 мин',
    lessons: 5,
    status: 'available',
  },
  {
    id: 'functions',
    title: 'Графики функций',
    description: 'Читай графики и находи зависимости между величинами.',
    progress: 0,
    duration: '22 мин',
    lessons: 4,
    status: 'locked',
  },
];

export const knowledgeNodes = [
  { id: 1, title: 'Линейные уравнения', mastery: 92, status: 'mastered', x: 8, y: 12 },
  { id: 2, title: 'Формулы сокращённого умножения', mastery: 76, status: 'mastered', x: 48, y: 8 },
  { id: 3, title: 'Разложение на множители', mastery: 58, status: 'learning', x: 26, y: 38 },
  { id: 4, title: 'Квадратные уравнения', mastery: 32, status: 'learning', x: 61, y: 43 },
  { id: 5, title: 'Графики функций', mastery: 0, status: 'locked', x: 12, y: 70 },
  { id: 6, title: 'Системы уравнений', mastery: 0, status: 'locked', x: 68, y: 72 },
];

export const weeklyProgress = [45, 68, 36, 82, 58, 94, 72];

export const students = [
  { id: 1, name: 'Айару С.', progress: 78, streak: 12, risk: 'stable', focus: 'Квадратные уравнения' },
  { id: 2, name: 'Данияр М.', progress: 64, streak: 5, risk: 'attention', focus: 'Дроби' },
  { id: 3, name: 'Алина К.', progress: 86, streak: 18, risk: 'stable', focus: 'Функции' },
  { id: 4, name: 'Арсен Т.', progress: 42, streak: 2, risk: 'risk', focus: 'Линейные уравнения' },
  { id: 5, name: 'Малика Н.', progress: 73, streak: 9, risk: 'stable', focus: 'Разложение на множители' },
];
