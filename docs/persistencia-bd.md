# Estrategia de Persistencia con Volúmenes Externos

## 🎯 Objetivo
Garantizar que los datos (BD y certificados SSL) persistan entre deploys, mientras que todos los contenedores se pueden recrear libremente para evitar conflictos de nombres.

## 🔧 Implementación

### 1. Volúmenes Externos Persistentes
```bash
# Volúmenes que persisten entre deploys
docker volume create sancho_postgres_data
docker volume ls --filter "name=traefik_letsencrypt"
```

### 2. Estrategia de Contenedores
- **Todos los contenedores**: Se recrean en cada deploy con nombres únicos
- **Datos persistentes**: Se mantienen en volúmenes externos
- **Sin conflictos**: No hay problemas de nombres duplicados

### 3. Configuración Docker Compose
```yaml
services:
  # TODOS LOS CONTENEDORES (RECREABLES)
  traefik:
    container_name: sancho_traefik_${DEPLOY_ID:-$(date +%s)}  # ÚNICO
    volumes:
      - sancho-distribuidora-mi-front-npxvvf_traefik_letsencrypt:/letsencrypt

  db:
    container_name: sancho_db_v2  # ÚNICO POR DEPLOY
    volumes:
      - sancho_postgres_data:/var/lib/postgresql/data

  backend:
    container_name: sancho_backend_${DEPLOY_ID:-$(date +%s)}  # ÚNICO

  frontend:
    container_name: sancho_frontend_${DEPLOY_ID:-$(date +%s)}  # ÚNICO

volumes:
  sancho_postgres_data:
    external: true  # PERSISTE ENTRE DEPLOYS
  sancho-distribuidora-mi-front-npxvvf_traefik_letsencrypt:
    external: true  # PERSISTE ENTRE DEPLOYS
```

## 🚀 Proceso de Deploy

### Antes del Deploy
```bash
# Ejecutar script de limpieza (elimina TODOS los contenedores)
./scripts/pre-deploy-cleanup.sh
```

### Durante el Deploy
1. ✅ **Todos los contenedores** se recrean con nombres únicos
2. ✅ **Datos persistentes** se mantienen en volúmenes externos
3. ✅ **Sin conflictos** de nombres duplicados
4. ✅ Deploy procede sin errores

## 🛡️ Ventajas

- **Datos Seguros**: BD y SSL persisten en volúmenes externos
- **Deploy Limpio**: Nunca hay conflictos de nombres de contenedores
- **Rollback Fácil**: Datos siempre disponibles en volúmenes
- **Mantenimiento Simple**: Scripts automatizados
- **Alta Disponibilidad**: Contenedores se recrean rápidamente

## 📋 Comandos de Verificación

```bash
# Verificar volúmenes persistentes
docker volume ls --filter "name=sancho_postgres_data"
docker volume ls --filter "name=traefik_letsencrypt"

# Verificar datos en volúmenes
docker volume inspect sancho_postgres_data
docker volume inspect sancho-distribuidora-mi-front-npxvvf_traefik_letsencrypt

# Conectar a la BD (buscar contenedor activo)
docker ps --filter "name=sancho_db"
docker exec -it <container_name> psql -U maestro -d maestro_inventario
```

## ⚠️ Consideraciones

- Los volúmenes externos deben existir antes del primer deploy
- Los contenedores se recrean en cada deploy (sin problemas)
- Los scripts de limpieza eliminan TODOS los contenedores
- Los datos persisten solo en volúmenes externos

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
