# 🔧 Configuración Técnica - docker-compose.dokploy.yml

## 📄 Archivo de Configuración Funcionando

Este es el contenido exacto del archivo `docker-compose.dokploy.yml` que está funcionando perfectamente:

```yaml
services:
  traefik:
    image: traefik:v3.0
    container_name: sancho_traefik_v2
    restart: unless-stopped
    command:
      - --api.dashboard=true
      - --api.debug=true
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.letsencrypt.acme.email=admin@sanchodistribuidora.com
      - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
      - --certificatesresolvers.letsencrypt.acme.httpchallenge=true
      - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
      - --log.level=DEBUG
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt

  db:
    image: postgres:15
    container_name: sancho_db_v2
    restart: unless-stopped
    environment:
      POSTGRES_DB: maestro_inventario
      POSTGRES_USER: maestro
      POSTGRES_PASSWORD: maestro
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U maestro -d maestro_inventario"]
      interval: 30s
      timeout: 10s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: sancho_backend_v2
    restart: unless-stopped
    environment:
      - DEBUG=False
      - DATABASE_HOST=db
      - DATABASE_NAME=maestro_inventario
      - DATABASE_USER=maestro
      - DATABASE_PASSWORD=maestro
      - DATABASE_PORT=5432
      - ALLOWED_HOSTS=www.sanchodistribuidora.com,localhost,127.0.0.1
      - SECRET_KEY=your-secret-key-change-in-production
      - DJANGO_SETTINGS_MODULE=maestro_inventario_backend.settings
      - PYTHONUNBUFFERED=1
    depends_on:
      - db
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`www.sanchodistribuidora.com`) && PathPrefix(`/api`)"
      - "traefik.http.routers.backend.entrypoints=websecure"
      - "traefik.http.routers.backend.tls.certresolver=letsencrypt"
      - "traefik.http.services.backend.loadbalancer.server.port=8030"

  frontend:
    build:
      context: ./dbackf
      dockerfile: Dockerfile
    container_name: sancho_frontend_v2
    restart: unless-stopped
    depends_on:
      - backend
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`www.sanchodistribuidora.com`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.frontend.loadbalancer.server.port=80"

volumes:
  postgres_data:
```

## 🔑 Puntos Críticos de la Configuración

### **1. Puerto del Backend: 8030**
- **Traefik loadbalancer**: `port=8030` ✅
- **Dockerfile**: `EXPOSE 8030` ✅ 
- **docker-entrypoint.sh**: `runserver 0.0.0.0:8030` ✅

### **2. Certificados SSL**
- **Resolver**: `letsencrypt` automático
- **Email**: `admin@sanchodistribuidora.com`
- **Storage**: `/letsencrypt/acme.json`
- **Challenge**: HTTP challenge en puerto 80

### **3. Base de Datos**
- **Engine**: PostgreSQL 15
- **Database**: `maestro_inventario`
- **User/Pass**: `maestro/maestro`
- **Health Check**: Cada 30s con 5 reintentos

### **4. Rutas de Traefik**
- **Frontend**: `Host(www.sanchodistribuidora.com)` → Puerto 80
- **Backend**: `Host(www.sanchodistribuidora.com) && PathPrefix(/api)` → Puerto 8030

### **5. Dependencias**
```
traefik ← (independiente)
db ← (independiente) 
backend ← db
frontend ← backend
```

## 📊 Otros Archivos Críticos

### **Dockerfile (Backend)**
```dockerfile
FROM python:3.13-slim
WORKDIR /app

# ... instalación de dependencias ...

EXPOSE 8030  # ← Puerto crítico
ENTRYPOINT ["/docker-entrypoint.sh"]
```

### **docker-entrypoint.sh**
```bash
# ... configuración Django ...
exec python manage.py runserver 0.0.0.0:8030 --noreload  # ← Puerto crítico
```

### **Settings Django (Críticos)**
```python
ALLOWED_HOSTS = ['www.sanchodistribuidora.com', 'localhost', '127.0.0.1']
STATIC_ROOT = os.path.join(BASE_DIR, "static")
```

## ⚡ Comandos de Verificación Rápida

```bash
# Estado de todos los servicios
ssh root@168.231.67.221 "docker ps --filter name=sancho --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

# Verificar puertos específicos
ssh root@168.231.67.221 "docker port sancho_backend_v2"

# Test de conectividad
curl -k -I https://www.sanchodistribuidora.com
curl -k -I https://www.sanchodistribuidora.com/api/

# Verificar logs de Traefik para ruteo
ssh root@168.231.67.221 "docker logs sancho_traefik_v2 2>&1 | grep 'Creating server'"
```

## 🚨 Señales de Problemas

### **Problema**: 404 en API
**Causa**: Puerto backend incorrecto  
**Solución**: Verificar que `loadbalancer.server.port=8030`

### **Problema**: SSL no funciona  
**Causa**: Rate limit o certificado expirado  
**Solución**: Verificar logs de Traefik y certificado con `openssl s_client`

### **Problema**: Backend no responde
**Causa**: Puerto 8030 no expuesto  
**Solución**: Verificar Dockerfile `EXPOSE 8030` y docker-entrypoint.sh

### **Problema**: Base de datos connection error
**Causa**: Credenciales incorrectas  
**Solución**: Verificar que todas las variables usen `maestro/maestro`

---

**📝 Creado**: Agosto 9, 2025  
**🔄 Estado**: Configuración verificada y funcionando  
**⚠️ Importante**: NO modificar puertos sin actualizar en todos los archivos
