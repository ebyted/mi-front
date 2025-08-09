# Estrategia de Persistencia de Base de Datos

## 🎯 Objetivo
Garantizar que la base de datos nunca se recree durante los deploys, mientras que los otros contenedores pueden recrearse libremente.

## 🔧 Implementación

### 1. Volumen Externo Persistente
```bash
# El volumen sancho_postgres_data es externo y persistente
docker volume create sancho_postgres_data
```

### 2. Contenedores con Nombres Únicos
- **BD**: `sancho_db_persistent` (nombre fijo, nunca cambia)
- **Otros**: `sancho_[servicio]_${DEPLOY_ID}` (nombres únicos por deploy)

### 3. Configuración Docker Compose
```yaml
services:
  db:
    container_name: sancho_db_persistent  # FIJO
    volumes:
      - sancho_postgres_data:/var/lib/postgresql/data

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
1. ✅ BD mantiene nombre fijo y datos persistentes
2. ✅ Otros contenedores usan nombres únicos (sin conflictos)
3. ✅ Deploy procede sin errores

## 🛡️ Ventajas

- **Datos Seguros**: La BD nunca se recrea
- **Deploy Limpio**: No hay conflictos de nombres
- **Rollback Fácil**: Datos siempre disponibles
- **Mantenimiento Simple**: Scripts automatizados

## 📋 Comandos de Verificación

```bash
# Verificar estado de la BD
docker ps --filter "name=sancho_db_persistent"

# Verificar volumen persistente
docker volume inspect sancho_postgres_data

# Conectar a la BD
docker exec -it sancho_db_persistent psql -U maestro -d maestro_inventario
```

## ⚠️ Consideraciones

- El volumen `sancho_postgres_data` debe existir antes del primer deploy
- Los scripts de limpieza nunca tocan el contenedor `sancho_db_persistent`
- En caso de problemas, la BD siempre se puede restaurar desde el volumen persistente

## 🆘 Recuperación de Emergencia

Si la BD se elimina accidentalmente:
```bash
# Crear nuevo contenedor con el volumen persistente
docker run -d \
  --name sancho_db_persistent \
  --restart unless-stopped \
  -e POSTGRES_DB=maestro_inventario \
  -e POSTGRES_USER=maestro \
  -e POSTGRES_PASSWORD=maestro \
  -v sancho_postgres_data:/var/lib/postgresql/data \
  postgres:15
```
