# 🚀 Deploy a VPS - Maestro Inventario

## Pre-requisitos en el VPS

### 1. Instalar Docker y Docker Compose
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# CentOS/RHEL
sudo yum install docker docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 2. Verificar instalación
```bash
docker --version
docker-compose --version
```

## Transferir archivos al VPS

### Opción 1: Git (Recomendado)
```bash
# En el VPS
git clone https://github.com/tu-usuario/maestro_inventario.git
cd maestro_inventario
```

### Opción 2: SCP desde local
```bash
# Desde tu máquina local
scp -r . usuario@IP_VPS:/home/usuario/maestro_inventario/
```

### Opción 3: Comprimir y subir
```bash
# En local
tar -czf maestro_inventario.tar.gz .

# Subir al VPS
scp maestro_inventario.tar.gz usuario@IP_VPS:/home/usuario/

# En VPS
tar -xzf maestro_inventario.tar.gz
cd maestro_inventario
```

## Configuración en VPS

### 1. Configurar archivo .env
```bash
# Copiar template
cp .env.example .env

# Editar con datos del VPS
nano .env
```

**Configuración .env para VPS:**
```env
# Base de datos (Puerto personalizado)
DB_PASSWORD=tu_password_muy_seguro_aqui
DATABASE_HOST=db
DATABASE_PORT=5433

# Django/FastAPI (Puerto personalizado)
SECRET_KEY=tu_secret_key_de_50_caracteres_minimo_muy_seguro
DEBUG=False
BACKEND_PORT=8030

# Frontend (Puerto personalizado)
FRONTEND_PORT=5173

# Dominio (cambiar por tu IP o dominio)
DOMAIN=tu-ip-vps.com

# Configuración de puertos
POSTGRES_PORT=5433
BACKEND_API_PORT=8030
FRONTEND_DEV_PORT=5173
```

### 2. Abrir puertos en firewall
```bash
# Ubuntu UFW
sudo ufw allow 5173
sudo ufw allow 8030
sudo ufw allow 5433

# CentOS/RHEL Firewalld
sudo firewall-cmd --permanent --add-port=5173/tcp
sudo firewall-cmd --permanent --add-port=8030/tcp
sudo firewall-cmd --permanent --add-port=5433/tcp
sudo firewall-cmd --reload

# O deshabilitar firewall temporalmente (no recomendado en producción)
sudo ufw disable
```

## Deploy con Docker

### 1. Construir y levantar servicios
```bash
# Dar permisos de ejecución al script
chmod +x deploy.ps1

# O ejecutar comandos manualmente
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### 2. Verificar servicios
```bash
docker-compose ps
docker-compose logs backend
docker-compose logs frontend
```

### 3. Ejecutar migraciones (primera vez)
```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

## Verificación del Deploy

### URLs de acceso:
- **Frontend:** `http://IP_VPS:5173`
- **Backend API:** `http://IP_VPS:8030`
- **Admin Django:** `http://IP_VPS:8030/admin`

### Comandos de verificación:
```bash
# Ver estado de contenedores
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Reiniciar servicios
docker-compose restart

# Ver uso de recursos
docker stats
```

## Configuración SSL (Opcional)

### Con Nginx Reverse Proxy
```bash
# Instalar Nginx
sudo apt install nginx -y

# Configurar proxy
sudo nano /etc/nginx/sites-available/maestro_inventario
```

**Configuración Nginx:**
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:8030;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/maestro_inventario /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Monitoreo y Mantenimiento

### Scripts útiles:
```bash
# Backup de base de datos
docker-compose exec db pg_dump -U postgres maestro_inventario > backup_$(date +%Y%m%d).sql

# Actualizar aplicación
git pull
docker-compose build --no-cache
docker-compose up -d

# Ver logs por fecha
docker-compose logs --since="2024-01-01" backend

# Limpiar recursos Docker
docker system prune -f
```

## Troubleshooting

### Si hay problemas de conectividad:
```bash
# Verificar puertos abiertos
netstat -tulpn | grep -E "(5173|8030|5433)"

# Verificar firewall
sudo ufw status
sudo iptables -L

# Verificar Docker network
docker network ls
docker network inspect maestro_inventario_default
```

### Si el backend no arranca:
```bash
# Ver logs detallados
docker-compose logs backend

# Entrar al contenedor
docker-compose exec backend bash

# Verificar dependencias
docker-compose exec backend pip list | grep pydantic
```

## Monitoreo de Producción

### Configurar Logrotate:
```bash
sudo nano /etc/logrotate.d/docker-compose
```

```
/var/lib/docker/containers/*/*-json.log {
    daily
    rotate 7
    copytruncate
    delaycompress
    compress
    notifempty
    missingok
}
```

### Configurar restart automático:
```bash
# Crear servicio systemd
sudo nano /etc/systemd/system/maestro-inventario.service
```

```ini
[Unit]
Description=Maestro Inventario
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/usuario/maestro_inventario
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable maestro-inventario.service
sudo systemctl start maestro-inventario.service
```
