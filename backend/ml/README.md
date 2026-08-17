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

## Синтетический baseline

```bash
python -m ml.simulator \
  --students 10000 \
  --seed 42 \
  --output ml/artifacts/simulated_students.jsonl
```

Один и тот же seed создаёт идентичный набор. Синтетические данные нужны для
проверки pipeline и предварительного обучения; они не являются доказательством
качества модели на реальных учениках.

## Обучение

```bash
python -m ml.train_pathnet \
  --dataset ml/artifacts/simulated_students.jsonl \
  --output ml/artifacts/pathnet-v1.pt \
  --epochs 12 \
  --batch-size 128 \
  --seed 42
```

Checkpoint содержит только `state_dict`, версию модели, точный список признаков
и validation-метрики. Перед production-включением модель должна сравниваться с
`deterministic-planner-v1` на holdout из реальных обезличенных событий.
Train/validation делятся по ученикам целиком, поэтому навыки одного ученика не
могут одновременно попасть в обе выборки.

## Выходы модели

- `selection_logits` — стоит ли навык включать в ближайший маршрут;
- `priority` — относительный приоритет в диапазоне 0..1.

Финальное решение всегда принимает planner: заблокированный навык нельзя
поставить раньше его основы даже при высоком прогнозе PathNet.
