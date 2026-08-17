import itertools

import pytest

torch = pytest.importorskip("torch")

from ml.features import FEATURE_NAMES, FEATURE_SCHEMA_VERSION
from ml.pathnet import PathNet, parameter_count
from ml.simulator import DATASET_VERSION, simulation_rows


def test_simulator_is_seeded_and_matches_feature_schema():
    first = list(itertools.islice(simulation_rows(2, seed=77), 20))
    second = list(itertools.islice(simulation_rows(2, seed=77), 20))
    assert first == second
    assert len(first[0]["features"]) == len(FEATURE_NAMES)
    assert {row["selected"] for row in first}.issubset({0.0, 1.0})
    assert all(row["dataset_version"] == DATASET_VERSION for row in first)
    assert all(row["feature_schema_version"] == FEATURE_SCHEMA_VERSION for row in first)


def test_simulated_outcomes_are_non_trivial_and_respect_blockers():
    rows = list(simulation_rows(60, seed=91))
    selection_rate = sum(row["selected"] for row in rows) / len(rows)
    completion_rate = sum(
        row["simulated_outcome"]["completed"] for row in rows
    ) / len(rows)
    gains = {row["simulated_outcome"]["realized_mastery_gain"] for row in rows}
    assert 0.02 < selection_rate < 0.45
    assert 0.05 < completion_rate < 0.95
    assert len(gains) > 20
    assert all(row["selected"] == 0 for row in rows if row["is_blocked"])


def test_pathnet_is_compact_and_has_two_outputs():
    model = PathNet()
    batch = torch.zeros((4, len(FEATURE_NAMES)), dtype=torch.float32)
    output = model(batch)
    assert output["selection_logits"].shape == (4,)
    assert output["priority"].shape == (4,)
    assert torch.all((0 <= output["priority"]) & (output["priority"] <= 1))
    assert parameter_count(model) < 10_000
