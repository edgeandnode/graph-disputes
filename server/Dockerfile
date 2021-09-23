# `python-base` sets up all our shared environment variables
FROM python:3.8-buster as python-base

WORKDIR /app

ENV PYTHONFAULTHANDLER=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random 

FROM python-base as builder


ENV PIP_DEFAULT_TIMEOUT=100 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    POETRY_VERSION=1.1.7

RUN buildDeps="build-essential libpq-dev curl git gcc patch libc6-dev ca-certificates" \
    && apt-get update \
    && apt-get install --no-install-recommends -y \
    curl \
    vim \
    netcat \
    && apt-get install -y --no-install-recommends $buildDeps \
    && rm -rf /var/lib/apt/lists/*

RUN pip install "poetry==$POETRY_VERSION"

RUN python -m venv /venv


# Copy only requirements to cache them in docker layer
COPY poetry.lock pyproject.toml ./
RUN poetry export --without-hashes -f  requirements.txt  | /venv/bin/pip install -r /dev/stdin

COPY . .
RUN poetry build && /venv/bin/pip install dist/*.whl

FROM python-base as final

COPY --from=builder /venv /venv
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 5432
EXPOSE 8000
CMD . /venv/bin/activate && uvicorn api.asgi:app --host 0.0.0.0 --port 8000
# ENTRYPOINT ["./docker-entrypoint.sh"]
