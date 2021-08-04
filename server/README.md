createdb dispute_service
create user dispute_arbitrator

grant privileges.

when adding a model, add to the views and to the poetry toml.

rerun

poetry install
poetry run alembic revision --autogenerate -m '{COMMENT}'
poetry run alembic upgrade head
