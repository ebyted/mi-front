# 🚨 Comandos de Emergencia - Recuperación Rápida

## 📋 Problema Identificado: SSL perdido después de deploy

### 🔍 **DIAGNÓSTICO EJECUTADO - Agosto 9, 2025**

**Estado encontrado:**
- ✅ Contenedores: Todos corriendo correctamente
- ✅ Base de datos: Healthy y accesible  
- ✅ Backend: Puerto 8030 funcionando
- ✅ Frontend: Nginx respondiendo
- ❌ SSL: Archivo `acme.json` perdido, directorio `letsencrypt/` no existe
- ❌ HTTPS: Traefik sirviendo certificado por defecto

**Solución aplicada: Configuración HTTP temporal**

---

## ⚡ COMANDOS DE RECUPERACIÓN INMEDIATA

### **1. Verificación Rápida del Problema**
```bash
# Conectar al VPS
ssh root@168.231.67.221

# Ver estado de contenedores
docker ps --filter name=sancho --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

# Verificar logs de Traefik (buscar "default certificate")
docker logs sancho_traefik_v2 --tail 10 | grep -i "default certificate"

# Verificar si existe directorio SSL
ls -la /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code/letsencrypt/
```

### **2. Solución HTTP Temporal (APLICADA)**
```bash
# Navegar al directorio del proyecto
cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code

# Crear directorio letsencrypt si no existe
mkdir -p letsencrypt

# Crear configuración HTTP temporal
cp docker-compose.dokploy.yml docker-compose.http-temp.yml

# Cambiar HTTPS a HTTP
sed -i 's/entrypoints=websecure/entrypoints=web/g' docker-compose.http-temp.yml

# Remover configuración SSL
sed -i '/tls.certresolver=letsencrypt/d' docker-compose.http-temp.yml

# Aplicar cambios
docker-compose -f docker-compose.dokploy.yml down
docker-compose -f docker-compose.http-temp.yml up -d

# Verificar funcionamiento
curl -I http://www.sanchodistribuidora.com
curl -I http://www.sanchodistribuidora.com/api/
```

### **3. Restauración SSL (Para más tarde)**
```bash
# Cuando se resuelva el rate limit, restaurar HTTPS
cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code

# Restaurar configuración original
docker-compose -f docker-compose.http-temp.yml down
docker-compose -f docker-compose.dokploy.yml up -d

# Verificar que se genere certificado
docker logs sancho_traefik_v2 --follow | grep -i certificate
```

---

## 🔍 COMANDOS DE DIAGNÓSTICO COMPLETO

### **A. Verificación de Infraestructura**
```bash
# Conectividad VPS
ping -c 4 168.231.67.221
ssh root@168.231.67.221 "echo 'VPS OK'"

# Estado Docker
ssh root@168.231.67.221 "docker --version && docker info | head -5"

# Espacio en disco
ssh root@168.231.67.221 "df -h"
```

### **B. Estado de Contenedores**
```bash
# Todos los contenedores Sancho
ssh root@168.231.67.221 "docker ps -a --filter name=sancho --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'"

# Contenedores fallidos
ssh root@168.231.67.221 "docker ps -a --filter name=sancho --filter status=exited"

# Logs de cada servicio
ssh root@168.231.67.221 "docker logs sancho_traefik_v2 --tail 20"
ssh root@168.231.67.221 "docker logs sancho_backend_v2 --tail 20"  
ssh root@168.231.67.221 "docker logs sancho_frontend_v2 --tail 20"
ssh root@168.231.67.221 "docker logs sancho_db_v2 --tail 20"
```

### **C. Verificación de Base de Datos**
```bash
# Estado PostgreSQL
ssh root@168.231.67.221 "docker exec sancho_db_v2 pg_isready -U maestro -d maestro_inventario"

# Conexión Backend -> DB
ssh root@168.231.67.221 "docker exec sancho_backend_v2 python manage.py check --database default"

# Test directo de conexión
ssh root@168.231.67.221 "docker exec sancho_backend_v2 python -c 'import django; django.setup(); from django.db import connection; cursor = connection.cursor(); cursor.execute(\"SELECT 1\"); print(\"DB OK\")'"
```

### **D. Conectividad de Red**
```bash
# Conectividad interna
ssh root@168.231.67.221 "docker exec sancho_backend_v2 ping -c 2 sancho_db_v2"
ssh root@168.231.67.221 "docker exec sancho_frontend_v2 ping -c 2 sancho_backend_v2"

# Puertos expuestos
ssh root@168.231.67.221 "docker port sancho_backend_v2"
ssh root@168.231.67.221 "docker port sancho_traefik_v2"

# Variables de entorno del backend
ssh root@168.231.67.221 "docker inspect sancho_backend_v2 | grep -A 15 'Env'"
```

