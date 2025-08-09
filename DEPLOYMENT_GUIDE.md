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
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`www.sanchodistribuidora.com`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.frontend.loadbalancer.server.port=80"
```

### `deploy-frontend.sh`
Script automatizado que:
- Detiene y remueve el contenedor existente
- Construye nueva imagen sin cache
- Crea nuevo contenedor
- Limpia imágenes obsoletas

## 🚀 Cómo Hacer Deploy

### Opción 1: Usando el Script Automatizado
```bash
# En el VPS
/etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code/deploy-frontend.sh
```

### Opción 2: Manual
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
**Solución**: Usar el script `deploy-frontend.sh` que maneja la recreación automáticamente.

### Error: "Network sancho_network not found"
**Solución**: Verificar que no existan archivos `docker-compose.yml` conflictivos y usar solo `docker-compose.dokploy.yml`.

### Frontend no responde
**Solución**: 
1. Verificar que Traefik esté corriendo: `docker ps | grep traefik`
2. Reiniciar Traefik si es necesario: `docker restart sancho_traefik_v2`

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
