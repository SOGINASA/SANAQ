import argparse
import gzip
import json
import random
import sys
import time
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader, Subset, TensorDataset

from ml.features import FEATURE_NAMES, FEATURE_SCHEMA_VERSION
from ml.pathnet import PathNet, parameter_count


class _ConsoleProgress:
    """Dependency-free progress fallback for minimal training environments."""

    def __init__(self, total):
        self.total = max(total, 1)
        self.current = 0
        self.started_at = time.monotonic()
        self.details = {}

    def set_postfix(self, **details):
        self.details = details

    def update(self):
        self.current += 1
        elapsed = max(time.monotonic() - self.started_at, 1e-6)
        remaining = max(self.total - self.current, 0)
        eta = remaining / max(self.current / elapsed, 1e-6)
        fraction = min(self.current / self.total, 1.0)
        filled = round(fraction * 24)
        bar = "█" * filled + "░" * (24 - filled)
        details = " ".join(f"{key}={value}" for key, value in self.details.items())
        print(
            f"\rPathNet [{bar}] {fraction:6.1%} ETA {eta:6.1f}s {details}",
            end="",
            file=sys.stderr,
            flush=True,
        )

    def write(self, message):
        print(f"\n{message}", file=sys.stderr, flush=True)

    def close(self):
        print(file=sys.stderr, flush=True)


def load_dataset(path):
    features, selected, priority, student_keys = [], [], [], []
    student_indexes = {}
    dataset_versions = set()
    path = Path(path)
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as source:
        for line_number, line in enumerate(source, 1):
            row = json.loads(line)
            schema_matches = (
                row.get("feature_schema_version") == FEATURE_SCHEMA_VERSION
                or row.get("feature_schema") == FEATURE_NAMES
            )
            if not schema_matches:
                raise ValueError(f"feature schema mismatch at line {line_number}")
            if len(row["features"]) != len(FEATURE_NAMES):
                raise ValueError(f"feature count mismatch at line {line_number}")
            features.append(row["features"])
            selected.append(row["selected"])
            priority.append(row["priority"])
            dataset_versions.add(row.get("dataset_version", "legacy-v1"))
            student_id = row.get("student_id")
            if not isinstance(student_id, str) or not student_id:
                raise ValueError(f"student_id is required at line {line_number}")
            student_indexes.setdefault(student_id, len(student_indexes))
            student_keys.append(student_indexes[student_id])
    if len(features) < 10:
        raise ValueError("dataset must contain at least 10 rows")
    if len(student_indexes) < 2:
        raise ValueError("dataset must contain at least two students")
    if len(dataset_versions) != 1:
        raise ValueError("dataset must contain exactly one dataset_version")
    dataset = TensorDataset(
        torch.tensor(features, dtype=torch.float32),
        torch.tensor(selected, dtype=torch.float32),
        torch.tensor(priority, dtype=torch.float32),
        torch.tensor(student_keys, dtype=torch.int64),
    )
    dataset.dataset_version = dataset_versions.pop()
    return dataset


