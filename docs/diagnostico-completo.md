# 🩺 Diagnóstico Completo del Sistema - Sancho Distribuidora

## 📋 Lista de Verificación Completa

Este documento contiene todos los comandos necesarios para diagnosticar problemas cuando el sitio https://www.sanchodistribuidora.com no funciona.

---

## 🔍 1. VERIFICACIÓN DE INFRAESTRUCTURA BASE

### **1.1 Conectividad al VPS**
```bash
# Verificar que el VPS responda
ping -c 4 168.231.67.221

# Verificar acceso SSH
ssh root@168.231.67.221 "echo 'VPS accessible'"
```

### **1.2 Estado del Servidor Docker**
```bash
# Verificar que Docker esté funcionando
ssh root@168.231.67.221 "docker --version && docker info | head -10"

# Verificar espacio en disco
ssh root@168.231.67.221 "df -h"

# Verificar memoria
ssh root@168.231.67.221 "free -h"
```

---

## 🐳 2. VERIFICACIÓN DE CONTENEDORES

### **2.1 Estado General de Contenedores**
```bash
# Ver todos los contenedores relacionados con Sancho
ssh root@168.231.67.221 "docker ps -a --filter name=sancho --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'"

# Ver contenedores que están corriendo
ssh root@168.231.67.221 "docker ps --filter name=sancho"

# Ver contenedores que han fallado
ssh root@168.231.67.221 "docker ps -a --filter name=sancho --filter status=exited"
```

### **2.2 Logs de Contenedores**
```bash
# Logs de Traefik (Proxy/SSL)
ssh root@168.231.67.221 "docker logs sancho_traefik_v2 --tail 50"

# Logs del Backend (Django)
ssh root@168.231.67.221 "docker logs sancho_backend_v2 --tail 50"

# Logs del Frontend (React/Nginx)
ssh root@168.231.67.221 "docker logs sancho_frontend_v2 --tail 50"

# Logs de la Base de Datos
ssh root@168.231.67.221 "docker logs sancho_db_v2 --tail 50"
```

### **2.3 Inspección Detallada de Contenedores**
```bash
# Verificar configuración de red del backend
ssh root@168.231.67.221 "docker inspect sancho_backend_v2 | grep -A 10 'NetworkSettings'"

# Verificar puertos expuestos
ssh root@168.231.67.221 "docker port sancho_backend_v2"
ssh root@168.231.67.221 "docker port sancho_frontend_v2"
ssh root@168.231.67.221 "docker port sancho_traefik_v2"

# Verificar variables de entorno del backend
ssh root@168.231.67.221 "docker inspect sancho_backend_v2 | grep -A 20 'Env'"
```

---

## 🗄️ 3. VERIFICACIÓN DE BASE DE DATOS

### **3.1 Estado de PostgreSQL**
```bash
# Verificar que PostgreSQL esté corriendo
ssh root@168.231.67.221 "docker exec sancho_db_v2 pg_isready -U maestro -d maestro_inventario"

# Verificar logs de PostgreSQL
ssh root@168.231.67.221 "docker logs sancho_db_v2 --tail 30"

# Verificar conexiones activas
ssh root@168.231.67.221 "docker exec sancho_db_v2 psql -U maestro -d maestro_inventario -c 'SELECT count(*) FROM pg_stat_activity;'"
```

### **3.2 Conectividad Backend -> Base de Datos**
```bash
# Verificar que el backend pueda conectar a la DB desde dentro del contenedor
ssh root@168.231.67.221 "docker exec sancho_backend_v2 python manage.py check --database default"

# Verificar migraciones de Django
ssh root@168.231.67.221 "docker exec sancho_backend_v2 python manage.py showmigrations"

# Test de conexión directa a la DB desde el backend
ssh root@168.231.67.221 "docker exec sancho_backend_v2 python -c 'import django; django.setup(); from django.db import connection; cursor = connection.cursor(); cursor.execute(\"SELECT 1\"); print(\"DB Connection OK\")'"
```

### **3.3 Estructura de Base de Datos**
```bash
# Verificar que las tablas principales existan
ssh root@168.231.67.221 "docker exec sancho_db_v2 psql -U maestro -d maestro_inventario -c '\dt'"

# Verificar usuarios de Django
ssh root@168.231.67.221 "docker exec sancho_db_v2 psql -U maestro -d maestro_inventario -c 'SELECT count(*) FROM core_user;'"
```

---

## 🌐 4. VERIFICACIÓN DE RED Y CONECTIVIDAD

### **4.1 Conectividad Interna**
```bash
# Verificar que los contenedores se vean entre sí
ssh root@168.231.67.221 "docker exec sancho_backend_v2 ping -c 2 sancho_db_v2"
ssh root@168.231.67.221 "docker exec sancho_frontend_v2 ping -c 2 sancho_backend_v2"

# Verificar que el backend responda internamente
ssh root@168.231.67.221 "docker exec sancho_traefik_v2 wget -qO- http://sancho_backend_v2:8030/api/ | head -5"
```

### **4.2 Puertos y Servicios**
```bash
# Verificar que los puertos estén abiertos en el VPS
ssh root@168.231.67.221 "netstat -tlnp | grep ':80\|:443\|:8030'"

# Verificar procesos escuchando
ssh root@168.231.67.221 "ss -tlnp | grep ':80\|:443'"
```

---

## 🔐 5. VERIFICACIÓN DE SSL Y DOMINIOS

### **5.1 Resolución DNS**
```bash
# Verificar que el dominio resuelva correctamente
nslookup www.sanchodistribuidora.com
dig www.sanchodistribuidora.com

# Verificar desde el VPS
ssh root@168.231.67.221 "nslookup www.sanchodistribuidora.com"
```

