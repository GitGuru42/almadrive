import os

def _normalize_db_url(url: str) -> str:
    # SQLAlchemy 1.4+/2.x expects 'postgresql://', but some platforms still provide 'postgres://'
    if url and url.startswith('postgres://'):
        return 'postgresql://' + url[len('postgres://'):]
    return url

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine import Connection

from alembic import context

# add your model's MetaData object here
# for 'autogenerate' support
from api.database import Base # Import your Base from api.database
from api import models # Import your models
target_metadata = Base.metadata

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)



def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = _normalize_db_url(os.getenv(\"DATABASE_URL\", config.get_main_option("sqlalchemy.url")))
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration[\"sqlalchemy.url\"] = _normalize_db_url(os.getenv(\"DATABASE_URL\", configuration[\"sqlalchemy.url\"]))
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()