def train(
    dataset,
    epochs=12,
    batch_size=128,
    learning_rate=1e-3,
    seed=42,
    progress=False,
):
    if epochs < 1:
        raise ValueError("epochs must be at least 1")
    if batch_size < 1:
        raise ValueError("batch_size must be at least 1")
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

    progress_bar = None
    if progress:
        total_batches = epochs * (len(train_loader) + len(validation_loader))
        try:
            from tqdm.auto import tqdm

            progress_bar = tqdm(
                total=total_batches,
                desc="PathNet",
                unit="batch",
                dynamic_ncols=True,
            )
        except ModuleNotFoundError:
            progress_bar = _ConsoleProgress(total_batches)

    history = []
    final_counts = None
    try:
        for epoch in range(1, epochs + 1):
            model.train()
            epoch_loss = 0.0
            epoch_rows = 0
            for features, selected, priority, _student_id in train_loader:
                output = model(features)
                loss = selection_loss(output["selection_logits"], selected)
                loss = loss + 0.35 * priority_loss(output["priority"], priority)
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                epoch_loss += float(loss.detach()) * len(features)
                epoch_rows += len(features)
                if progress_bar:
                    progress_bar.set_postfix(
                        epoch=f"{epoch}/{epochs}",
                        phase="train",
                        loss=f"{epoch_loss / epoch_rows:.4f}",
                    )
                    progress_bar.update()

            model.eval()
            correct = count = true_positive = false_positive = false_negative = 0
            absolute_error = 0.0
            validation_loss = 0.0
            with torch.no_grad():
                for features, selected, priority, _student_id in validation_loader:
                    output = model(features)
                    batch_loss = selection_loss(output["selection_logits"], selected)
                    batch_loss = batch_loss + 0.35 * priority_loss(output["priority"], priority)
                    predicted = (torch.sigmoid(output["selection_logits"]) >= 0.5).float()
                    correct += int((predicted == selected).sum())
                    true_positive += int(((predicted == 1) & (selected == 1)).sum())
                    false_positive += int(((predicted == 1) & (selected == 0)).sum())
                    false_negative += int(((predicted == 0) & (selected == 1)).sum())
                    count += len(features)
                    absolute_error += float((output["priority"] - priority).abs().sum())
                    validation_loss += float(batch_loss) * len(features)
                    if progress_bar:
                        progress_bar.set_postfix(epoch=f"{epoch}/{epochs}", phase="validation")
                        progress_bar.update()
            precision_epoch = true_positive / max(true_positive + false_positive, 1)
            recall_epoch = true_positive / max(true_positive + false_negative, 1)
            epoch_metrics = {
                "epoch": epoch,
                "train_loss": round(epoch_loss / max(epoch_rows, 1), 6),
                "validation_loss": round(validation_loss / max(count, 1), 6),
                "validation_accuracy": round(correct / max(count, 1), 4),
                "validation_precision": round(precision_epoch, 4),
                "validation_recall": round(recall_epoch, 4),
                "validation_f1": round(
                    2 * precision_epoch * recall_epoch
                    / max(precision_epoch + recall_epoch, 1e-9),
                    4,
                ),
                "validation_priority_mae": round(absolute_error / max(count, 1), 4),
            }
            history.append(epoch_metrics)
            if progress_bar:
                progress_bar.write(
                    f"Epoch {epoch}/{epochs}: "
                    f"loss={epoch_metrics['train_loss']:.4f}, "
                    f"val_loss={epoch_metrics['validation_loss']:.4f}, "
                    f"F1={epoch_metrics['validation_f1']:.4f}, "
                    f"MAE={epoch_metrics['validation_priority_mae']:.4f}"
                )
            final_counts = (
                correct, count, true_positive, false_positive, false_negative, absolute_error
            )
    finally:
        if progress_bar:
            progress_bar.close()

    correct, count, true_positive, false_positive, false_negative, absolute_error = final_counts
    precision = true_positive / max(true_positive + false_positive, 1)
    recall = true_positive / max(true_positive + false_negative, 1)
    selection_rate = float(dataset.tensors[1].mean())
    metrics = {
        "validation_accuracy": round(correct / max(count, 1), 4),
        "validation_precision": round(precision, 4),
        "validation_recall": round(recall, 4),
        "validation_f1": round(2 * precision * recall / max(precision + recall, 1e-9), 4),
        "validation_priority_mae": round(absolute_error / max(count, 1), 4),
        "validation_confusion_matrix": [
            [count - true_positive - false_positive - false_negative, false_positive],
            [false_negative, true_positive],
        ],
        "selection_rate": round(selection_rate, 4),
        "majority_baseline_accuracy": round(max(selection_rate, 1 - selection_rate), 4),
        "training_rows": len(train_set), "validation_rows": len(validation_set),
        "training_students": len(student_ids) - validation_student_count,
        "validation_students": validation_student_count,
        "parameters": parameter_count(model),
        "history": history,
    }
    return model, metrics


def main():
    parser = argparse.ArgumentParser(description="Train compact PathNet")
    parser.add_argument("--dataset", default="ml/artifacts/simulated_students.jsonl")
    parser.add_argument("--output", default="ml/artifacts/pathnet-v1.pt")
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--batch-size", type=int, default=128)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--model-version", default="pathnet-v2-synthetic-outcomes")
    parser.add_argument("--progress", action="store_true")
    args = parser.parse_args()
    dataset = load_dataset(args.dataset)
    model, metrics = train(
        dataset,
        args.epochs,
        args.batch_size,
        seed=args.seed,
        progress=args.progress,
    )
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    torch.save({
        "model_state_dict": model.state_dict(),
        "feature_names": FEATURE_NAMES,
        "model_version": args.model_version,
        "dataset_version": dataset.dataset_version,
        "metrics": metrics,
    }, output)
    print(json.dumps({"model": str(output), **metrics}, ensure_ascii=False))


if __name__ == "__main__":
    main()