### **5.2 Certificados SSL**
```bash
# Verificar certificado actual
echo | openssl s_client -connect www.sanchodistribuidora.com:443 -servername www.sanchodistribuidora.com 2>/dev/null | openssl x509 -noout -dates

# Verificar detalles del certificado
echo | openssl s_client -connect www.sanchodistribuidora.com:443 -servername www.sanchodistribuidora.com 2>/dev/null | openssl x509 -noout -subject -issuer

# Verificar archivo de certificados de Traefik
ssh root@168.231.67.221 "ls -la /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code/letsencrypt/"
ssh root@168.231.67.221 "cat /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code/letsencrypt/acme.json | jq '.letsencrypt.Certificates | length'"
```

### **5.3 Configuración de Traefik**
```bash
# Verificar que Traefik detecte los servicios
ssh root@168.231.67.221 "docker logs sancho_traefik_v2 2>&1 | grep -E 'Creating (server|load-balancer)' | tail -10"

# Verificar errores en Traefik
ssh root@168.231.67.221 "docker logs sancho_traefik_v2 2>&1 | grep -i error | tail -10"
```

---

## 🌍 6. VERIFICACIÓN DE ACCESO EXTERNO

### **6.1 Tests de Conectividad HTTP/HTTPS**
```bash
# Test básico HTTPS
curl -k -I https://www.sanchodistribuidora.com

# Test del API
curl -k -I https://www.sanchodistribuidora.com/api/

# Test con verbose para ver detalles
curl -k -v https://www.sanchodistribuidora.com 2>&1 | head -20

# Test desde el VPS
ssh root@168.231.67.221 "curl -k -I https://www.sanchodistribuidora.com"
ssh root@168.231.67.221 "curl -k -I https://www.sanchodistribuidora.com/api/"
```

### **6.2 Verificación de Headers**
```bash
# Verificar headers de respuesta
curl -k -I https://www.sanchodistribuidora.com -H "Host: www.sanchodistribuidora.com"

# Verificar redirecciones
curl -k -L -I https://www.sanchodistribuidora.com
```

---

## 📁 7. VERIFICACIÓN DE CONFIGURACIÓN

### **7.1 Archivos de Configuración**
```bash
# Verificar docker-compose actual
ssh root@168.231.67.221 "cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code && cat docker-compose.dokploy.yml"

# Verificar Dockerfile
ssh root@168.231.67.221 "cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code && cat Dockerfile | grep -E 'EXPOSE|ENTRYPOINT'"

# Verificar script de entrada
ssh root@168.231.67.221 "cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code && cat docker-entrypoint.sh | grep -E '8030|runserver'"
```

### **7.2 Estado del Proyecto Dokploy**
```bash
# Verificar directorio del proyecto
ssh root@168.231.67.221 "ls -la /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code/"

# Verificar último despliegue
ssh root@168.231.67.221 "cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code && git log --oneline -5"
```

---

## 🔄 8. COMANDOS DE RECUPERACIÓN RÁPIDA

### **8.1 Restart Completo**
```bash
# Parar todos los servicios
ssh root@168.231.67.221 "cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code && docker-compose -f docker-compose.dokploy.yml down"

# Limpiar contenedores e imágenes
ssh root@168.231.67.221 "docker system prune -f"

# Levantar servicios
ssh root@168.231.67.221 "cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code && docker-compose -f docker-compose.dokploy.yml up -d --build"
```

### **8.2 Restaurar Backup**
```bash
# Restaurar configuración desde backup
ssh root@168.231.67.221 "cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code && cp docker-compose.WORKING-BACKUP-Aug9-2025.yml docker-compose.dokploy.yml"

# Verificar diferencias
ssh root@168.231.67.221 "cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code && diff docker-compose.dokploy.yml docker-compose.WORKING-BACKUP-Aug9-2025.yml"
```

---

## 📊 9. RESUMEN DE VERIFICACIÓN

### **Estado Esperado cuando Todo Funciona:**
- ✅ 4 contenedores corriendo: sancho_traefik_v2, sancho_db_v2, sancho_backend_v2, sancho_frontend_v2
- ✅ PostgreSQL healthy y accesible
- ✅ Backend en puerto 8030 respondiendo
- ✅ Traefik detectando servicios backend y frontend
- ✅ SSL válido y certificado no expirado
- ✅ https://www.sanchodistribuidora.com responde 200
- ✅ https://www.sanchodistribuidora.com/api/ responde 200

### **Señales de Problemas Comunes:**
- ❌ Contenedores en estado "Exited" o "Restarting"
- ❌ Error de conexión a base de datos
- ❌ Puerto 8030 no expuesto o incorrecto
- ❌ Traefik no encuentra backend (404 errors)
- ❌ Certificado SSL expirado o rate limited
- ❌ DNS no resolviendo correctamente

---

## 🚨 ORDEN DE DIAGNÓSTICO RECOMENDADO

1. **Verificar conectividad VPS** (Sección 1)
2. **Estado de contenedores** (Sección 2.1)
3. **Logs de contenedores** (Sección 2.2)
4. **Estado de base de datos** (Sección 3.1)
5. **Conectividad externa** (Sección 6.1)
6. **Certificados SSL** (Sección 5.2)
7. **Configuración detallada** (Sección 7)

**💡 Tip:** Ejecuta los comandos en este orden y documenta los resultados que muestren errores.

---

**📝 Creado**: Agosto 9, 2025  
**🔄 Uso**: Ejecutar cuando https://www.sanchodistribuidora.com no funcione  
**⚡ Actualizar**: Después de resolver nuevos tipos de problemas
