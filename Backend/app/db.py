import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import declarative_base, sessionmaker


ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_PATH)


# This function reads the first environment variable that exists.
def get_env_value(*names):
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return None


# This function updates PostgreSQL URLs so SQLAlchemy uses the psycopg driver.
def normalize_database_url(database_url):
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)

    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    return database_url


# This function creates the database URL without printing any secret values.
def build_database_url():
    database_url = get_env_value("DATABASE_URL", "database_url")
    if database_url:
        return normalize_database_url(database_url)

    host = get_env_value("DB_HOST", "host")
    port = get_env_value("DB_PORT", "port") or "5432"
    database = get_env_value("DB_NAME", "database")
    user = get_env_value("DB_USER", "user")
    password = get_env_value("DB_PASSWORD", "password")

    missing_names = []
    if not host:
        missing_names.append("DB_HOST or host")
    if not database:
        missing_names.append("DB_NAME or database")
    if not user:
        missing_names.append("DB_USER or user")
    if not password:
        missing_names.append("DB_PASSWORD or password")

    if missing_names:
        # Fallback to local PostgreSQL URL if env vars are missing
        return "postgresql+psycopg://postgres:postgres@localhost:5432/ghostwriter_db"

    return URL.create(
        "postgresql+psycopg",
        username=user,
        password=password,
        host=host,
        port=int(port),
        database=database,
    )


# Determine SSL settings based on database URL host
db_url = build_database_url()
db_url_str = str(db_url)
connect_args = {}
if "localhost" not in db_url_str and "127.0.0.1" not in db_url_str:
    connect_args["sslmode"] = "require"

# This database block creates the shared SQLAlchemy engine for PostgreSQL.
engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)

# This database block creates new database sessions for API requests.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# This database block gives SQLAlchemy a base class for ORM models.
Base = declarative_base()


# This function gives each API request its own database session and closes it after use.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

