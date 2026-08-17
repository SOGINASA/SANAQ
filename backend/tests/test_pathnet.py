import itertools

import pytest

torch = pytest.importorskip("torch")

from ml.features import FEATURE_NAMES
from ml.pathnet import PathNet, parameter_count
from ml.simulator import simulation_rows


def test_simulator_is_seeded_and_matches_feature_schema():
    first = list(itertools.islice(simulation_rows(2, seed=77), 20))
    second = list(itertools.islice(simulation_rows(2, seed=77), 20))
    assert first == second
    assert len(first[0]["features"]) == len(FEATURE_NAMES)
    assert {row["selected"] for row in first}.issubset({0.0, 1.0})


def test_pathnet_is_compact_and_has_two_outputs():
    model = PathNet()
    batch = torch.zeros((4, len(FEATURE_NAMES)), dtype=torch.float32)
    output = model(batch)
    assert output["selection_logits"].shape == (4,)
    assert output["priority"].shape == (4,)
    assert torch.all((0 <= output["priority"]) & (output["priority"] <= 1))
    assert parameter_count(model) < 10_000
