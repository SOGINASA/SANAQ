try:
    import torch
    from torch import nn
except ImportError as error:  # pragma: no cover - exercised only without ML extras
    raise RuntimeError("PathNet requires dependencies from requirements-ml.txt") from error

from ml.features import FEATURE_NAMES


class PathNet(nn.Module):
    def __init__(self, input_size=len(FEATURE_NAMES), hidden_size=48, dropout=0.05):
        super().__init__()
        self.backbone = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.LayerNorm(hidden_size),
            nn.SiLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size, hidden_size // 2),
            nn.SiLU(),
        )
        self.selection_head = nn.Linear(hidden_size // 2, 1)
        self.priority_head = nn.Sequential(
            nn.Linear(hidden_size // 2, 1),
            nn.Sigmoid(),
        )

    def forward(self, features):
        representation = self.backbone(features)
        return {
            "selection_logits": self.selection_head(representation).squeeze(-1),
            "priority": self.priority_head(representation).squeeze(-1),
        }


def parameter_count(model):
    return sum(parameter.numel() for parameter in model.parameters())
