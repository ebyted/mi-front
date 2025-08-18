# 🚀 Guía de Despliegue: Traefik + Aplicación

## 📋 Orden de Ejecución CORRECTO

### 1️⃣ PASO 1: Instalar Traefik (Solo una vez)

Traefik debe instalarse **PRIMERO** porque es el proxy reverso que maneja HTTPS y certificados SSL.

```bash
# Conectar al VPS
ssh root@168.231.74.214

# Ir a directorio donde está traefik-docker-compose.yml
cd /directorio/donde/esta/traefik-docker-compose.yml

# Instalar Traefik
docker-compose -f traefik-docker-compose.yml up -d

# Verificar que Traefik está ejecutándose
docker ps | grep traefik
```

**¿Cuándo ejecutar?**
- ✅ Primera instalación del sistema
- ✅ Después de un reinicio del servidor
- ✅ Si Traefik se detiene por algún motivo

### 2️⃣ PASO 2: Instalar/Actualizar Aplicación

La aplicación se instala **DESPUÉS** de Traefik, porque depende de él para HTTPS.

```bash
# Ya conectado al VPS
cd /etc/dokploy/compose/sancho-app-mifront-dsinfo/code

# Parar aplicación actual (si existe)
docker-compose down

# Actualizar código desde GitHub (si es necesario)
git pull origin main

# Construir y ejecutar aplicación
docker-compose up -d --build

# Verificar que todos los servicios están ejecutándose
docker-compose ps
```

**¿Cuándo ejecutar?**
- ✅ Después de instalar Traefik
- ✅ Cada actualización de código
- ✅ Cambios en docker-compose.yml
- ✅ Después de restaurar base de datos

## 🔄 Comandos Específicos para tu VPS

### Instalar Traefik (Una sola vez):
```bash
ssh root@168.231.74.214
cd /ruta/donde/esta/traefik-docker-compose.yml
docker-compose -f traefik-docker-compose.yml up -d
```

### Instalar/Actualizar Aplicación:
```bash
ssh root@168.231.74.214
cd /etc/dokploy/compose/sancho-app-mifront-dsinfo/code
docker-compose down
docker-compose up -d --build
```

## ⚠️ Notas Importantes

### Traefik:
- 🟢 **Ejecutar una sola vez** por servidor
- 🟢 **Siempre primero** antes que la aplicación
- 🟢 **Maneja puertos 80 y 443** para todo el servidor
- 🟢 **Genera certificados SSL** automáticamente

### Aplicación:
- 🔵 **Ejecutar después de Traefik**
- 🔵 **Cada vez que haya cambios** en el código
- 🔵 **No expone puertos directamente** (usa Traefik)
- 🔵 **Depende de Traefik** para ser accesible

## 🚨 Problemas Comunes

### Si HTTPS no funciona:
1. Verificar que Traefik está ejecutándose: `docker ps | grep traefik`
2. Ver logs de Traefik: `docker logs traefik`
3. Verificar certificados: `docker exec traefik ls -la /letsencrypt/`

### Si la aplicación no es accesible:
1. Verificar que Traefik está primero: `docker ps | grep traefik`
2. Verificar que la aplicación está en la misma red: `docker network ls`
3. Ver logs de la aplicación: `docker-compose logs`

## 🎯 Flujo Completo de Despliegue

```bash
# 1. Conectar al VPS
ssh root@168.231.74.214

# 2. Instalar Traefik (primera vez o si no está ejecutándose)
docker ps | grep traefik || docker-compose -f /ruta/traefik-docker-compose.yml up -d

# 3. Ir al directorio de la aplicación
cd /etc/dokploy/compose/sancho-app-mifront-dsinfo/code

# 4. Actualizar código (opcional)
git pull origin main

# 5. Desplegar aplicación
docker-compose down && docker-compose up -d --build

# 6. Verificar servicios
docker ps
curl -I https://www.sanchodistribuidora.com
```

## 📊 Estado Final Esperado

Después de ejecutar ambos, deberías tener:

```
CONTAINER ID   IMAGE                 STATUS    PORTS
xxxxx          traefik:v3.0          Up        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
xxxxx          sancho_backend_v2     Up        8030/tcp
xxxxx          sancho_frontend_v2    Up        80/tcp
xxxxx          postgres:15           Up        5432/tcp
```

URLs funcionando:
- ✅ https://www.sanchodistribuidora.com (Frontend)
- ✅ https://www.sanchodistribuidora.com/api/ (Backend)
- ✅ Redirección automática HTTP → HTTPS
