from routes.admin import admin_bp
from routes.ai import ai_bp
from routes.attempts import attempts_bp
from routes.auth import auth_bp
from routes.catalog import catalog_bp
from routes.content import content_bp
from routes.governance import governance_bp
from routes.diagnostics import diagnostics_bp
from routes.learning_paths import learning_paths_bp
from routes.profiles import profiles_bp
from routes.passkeys import passkeys_bp
from routes.progress import progress_bp
from routes.system import system_bp
from routes.teacher import teacher_bp
from routes.engagement import engagement_bp
from routes.billing import billing_bp


__all__ = [
    "admin_bp", "ai_bp", "attempts_bp", "auth_bp", "catalog_bp", "content_bp",
    "governance_bp", "diagnostics_bp", "learning_paths_bp", "profiles_bp", "progress_bp",
    "system_bp", "teacher_bp", "engagement_bp", "passkeys_bp", "billing_bp",
]
