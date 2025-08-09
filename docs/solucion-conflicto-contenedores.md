# 🚨 CAUSA RAÍZ IDENTIFICADA: Conflicto de Contenedores en Deploy

## 📊 ERROR ESPECÍFICO ANALIZADO

```
Error response from daemon: Conflict. The container name "/sancho_db_v2" is already in use by container "217f63118e17a03565448fbcd22182b9d048664b73a98a2a3e97c0c4b7eeca70". You have to remove (or rename) that container to be able to reuse that name.
```

### 🔍 **PROBLEMA IDENTIFICADO:**

**Dokploy NO está limpiando correctamente los contenedores antes del nuevo deploy**

1. **Build exitoso** ✅ - Las imágenes se construyen correctamente
2. **Container creation fails** ❌ - No puede crear contenedores porque ya existen
3. **Deploy aborts** ❌ - El proceso se detiene por el conflicto

---

## 🔧 SOLUCIONES INMEDIATAS

### **Solución 1: Limpieza Manual Pre-Deploy (Inmediata)**

```bash
# Ejecutar ANTES de cada deploy desde Dokploy
ssh root@168.231.67.221 "
cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code && \
docker-compose -f docker-compose.dokploy.yml down --remove-orphans && \
docker container prune -f && \
docker volume prune -f
"
```

### **Solución 2: Script de Limpieza Automática**

Crear script en el servidor que se ejecute automáticamente:

```bash
#!/bin/bash
# /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/cleanup-before-deploy.sh

echo "🧹 Limpiando contenedores antes del deploy..."

cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code

# Backup de certificados SSL si existen
if [ -d "letsencrypt" ]; then
    cp -r letsencrypt /tmp/letsencrypt-backup-$(date +%Y%m%d-%H%M%S)
    echo "✅ SSL certificates backed up"
fi

# Parar y eliminar contenedores
docker-compose -f docker-compose.dokploy.yml down --remove-orphans --volumes
docker-compose -f docker-compose.http-temp.yml down --remove-orphans --volumes 2>/dev/null || true

# Limpiar contenedores huérfanos específicos
docker container rm sancho_traefik_v2 sancho_db_v2 sancho_backend_v2 sancho_frontend_v2 2>/dev/null || true

# Limpiar sistema
docker system prune -f

echo "✅ Limpieza completada - Listo para deploy"
```

### **Solución 3: Modificar Configuración Docker Compose**

Agregar `container_name` únicos con timestamp o usar nombres aleatorios:

```yaml
services:
  traefik:
    # container_name: sancho_traefik_v2  # Comentar para nombres únicos
    image: traefik:v3.0
    
  db:
    # container_name: sancho_db_v2      # Comentar para nombres únicos  
    image: postgres:15
```

---

## ⚡ IMPLEMENTACIÓN INMEDIATA

### **Paso 1: Limpiar Estado Actual**

```bash
# Ejecutar ahora para limpiar el estado conflictivo
ssh root@168.231.67.221 "
cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code

# Parar servicios HTTP temporales
docker-compose -f docker-compose.http-temp.yml down --remove-orphans --volumes 2>/dev/null || true

# Parar servicios principales  
docker-compose -f docker-compose.dokploy.yml down --remove-orphans --volumes 2>/dev/null || true

# Forzar eliminación de contenedores específicos
docker container rm -f sancho_traefik_v2 sancho_db_v2 sancho_backend_v2 sancho_frontend_v2 2>/dev/null || true

# Limpiar sistema
docker system prune -f

echo '✅ Sistema limpio - Listo para deploy'
"
```

### **Paso 2: Crear Script de Limpieza Automática**

```bash
# Crear script en el servidor
ssh root@168.231.67.221 "cat > /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/cleanup-before-deploy.sh << 'EOF'
#!/bin/bash
echo '🧹 Auto-cleanup before deploy...'

cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code

# Backup SSL si existe
if [ -d 'letsencrypt' ] && [ -f 'letsencrypt/acme.json' ]; then
    mkdir -p /tmp/ssl-backups
    cp -r letsencrypt /tmp/ssl-backups/letsencrypt-backup-\$(date +%Y%m%d-%H%M%S)
    echo '✅ SSL backed up'
fi

# Limpieza completa
docker-compose -f docker-compose.dokploy.yml down --remove-orphans --volumes 2>/dev/null || true
docker-compose -f docker-compose.http-temp.yml down --remove-orphans --volumes 2>/dev/null || true
docker container rm -f sancho_traefik_v2 sancho_db_v2 sancho_backend_v2 sancho_frontend_v2 2>/dev/null || true
docker system prune -f

echo '✅ Cleanup completed'
EOF"

# Hacer ejecutable
ssh root@168.231.67.221 "chmod +x /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/cleanup-before-deploy.sh"
```

### **Paso 3: Ejecutar Limpieza y Deploy**

```bash
# 1. Ejecutar limpieza
ssh root@168.231.67.221 "/etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/cleanup-before-deploy.sh"

# 2. Ahora hacer deploy desde Dokploy dashboard
# (El deploy debería funcionar sin conflictos)

# 3. Si falla SSL, aplicar solución HTTP temporal:
ssh root@168.231.67.221 "
cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code
if [ ! -f 'letsencrypt/acme.json' ]; then
    echo '⚠️ SSL missing, applying HTTP fix...'
    mkdir -p letsencrypt
    sed 's/entrypoints=websecure/entrypoints=web/g; /tls.certresolver=letsencrypt/d' docker-compose.dokploy.yml > docker-compose.http-temp.yml
    docker-compose -f docker-compose.dokploy.yml down 2>/dev/null || true
    docker-compose -f docker-compose.http-temp.yml up -d
    echo '✅ HTTP mode activated'
fi
"
```

---

## 🔄 PREVENCIÓN FUTURA

### **Opción A: Manual (Recomendada para ahora)**
Ejecutar el script de limpieza ANTES de cada deploy desde Dokploy.

### **Opción B: Automatizada (Ideal)**
Configurar webhook en Dokploy que ejecute la limpieza automáticamente.

### **Opción C: Modificar Docker Compose**
Eliminar `container_name` fijos para evitar conflictos.

---

## 📋 COMANDOS DE EMERGENCIA ACTUALIZADOS

### **Si el deploy falla con conflicto de contenedores:**

```bash
# Limpieza de emergencia
ssh root@168.231.67.221 "
docker container rm -f \$(docker ps -aq --filter name=sancho) 2>/dev/null || true
docker volume rm \$(docker volume ls -q --filter name=sancho) 2>/dev/null || true  
docker network rm \$(docker network ls -q --filter name=sancho) 2>/dev/null || true
docker system prune -f
echo '✅ Emergency cleanup completed'
"

# Reintentar deploy desde Dokploy
```

### **Verificación post-deploy:**

```bash
# Verificar que todo funcione
ssh root@168.231.67.221 "
docker ps --filter name=sancho --format 'table {{.Names}}\t{{.Status}}'
curl -I http://www.sanchodistribuidora.com
curl -I http://www.sanchodistribuidora.com/api/
"
```

---

**📝 Problema identificado**: Conflicto de nombres de contenedores en deploy  
**⚡ Solución**: Script de limpieza automática antes de deploy  
**🎯 Resultado esperado**: Deploy exitoso sin conflictos  
**🔄 Mantenimiento**: Ejecutar limpieza antes de cada deploy importante
