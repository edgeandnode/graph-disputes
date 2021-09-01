FROM python:3.8-buster as python

RUN buildDeps="build-essential libpq-dev curl git gcc patch libc6-dev ca-certificates" \
    && apt-get update \
    && apt-get install --no-install-recommends -y \
    curl \
    vim \
    netcat \
    && apt-get install -y --no-install-recommends $buildDeps \
    && rm -rf /var/lib/apt/lists/*


#Install from wheel
COPY dist/*.whl /


RUN pip install --no-cache-dir --use-deprecated=legacy-resolver /*.whl \
    && rm -rf /*.whl

EXPOSE 5432
EXPOSE 8000
CMD ["uvicorn", "api.asgi:app", "--host", "0.0.0.0", "--port", "8000"]
