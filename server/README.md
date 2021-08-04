# Python service for automating disputes.



Requirements:

0. Programmatic access to Gcloud Storage (via loading of credentials in json file):
   > l21:main.py: `os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(
    Path(__file__).parent.joinpath("service-key.json")
)`
1. Postgres resource available to connect (code in `config.py`)
2. Must be able to make external requests to The Graph network api (used for validation and identifying indexers tied to a dispute)
3. (FUTURE) access to serices for running predictive analytics and metrics monitoring. 



Steps to run locally:
---
 
1. Setup the database:
 
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


