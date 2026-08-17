#!/bin/sh
set -e

exec gunicorn --preload --workers "${GUNICORN_WORKERS:-2}" --threads "${GUNICORN_THREADS:-4}" --bind 0.0.0.0:8000 --timeout 120 app:app

