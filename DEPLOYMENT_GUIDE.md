# 🚀 Guía de Deployment - Frontend

## 📋 Resumen de la Solución

Hemos implementado una estrategia de deployment que evita completamente los conflictos de nombres de contenedores. La solución consiste en:

1. **Servicios Independientes**: Traefik, Base de Datos y Backend corren como contenedores independientes
2. **Frontend Gestionado**: Solo el frontend se gestiona via docker-compose
3. **Recreación Automática**: Script que fuerza la recreación completa del frontend

## 🛠️ Archivos de Configuración

### `docker-compose.dokploy.yml`
```yaml
services:
  frontend:
    build:
      context: ./dbackf
      dockerfile: Dockerfile
    container_name: sancho_frontend_v2
    restart: unless-stopped
    networks:
      - code_default
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`www.sanchodistribuidora.com`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.frontend.loadbalancer.server.port=80"

networks:
  code_default:
    external: true
```

### Scripts de Deploy Disponibles

#### `auto-deploy.sh` - Deploy Completo Automatizado
- ✅ Pre-deploy cleanup automático
- ✅ Construcción de imagen desde cero
- ✅ Recreación completa del contenedor
- ✅ Verificación de estado y conectividad
- ✅ Limpieza de imágenes obsoletas
- ✅ Logs detallados con timestamps

#### `deploy-frontend.sh` - Deploy Solo Frontend
- ✅ Limpieza forzada de contenedores
- ✅ Construcción con `--no-cache --pull`
- ✅ Creación con `--force-recreate`
- ✅ Manejo de errores con retry automático
- ✅ Verificación de estado y web

#### `pre-deploy.sh` - Limpieza Pre-Deploy
- ✅ Detiene todos los contenedores frontend
- ✅ Remueve contenedores (incluso duplicados)
- ✅ Limpia imágenes sin usar
- ✅ Verificación de limpieza exitosa

## 🚀 Cómo Hacer Deploy

### Opción 1: Deploy Automatizado Completo (Recomendado)
```bash
# En el VPS - Deploy con recreación completa garantizada
/etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code/auto-deploy.sh
```

### Opción 2: Deploy Frontend Solamente
```bash
# En el VPS - Solo recrear frontend
/etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code/deploy-frontend.sh
```

### Opción 3: Pre-Deploy Cleanup Solamente
```bash
# En el VPS - Solo limpiar contenedores sin deploy
/etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code/pre-deploy.sh
```

### Opción 4: Manual (No Recomendado)
```bash
# 1. Detener y remover contenedor existente
docker stop sancho_frontend_v2
docker rm sancho_frontend_v2

# 2. Construir nueva imagen
cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code
docker-compose -f docker-compose.dokploy.yml build --no-cache frontend

# 3. Crear y arrancar nuevo contenedor
docker-compose -f docker-compose.dokploy.yml up -d frontend
```

### Configuración de Dokploy (Automático)
Para que Dokploy ejecute automáticamente la limpieza antes de cada deploy:

1. En la interfaz de Dokploy, ir a tu proyecto
2. En "Build & Deploy" > "Pre Deploy Command", agregar:
   ```bash
   cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code && ./pre-deploy.sh
   ```
3. En "Post Deploy Command", agregar:
   ```bash
   curl -f https://www.sanchodistribuidora.com || echo "Warning: Site not responding"
   ```

## ✅ Verificación Post-Deploy

```bash
# Verificar estados de contenedores
docker ps --filter name=sancho --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

# Verificar sitio web
curl -I https://www.sanchodistribuidora.com

# Verificar API
curl -s https://www.sanchodistribuidora.com/api/users/ | head -c 200
```

## 🔧 Troubleshooting

### Error: "Conflict. The container name is already in use"
**Solución Automática**: 
```bash
# Usar el script completo que maneja todos los conflictos
./auto-deploy.sh
```

**Solución Manual**:
```bash
# Limpiar contenedores duplicados
docker ps -aq --filter name=sancho_frontend_v2 | xargs -r docker rm -f
# Luego ejecutar deploy normal
./deploy-frontend.sh
```

### Error: "Network sancho_network not found" 
**Solución**: Verificar que no existan archivos `docker-compose.yml` conflictivos:
```bash
# Buscar archivos problemáticos
find /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/ -name "docker-compose.yml"
# Remover archivos conflictivos si existen
rm -f /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code/docker-compose.yml
```

### Frontend no responde (Error 502)
**Diagnóstico**:
```bash
# 1. Verificar que todos los contenedores estén en la misma red
docker inspect sancho_frontend_v2 | grep NetworkMode
docker inspect sancho_traefik_v2 | grep NetworkMode

# 2. Verificar logs del frontend
docker logs sancho_frontend_v2

# 3. Verificar logs de Traefik
docker logs sancho_traefik_v2
```

**Solución**:
```bash
# Recrear completamente el frontend con configuración correcta
./auto-deploy.sh
```

### Problemas de Red Entre Contenedores
**Verificar conectividad**:
```bash
# Test desde Traefik hacia Frontend
docker exec sancho_traefik_v2 wget -qO- http://sancho_frontend_v2/

# Listar redes
docker network ls

# Ver contenedores en cada red
docker network inspect code_default
```

### Deploy Lento o Falla de Build
**Optimizar construcción**:
```bash
# Limpiar cache de Docker
docker system prune -a
# Ejecutar deploy con limpieza completa
./auto-deploy.sh
```

## 📊 Estado Actual del Sistema

| Servicio | Contenedor | Red | Puerto | Estado |
|----------|------------|-----|--------|---------|
| Traefik | sancho_traefik_v2 | code_default | 80,443 | Independiente |
| Database | sancho_db_v2 | code_default | 5432 | Independiente |
| Backend | sancho_backend_v2 | code_default | 8030 | Independiente |
| Frontend | sancho_frontend_v2 | code_default | 80 | Docker Compose |

## 🎯 Ventajas de esta Estrategia

1. **🚫 Sin Conflictos**: Eliminación completa de conflictos de nombres
2. **⚡ Deployments Rápidos**: Solo se recrea el frontend
3. **🛡️ Estabilidad**: Servicios críticos no se interrumpen
4. **🔧 Facilidad de Mantenimiento**: Gestión independiente de cada servicio
5. **📈 Escalabilidad**: Fácil agregar nuevos servicios sin conflictos

## 🚨 IMPORTANTE

- **Siempre usar el script `deploy-frontend.sh`** para deployments automáticos
- **No modificar los contenedores independientes** (traefik, db, backend) a menos que sea absolutamente necesario
- **Hacer backup de la base de datos** antes de cualquier cambio mayor
- **Verificar el sitio web** después de cada deploy
