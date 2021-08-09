# Python service for automating disputes.

Steps to run locally:
---
 
0. Setup the database:
 
 >  `createdb dispute_service` \
   `create user dispute_arbitrator`\
   `GRANT ALL PRIVILEGES ON dispute_service TO dispute_arbitrator`

1. Install `poetry` 
   
> `curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/get-poetry.py | python -`

2. Install packages with poetry
> `poetry install`

3. Run application.
> `poetry run uvicorn api.asgi:app --reload`

\
Adding routes/models
---

When adding a model, add the containing module to the `pyproject.toml` underneath:

> `[tool.poetry.plugins."api.modules"]`\
`module = "api.{PATH_TO_MODULE}"`

\
Building migrations
---

>`poetry install`\
`poetry run alembic revision --autogenerate -m '{COMMENT}'`\
`poetry run alembic upgrade head`
