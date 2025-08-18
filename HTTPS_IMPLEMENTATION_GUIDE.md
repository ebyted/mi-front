# Guía para Implementar HTTPS con Traefik

## 🔐 Implementación de HTTPS con Let's Encrypt

### Paso 1: Crear archivo Traefik Docker Compose

Crear el archivo `traefik-docker-compose.yml` en el VPS:

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    command:
      # API y dashboard
      - --api.dashboard=true
      - --api.insecure=false
      # Puntos de entrada
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      # Proveedores
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --providers.docker.network=dokploy-network
      # Certificados SSL con Let's Encrypt
      - --certificatesresolvers.letsencrypt.acme.email=admin@sanchodistribuidora.com
      - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
      - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
      # Redirección global a HTTPS
      - --entrypoints.web.http.redirections.entrypoint.to=websecure
      - --entrypoints.web.http.redirections.entrypoint.scheme=https
      # Logs
      - --log.level=INFO
      - --accesslog=true
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Dashboard de Traefik
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-letsencrypt:/letsencrypt
    networks:
      - dokploy-network
    labels:
      - "traefik.enable=true"
      # Dashboard de Traefik
      - "traefik.http.routers.traefik-dashboard.rule=Host(`traefik.sanchodistribuidora.com`)"
      - "traefik.http.routers.traefik-dashboard.entrypoints=websecure"
      - "traefik.http.routers.traefik-dashboard.tls.certresolver=letsencrypt"
      - "traefik.http.routers.traefik-dashboard.service=api@internal"
      # Middleware de autenticación básica para el dashboard
      - "traefik.http.middlewares.auth.basicauth.users=admin:$$2y$$10$$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"

volumes:
  traefik-letsencrypt:

networks:
  dokploy-network:
    external: true
```

### Paso 2: Modificar docker-compose.yml principal

```yaml
services:
  db:
    image: postgres:15
    container_name: sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep
    restart: unless-stopped
    environment:
      - POSTGRES_DB=maestro_inventario
      - POSTGRES_USER=maestro
      - POSTGRES_PASSWORD=maestro
    networks:
      - dokploy-network
    # NO exponer puerto 5432 externamente por seguridad
    # ports:
    #   - "5432:5432"

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: sancho_backend_v2
    restart: always
    environment:
      - DEBUG=False
      - DATABASE_HOST=db
      - DATABASE_NAME=maestro_inventario
      - DATABASE_USER=maestro
      - DATABASE_PASSWORD=maestro
      - DATABASE_PORT=5432
      - ALLOWED_HOSTS=www.sanchodistribuidora.com,sanchodistribuidora.com,localhost,127.0.0.1
      - SECRET_KEY=inventario-maestro-inventario-secret-key-123456789abcdef
      - DJANGO_SETTINGS_MODULE=maestro_inventario_backend.settings
      - PYTHONUNBUFFERED=1
    networks:
      - dokploy-network
    # NO exponer puerto directo, usar solo Traefik
    # ports:
    #   - "8030:8030"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.sancho-backend.rule=Host(`www.sanchodistribuidora.com`,`sanchodistribuidora.com`) && PathPrefix(`/api`)"
      - "traefik.http.routers.sancho-backend.entrypoints=websecure"
      - "traefik.http.routers.sancho-backend.tls.certresolver=letsencrypt"
      - "traefik.http.services.sancho-backend.loadbalancer.server.port=8030"
    command: sh -c "python manage.py collectstatic --noinput && gunicorn maestro_inventario_backend.wsgi:application --bind 0.0.0.0:8030 --workers 3 --timeout 120"

  frontend:
    build: ./dbackf
    container_name: sancho_frontend_v2
    restart: unless-stopped
    networks:
      - dokploy-network
    # NO exponer puertos directo, usar solo Traefik
    # ports:
    #   - "80:80"
    #   - "443:443"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.sancho-frontend.rule=Host(`www.sanchodistribuidora.com`,`sanchodistribuidora.com`) && !PathPrefix(`/api`)"
      - "traefik.http.routers.sancho-frontend.entrypoints=websecure"
      - "traefik.http.routers.sancho-frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.sancho-frontend.loadbalancer.server.port=80"

networks:
  dokploy-network:
    external: true
```

## 🚀 Comandos de Instalación

### 1. Subir archivos al VPS:
```bash
scp traefik-docker-compose.yml root@168.231.74.214:/tmp/
scp docker-compose.yml root@168.231.74.214:/tmp/docker-compose-https.yml
```

### 2. Parar contenedores actuales:
```bash
ssh root@168.231.74.214 "cd /etc/dokploy/compose/sancho-app-mifront-dsinfo/code && docker-compose down"
```

### 3. Instalar Traefik:
```bash
ssh root@168.231.74.214 "cd /tmp && docker-compose -f traefik-docker-compose.yml up -d"
```

### 4. Actualizar aplicación principal:
```bash
ssh root@168.231.74.214 "cd /etc/dokploy/compose/sancho-app-mifront-dsinfo/code && cp /tmp/docker-compose-https.yml docker-compose.yml && docker-compose up -d"
```

### 5. Verificar certificados:
```bash
ssh root@168.231.74.214 "docker logs traefik | grep -i certificate"
```

## 🔍 Verificaciones

### URLs que funcionarán con HTTPS:
- https://www.sanchodistribuidora.com (Frontend)
- https://www.sanchodistribuidora.com/api/ (Backend)
- https://traefik.sanchodistribuidora.com (Dashboard Traefik)

### Comandos de verificación:
```bash
# Verificar certificado SSL
curl -I https://www.sanchodistribuidora.com

# Verificar redirección HTTP -> HTTPS
curl -I http://www.sanchodistribuidora.com

# Ver logs de Traefik
docker logs traefik -f
```

## ⚠️ Notas Importantes

1. **DNS**: Asegúrate que el dominio apunte a la IP del VPS
2. **Firewall**: Puertos 80 y 443 deben estar abiertos
3. **Let's Encrypt**: Los certificados se renuevan automáticamente
4. **Seguridad**: Solo Traefik expone puertos públicos
5. **Dashboard**: Traefik dashboard protegido con autenticación

## 🔐 Credenciales Dashboard Traefik
- Usuario: `admin`
- Password: `password` (cambiar en producción)