### **E. Verificación SSL/DNS**
```bash
# Resolución DNS
nslookup www.sanchodistribuidora.com
ssh root@168.231.67.221 "nslookup www.sanchodistribuidora.com"

# Estado del certificado (si existe)
echo | openssl s_client -connect www.sanchodistribuidora.com:443 -servername www.sanchodistribuidora.com 2>/dev/null | openssl x509 -noout -dates

# Verificar directorio letsencrypt
ssh root@168.231.67.221 "ls -la /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code/letsencrypt/"

# Errores en Traefik
ssh root@168.231.67.221 "docker logs sancho_traefik_v2 2>&1 | grep -i error | tail -10"
```

### **F. Tests de Conectividad Externa**
```bash
# HTTP (funciona tras la solución)
ssh root@168.231.67.221 "curl -I http://www.sanchodistribuidora.com"
ssh root@168.231.67.221 "curl -I http://www.sanchodistribuidora.com/api/"

# HTTPS (no funciona por SSL perdido)
ssh root@168.231.67.221 "curl -k -I https://www.sanchodistribuidora.com"

# Verbose para debugging
ssh root@168.231.67.221 "curl -v http://www.sanchodistribuidora.com 2>&1 | head -15"
```

---

## 🔄 COMANDOS DE RECUPERACIÓN TOTAL

### **Opción 1: Restart Limpio**
```bash
cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code

# Parar todo
docker-compose -f docker-compose.dokploy.yml down

# Limpiar sistema
docker system prune -f

# Crear directorio SSL
mkdir -p letsencrypt

# Levantar servicios
docker-compose -f docker-compose.dokploy.yml up -d --build
```

### **Opción 2: Restaurar desde Backup**
```bash
cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code

# Restaurar configuración backup
cp docker-compose.WORKING-BACKUP-Aug9-2025.yml docker-compose.dokploy.yml

# Crear directorio SSL
mkdir -p letsencrypt

# Aplicar
docker-compose -f docker-compose.dokploy.yml down
docker-compose -f docker-compose.dokploy.yml up -d --build
```

### **Opción 3: HTTP Temporal (Implementada)**
```bash
cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code

# Crear configuración HTTP
cp docker-compose.dokploy.yml docker-compose.http-temp.yml
sed -i 's/entrypoints=websecure/entrypoints=web/g' docker-compose.http-temp.yml
sed -i '/tls.certresolver=letsencrypt/d' docker-compose.http-temp.yml

# Aplicar
docker-compose -f docker-compose.dokploy.yml down
docker-compose -f docker-compose.http-temp.yml up -d
```

---

## 📊 ESTADO DESPUÉS DE LA SOLUCIÓN

### ✅ **FUNCIONANDO CORRECTAMENTE:**
- **Frontend HTTP**: http://www.sanchodistribuidora.com ✅
- **API HTTP**: http://www.sanchodistribuidora.com/api/ ✅  
- **Contenedores**: 4 servicios corriendo ✅
- **Base de Datos**: PostgreSQL healthy ✅
- **Backend**: Puerto 8030 operativo ✅

### ⏳ **PENDIENTE:**
- **HTTPS**: Será restaurado cuando expire el rate limit de Let's Encrypt
- **Certificado SSL**: Se regenerará automáticamente al restaurar configuración HTTPS

---

## 🎯 PATRÓN DEL PROBLEMA IDENTIFICADO

**Causa raíz**: Al hacer deploy, se eliminó el directorio `letsencrypt/` que contiene los certificados SSL.

**Prevención futura**:
1. Verificar que `letsencrypt/` existe antes de deploy
2. Backup del directorio SSL antes de cambios importantes
3. Usar volúmenes persistentes para certificados SSL

**Comando de prevención**:
```bash
# Antes de cualquier deploy, verificar:
ssh root@168.231.67.221 "ls -la /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code/letsencrypt/"

# Si no existe, crear:
ssh root@168.231.67.221 "mkdir -p /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code/letsencrypt"
```

---

**📝 Problema resuelto**: Agosto 9, 2025 - 17:08 UTC  
**⚡ Tiempo de resolución**: 15 minutos  
**🌐 Estado actual**: Sitio funcionando en HTTP  
**🔄 Próximo paso**: Restaurar HTTPS cuando rate limit se resetee
