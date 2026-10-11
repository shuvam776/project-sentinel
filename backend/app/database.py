from collections.abc import Generator
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

def _create_db_engine():
    db_url = settings.DATABASE_URL
    connect_args = {}
    engine_kwargs = {"echo": settings.DEBUG}

    if "sqlite" in db_url:
        connect_args["check_same_thread"] = False
        return create_engine(db_url, connect_args=connect_args, **engine_kwargs)

    # PostgreSQL / Supabase cloud connection pooling
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    connect_args["connect_timeout"] = 3

    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    try:
        test_engine = create_engine(db_url, connect_args=connect_args, **engine_kwargs)
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return test_engine
    except Exception as e:
        import logging
        logger = logging.getLogger("sentinel.database")
        host_repr = db_url.split("@")[-1].split("/")[0] if "@" in db_url else "remote"
        logger.warning(
            "Primary database (%s) unreachable (%s). Using local SQLite database (data/sentinel.db).",
            host_repr, e
        )
        sqlite_url = f"sqlite:///{(settings.DATA_DIR / 'sentinel.db').as_posix()}"
        return create_engine(sqlite_url, connect_args={"check_same_thread": False}, echo=settings.DEBUG)


engine = _create_db_engine()


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if engine.dialect.name == "sqlite":
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        try:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='videos'")
            if cursor.fetchone():
                cursor.execute("PRAGMA table_info(videos)")
                existing_cols = {row[1] for row in cursor.fetchall()}
                for col_name, col_type in [
                    ("cloudinary_url", "VARCHAR(500)"),
                    ("cloudinary_public_id", "VARCHAR(200)"),
                    ("cloudinary_thumbnail_url", "VARCHAR(500)"),
                    ("user_id", "VARCHAR(128)"),
                ]:
                    if col_name not in existing_cols:
                        cursor.execute(f"ALTER TABLE videos ADD COLUMN {col_name} {col_type}")
        except Exception:
            pass
        finally:
            cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency for yielding database sessions per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

