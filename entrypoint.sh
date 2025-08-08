#!/bin/bash
set -e

echo "Starting Django application..."
echo "Current working directory: $(pwd)"
echo "Contents of /app:"
ls -la /app/

echo "Running Django checks..."
python manage.py check --deploy

echo "Starting Django development server..."
exec python manage.py runserver 0.0.0.0:8030
