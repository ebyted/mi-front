# Estrategia de Persistencia de Infraestructura

## 🎯 Objetivo
Garantizar que la infraestructura (BD y Traefik) nunca se recree durante los deploys, mientras que los contenedores de aplicación (backend/frontend) pueden recrearse libremente.

## 🔧 Implementación

### 1. Volumen Externo Persistente
```bash
# El volumen sancho_postgres_data es externo y persistente
docker volume create sancho_postgres_data
```

### 2. Contenedores con Estrategia Mixta
- **Infraestructura**: Nombres fijos que nunca cambian
  - Base de datos: `sancho_db_v2` (nombre original mantenido)
  - Traefik: `sancho_traefik_persistent`
- **Aplicación**: `sancho_[servicio]_${DEPLOY_ID}` (nombres únicos por deploy)
  - Backend: `sancho_backend_${DEPLOY_ID}`
  - Frontend: `sancho_frontend_${DEPLOY_ID}`

### 3. Configuración Docker Compose
```yaml
services:
  # INFRAESTRUCTURA (PERSISTENTE)
  traefik:
    container_name: sancho_traefik_persistent  # FIJO
    volumes:
      - ./letsencrypt:/letsencrypt  # Certificados SSL persistentes

  db:
    container_name: sancho_db_v2  # FIJO (nombre original)
    volumes:
      - sancho_postgres_data:/var/lib/postgresql/data

  # APLICACIÓN (RECREABLE)
  backend:
    container_name: sancho_backend_${DEPLOY_ID:-$(date +%s)}  # ÚNICO

  frontend:
    container_name: sancho_frontend_${DEPLOY_ID:-$(date +%s)}  # ÚNICO

volumes:
  sancho_postgres_data:
    external: true  # PERSISTE ENTRE DEPLOYS
```

## 🚀 Proceso de Deploy

### Antes del Deploy
```bash
# Ejecutar script de limpieza
./scripts/pre-deploy-cleanup.sh
```

### Durante el Deploy
1. ✅ **Infraestructura** mantiene nombres fijos y datos persistentes
   - BD: datos en volumen externo
   - Traefik: certificados SSL en directorio local
2. ✅ **Aplicación** usa nombres únicos (sin conflictos)
3. ✅ Deploy procede sin errores

## 🛡️ Ventajas

- **Datos Seguros**: La BD nunca se recrea
- **SSL Persistente**: Certificados no se pierden
- **Deploy Limpio**: No hay conflictos de nombres en aplicación
- **Rollback Fácil**: Infraestructura siempre disponible
- **Mantenimiento Simple**: Scripts automatizados

## 📋 Comandos de Verificación

```bash
# Verificar estado de la infraestructura
docker ps --filter "name=sancho_db_v2"
docker ps --filter "name=sancho_traefik_persistent"

# Verificar volumen persistente
docker volume inspect sancho_postgres_data

# Conectar a la BD
docker exec -it sancho_db_v2 psql -U maestro -d maestro_inventario

# Verificar certificados SSL
ls -la ./letsencrypt/
```

## ⚠️ Consideraciones

- El volumen `sancho_postgres_data` debe existir antes del primer deploy
- Los certificados SSL se almacenan en `./letsencrypt/`
- Los scripts de limpieza nunca tocan contenedores `sancho_db_v2` y `sancho_traefik_persistent`
- Solo se recrean contenedores de aplicación (backend/frontend)

## 🆘 Recuperación de Emergencia

Si la BD se elimina accidentalmente:
```bash
# Crear nuevo contenedor con el volumen persistente
docker run -d \
  --name sancho_db_v2 \
  --restart unless-stopped \
  -e POSTGRES_DB=maestro_inventario \
  -e POSTGRES_USER=maestro \
  -e POSTGRES_PASSWORD=maestro \
  -v sancho_postgres_data:/var/lib/postgresql/data \
  postgres:15
```
