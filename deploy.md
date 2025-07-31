# 🚀 Guía de Despliegue - Maestro Inventario

## Pasos para Deploy con Docker

### 1. **Preparar el archivo de entorno**
```powershell
# Copiar el template
copy .env.example .env

# Editar .env con tus datos reales:
# - DB_PASSWORD=tu_password_seguro
# - SECRET_KEY=tu_secret_key_muy_largo
# - DOMAIN=tu-dominio.com o localhost
```

### 2. **Detener servicios existentes (si los hay)**
```powershell
docker-compose down -v
docker system prune -f
```

### 3. **Reconstruir las imágenes desde cero**
```powershell
docker-compose build --no-cache
```

### 4. **Levantar los servicios**
```powershell
docker-compose up -d
```

### 5. **Verificar que todo esté corriendo**
```powershell
docker-compose ps
docker-compose logs backend
docker-compose logs frontend
```

### 6. **Ejecutar migraciones (solo la primera vez)**
```powershell
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

## 🔧 URLs de Acceso

- **Frontend (Tienda):** `http://localhost:5173` ó `http://tu-servidor:5173`
- **Backend API:** `http://localhost:8030` ó `http://tu-servidor:8030`
- **Admin Django:** `http://localhost:8030/admin`

## 🐛 Solución de Problemas

### Error: pydantic_settings no encontrado
```powershell
# Reconstruir sin cache
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d
```

### Verificar logs de errores
```powershell
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Reiniciar servicio específico
```powershell
docker-compose restart backend
docker-compose restart frontend
```

## 📋 Puertos Configurados

- **Base de datos:** `5433:5432`
- **Backend:** `8030:8030`
- **Frontend:** `5173:80`

## 🔄 Comandos Útiles

```powershell
# Ver estado de contenedores
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Entrar al contenedor backend
docker-compose exec backend bash

# Entrar al contenedor de base de datos
docker-compose exec db psql -U postgres

# Hacer backup de base de datos
docker-compose exec db pg_dump -U postgres maestro_inventario > backup.sql

# Restaurar backup
docker-compose exec -T db psql -U postgres maestro_inventario < backup.sql
```
