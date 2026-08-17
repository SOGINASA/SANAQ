import argparse
import json
import random
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader, Subset, TensorDataset

from ml.features import FEATURE_NAMES
from ml.pathnet import PathNet, parameter_count


def load_dataset(path):
    features, selected, priority, student_keys = [], [], [], []
    student_indexes = {}
    with Path(path).open(encoding="utf-8") as source:
        for line_number, line in enumerate(source, 1):
            row = json.loads(line)
            if row.get("feature_schema") != FEATURE_NAMES:
                raise ValueError(f"feature schema mismatch at line {line_number}")
            if len(row["features"]) != len(FEATURE_NAMES):
                raise ValueError(f"feature count mismatch at line {line_number}")
            features.append(row["features"])
            selected.append(row["selected"])
            priority.append(row["priority"])
            student_id = row.get("student_id")
            if not isinstance(student_id, str) or not student_id:
                raise ValueError(f"student_id is required at line {line_number}")
            student_indexes.setdefault(student_id, len(student_indexes))
            student_keys.append(student_indexes[student_id])
    if len(features) < 10:
        raise ValueError("dataset must contain at least 10 rows")
    if len(student_indexes) < 2:
        raise ValueError("dataset must contain at least two students")
    return TensorDataset(
        torch.tensor(features, dtype=torch.float32),
        torch.tensor(selected, dtype=torch.float32),
        torch.tensor(priority, dtype=torch.float32),
        torch.tensor(student_keys, dtype=torch.int64),
    )


def train(dataset, epochs=12, batch_size=128, learning_rate=1e-3, seed=42):
    random.seed(seed)
    torch.manual_seed(seed)
    generator = torch.Generator().manual_seed(seed)
    student_ids = sorted(set(dataset.tensors[3].tolist()))
    random.Random(seed).shuffle(student_ids)
    validation_student_count = max(1, int(len(student_ids) * 0.15))
    validation_student_ids = set(student_ids[:validation_student_count])
    validation_indexes = [
        index for index, student_id in enumerate(dataset.tensors[3].tolist())
        if student_id in validation_student_ids
    ]
    train_indexes = [
        index for index, student_id in enumerate(dataset.tensors[3].tolist())
        if student_id not in validation_student_ids
    ]
    train_set = Subset(dataset, train_indexes)
    validation_set = Subset(dataset, validation_indexes)
    train_loader = DataLoader(train_set, batch_size=batch_size, shuffle=True, generator=generator)
    validation_loader = DataLoader(validation_set, batch_size=batch_size)
    model = PathNet()
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=1e-4)
    positives = float(dataset.tensors[1].sum())
    negatives = len(dataset) - positives
    positive_weight = torch.tensor([max(1.0, negatives / max(positives, 1.0))])
    selection_loss = nn.BCEWithLogitsLoss(pos_weight=positive_weight)
    priority_loss = nn.SmoothL1Loss()

    for _ in range(epochs):
        model.train()
        for features, selected, priority, _student_id in train_loader:
            output = model(features)
            loss = selection_loss(output["selection_logits"], selected)
            loss = loss + 0.35 * priority_loss(output["priority"], priority)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

    model.eval()
    correct = count = 0
    absolute_error = 0.0
    with torch.no_grad():
        for features, selected, priority, _student_id in validation_loader:
            output = model(features)
            predicted = (torch.sigmoid(output["selection_logits"]) >= 0.5).float()
            correct += int((predicted == selected).sum())
            count += len(features)
            absolute_error += float((output["priority"] - priority).abs().sum())
    metrics = {
        "validation_accuracy": round(correct / max(count, 1), 4),
        "validation_priority_mae": round(absolute_error / max(count, 1), 4),
        "training_rows": len(train_set), "validation_rows": len(validation_set),
        "training_students": len(student_ids) - validation_student_count,
        "validation_students": validation_student_count,
        "parameters": parameter_count(model),
    }
    return model, metrics


def main():
    parser = argparse.ArgumentParser(description="Train compact PathNet")
    parser.add_argument("--dataset", default="ml/artifacts/simulated_students.jsonl")
    parser.add_argument("--output", default="ml/artifacts/pathnet-v1.pt")
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--batch-size", type=int, default=128)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    dataset = load_dataset(args.dataset)
    model, metrics = train(dataset, args.epochs, args.batch_size, seed=args.seed)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    torch.save({
        "model_state_dict": model.state_dict(),
        "feature_names": FEATURE_NAMES,
        "model_version": "pathnet-v1",
        "metrics": metrics,
    }, output)
    print(json.dumps({"model": str(output), **metrics}, ensure_ascii=False))


if __name__ == "__main__":
    main()
