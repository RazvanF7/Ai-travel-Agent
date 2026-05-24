#!/bin/sh
set -e

echo "==> Running database migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Starting Gunicorn WSGI server..."
exec gunicorn config.wsgi:application -b 0.0.0.0:8000 --workers 3 --threads 3 --timeout 300
