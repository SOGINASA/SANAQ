# PathNet v1

PathNet — компактная модель ранжирования допустимых шагов учебного маршрута.
Она не заменяет граф prerequisites и deterministic planner: сеть оценивает
вероятность выбора и приоритет навыка, после чего planner применяет жёсткие
ограничения порядка, времени и повторений.

## Установка

Веб-приложению PyTorch не требуется. ML-зависимости ставятся только в среде
обучения:

```bash
python3 -m venv .venv-ml
source .venv-ml/bin/activate
pip install -r requirements-ml.txt
```

## Интерактивное обучение в Jupyter

Готовый notebook находится в
`notebooks/pathnet_training_v2.ipynb`. Он разбит на независимые шаги: создание
датасета, разведочный анализ, обучение, графики по эпохам, confusion matrix,
сравнение с majority baseline, сохранение checkpoint и пробный inference.

Из каталога `backend/` его можно открыть так:

```bash
source .venv-ml/bin/activate
python -m jupyter lab notebooks/pathnet_training_v2.ipynb
```

В VS Code достаточно открыть `.ipynb` и выбрать интерпретатор
`backend/.venv-ml/bin/python` через `Select Kernel`. Параметры эксперимента
собраны в одной верхней ячейке. Notebook по умолчанию пишет отдельный checkpoint
`pathnet-v2-outcomes-notebook.pt`, поэтому не перезаписывает checkpoint,
используемый backend.

## Outcome-oriented synthetic dataset v2

```bash
python -m ml.simulator \
  --students 10000 \
  --seed 20260817 \
  --output ml/artifacts/synthetic-outcomes-v2-10k.jsonl.gz
```

Один и тот же seed создаёт идентичные строки. Для каждого состояния симулируются
вероятность завершения, ожидаемый и реализованный прирост mastery, соответствие
сложности, ограничение времени и срочность. Заблокированный графом навык не может
получить положительную selection-метку. Синтетические данные нужны для проверки
pipeline и предварительного обучения; они не являются доказательством качества
модели на реальных учениках.

## Обучение

```bash
python -m ml.train_pathnet \
  --dataset ml/artifacts/synthetic-outcomes-v2-10k.jsonl.gz \
  --output ml/artifacts/pathnet-v2-outcomes.pt \
  --epochs 12 \
  --batch-size 1024 \
  --seed 20260817 \
  --model-version pathnet-v2-synthetic-outcomes \
  --progress
```

Флаг `--progress` показывает обработанные batch, текущую эпоху, фазу, loss,
скорость и примерное оставшееся время. В Jupyter он включён по умолчанию;
после каждой эпохи notebook также печатает validation loss, F1 и MAE.

Checkpoint содержит `state_dict`, версию модели, точный список признаков,
итоговые validation-метрики и историю метрик по эпохам. Перед
production-включением модель должна сравниваться с
`deterministic-planner-v1` на holdout из реальных обезличенных событий.
Train/validation делятся по ученикам целиком, поэтому навыки одного ученика не
могут одновременно попасть в обе выборки.

## Выходы модели

- `selection_logits` — стоит ли навык включать в ближайший маршрут;
- `priority` — относительный приоритет в диапазоне 0..1.

Финальное решение всегда принимает planner: заблокированный навык нельзя
поставить раньше его основы даже при высоком прогнозе PathNet.

## Режимы PathNet

После обучения положите checkpoint по пути из `PATHNET_MODEL_PATH` и включите:

```env
PATHNET_MODE=shadow
PATHNET_MODEL_PATH=ml/artifacts/pathnet-v2-outcomes-notebook.pt
PATHNET_TOP_K=20
PATHNET_CANARY_PERCENT=0
```

В этом режиме пользователь по-прежнему получает результат
`deterministic-planner-v1`. PathNet только рассчитывает параллельное ранжирование,
а backend сохраняет overlap@k, latency, версию модели и безопасные коды ошибок.
Если checkpoint отсутствует, повреждён или PyTorch не установлен, запрос плана
продолжает работать через deterministic fallback.

После проверки shadow-метрик можно включить `canary` и постепенно увеличить
`PATHNET_CANARY_PERCENT`, затем перейти в `active`. В этих режимах API всегда
возвращает `ranking.applied`, `model_version`, `fallback_used` и при ошибке
`failure_code`; prerequisite-граф остаётся обязательным ограничением planner.

Текущую сводку видит администратор:

```http
GET /api/v1/admin/pathnet/metrics
```

Автоматическая проверка порогов перед любым будущим включением модели:

```bash
python -m ml.evaluate_shadow \
  --model-version pathnet-v2-synthetic-outcomes \
  --minimum-samples 1000 \
  --minimum-overlap 0.65 \
  --maximum-failure-rate 0.01 \
  --maximum-latency-ms 100
```

Команда завершается ненулевым exit code, пока хотя бы один критерий не выполнен.
Режим, в котором PathNet самостоятельно меняет маршрут, в v1 намеренно не
реализован.

## Offline holdout на 1000 маршрутов

Массовую техническую проверку запускайте на seed, который не использовался для
обучающего датасета:

```bash
python -m ml.benchmark_pathnet \
  --model ml/artifacts/pathnet-v2-outcomes-notebook.pt \
  --plans 1000 \
  --seed 20260818 \
  --output ml/artifacts/pathnet-v2-holdout-1000-report.json
```

Benchmark не пишет синтетические результаты в рабочую БД shadow-событий. Он
считает overlap с deterministic planner, p50/p95/p99 latency, F1 выбора навыков
и MAE полезности на независимых симулированных состояниях.
