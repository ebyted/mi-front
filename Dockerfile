FROM python:3.13-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Crear directorios necesarios
RUN mkdir -p media static logs

EXPOSE 8000

# Default command, can be overridden by docker-compose
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

