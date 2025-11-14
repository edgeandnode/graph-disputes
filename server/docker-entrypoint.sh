/bin/sh

set -e

. /venv/bin/activate

exec uvicorn api.asgi:app --host 0.0.0.0 --port 8000