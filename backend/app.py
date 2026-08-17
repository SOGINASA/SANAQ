import os
import uuid

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from flask import Flask, g, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_jwt_extended.exceptions import JWTExtendedException
from flask_migrate import Migrate
from werkzeug.exceptions import HTTPException

from config import DATABASE_DIR, get_config
from models import User, db
from utils.responses import api_error


migrate = Migrate()
jwt = JWTManager()


def create_app(config_object=None):
    app = Flask(__name__)
    app.config.from_object(config_object or get_config())

    DATABASE_DIR.mkdir(parents=True, exist_ok=True)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(
        app,
        origins=app.config["CORS_ORIGINS"],
        supports_credentials=True,
        allow_headers=[
            "Accept",
            "Accept-Language",
            "Authorization",
            "Content-Type",
            "X-CSRF-TOKEN",
            "X-Request-ID",
        ],
        expose_headers=["X-Request-ID", "X-Data-Mode"],
    )

    @app.before_request
    def assign_request_id():
        g.request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

    @app.after_request
    def include_request_id(response):
        response.headers["X-Request-ID"] = getattr(g, "request_id", "")
        response.headers["X-Data-Mode"] = app.config["DATA_MODE"]
        return response

    from routes import (
        admin_bp,
        ai_bp,
        attempts_bp,
        auth_bp,
        catalog_bp,
        content_bp,
        contract_bp,
        diagnostics_bp,
        learning_paths_bp,
        profiles_bp,
        progress_bp,
        system_bp,
    )

    prefix = app.config["API_PREFIX"]
    app.register_blueprint(system_bp, url_prefix=prefix)
    app.register_blueprint(auth_bp, url_prefix=f"{prefix}/auth")
    app.register_blueprint(admin_bp, url_prefix=f"{prefix}/admin")
    app.register_blueprint(profiles_bp, url_prefix=prefix)
    app.register_blueprint(catalog_bp, url_prefix=prefix)
    app.register_blueprint(diagnostics_bp, url_prefix=prefix)
    app.register_blueprint(learning_paths_bp, url_prefix=prefix)
    app.register_blueprint(content_bp, url_prefix=prefix)
    app.register_blueprint(attempts_bp, url_prefix=prefix)
    app.register_blueprint(ai_bp, url_prefix=prefix)
    app.register_blueprint(progress_bp, url_prefix=prefix)
    app.register_blueprint(contract_bp, url_prefix=prefix)

    register_error_handlers(app)
    register_jwt_callbacks(jwt)
    register_cli_commands(app)

    if app.config["AUTO_CREATE_DB"]:
        with app.app_context():
            db.create_all()
            if app.config["SEED_DEMO_DATA"]:
                from services.seed import seed_demo_data
                seed_demo_data()

    return app


def register_error_handlers(app):
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        return api_error(f"HTTP_{error.code}", error.description, error.code)

    @app.errorhandler(JWTExtendedException)
    def handle_jwt_exception(error):
        return api_error("JWT_ERROR", str(error), 401)

    @app.errorhandler(Exception)
    def handle_unexpected_exception(error):
        app.logger.exception("Unhandled exception", exc_info=error)
        return api_error("INTERNAL_ERROR", "Внутренняя ошибка сервера", 500)


def register_jwt_callbacks(manager):
    @manager.expired_token_loader
    def expired_token(_header, _payload):
        return api_error("TOKEN_EXPIRED", "Токен истёк", 401)

    @manager.invalid_token_loader
    def invalid_token(_reason):
        return api_error("INVALID_TOKEN", "Недействительный токен", 401)

    @manager.unauthorized_loader
    def missing_token(_reason):
        return api_error("AUTH_REQUIRED", "Требуется авторизация", 401)


def register_cli_commands(app):
    @app.cli.command("init-db")
    def init_db():
        db.create_all()
        print("SANAQ database initialized")

    @app.cli.command("seed-demo")
    def seed_demo():
        from services.seed import seed_demo_data
        seed_demo_data()
        print("SANAQ demo content seeded")

    @app.cli.command("create-admin")
    def create_admin():
        email = input("Email: ").strip().lower()
        if db.session.scalar(db.select(User).filter_by(email=email)):
            print("User already exists")
            return
        user = User(email=email, name=input("Name: ").strip(), role="admin", is_verified=True)
        user.set_password(input("Password: "))
        db.session.add(user)
        db.session.commit()
        print(f"Admin {email} created")


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), debug=app.config["DEBUG"])
