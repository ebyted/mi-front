# COMANDOS DE DEBUG PARA VPS
# ===========================

## 🔧 Comandos básicos para diagnosticar problemas

### 1. Estado de contenedores
docker-compose ps
docker-compose logs traefik --tail=20
docker-compose logs backend --tail=10
docker-compose logs frontend --tail=10

### 2. Verificar puertos
netstat -tlnp | grep -E ":80|:443|:8080"
ss -tlnp | grep -E ":80|:443|:8080"

### 3. Test de conectividad local
curl -I http://localhost:80
curl -I http://localhost:8080  # Dashboard Traefik
curl -I https://www.sanchodistribuidora.com
curl -I https://api.sanchodistribuidora.com

### 4. DNS
nslookup www.sanchodistribuidora.com
nslookup api.sanchodistribuidora.com
dig www.sanchodistribuidora.com

### 5. Reiniciar servicios
docker-compose down
docker-compose up -d
docker-compose restart traefik

### 6. Ver configuración de Traefik en tiempo real
# Acceder al dashboard: http://IP_DEL_VPS:8080

### 7. Verificar SSL/Certificados
docker volume ls | grep letsencrypt
docker volume inspect mi-front_traefik_letsencrypt

### 8. Firewall (Ubuntu/Debian)
ufw status
ufw allow 80
ufw allow 443
ufw allow 8080

### 9. IP del servidor
curl ifconfig.me
ip addr show

### 10. Verificar si los dominios apuntan al VPS
# Desde tu máquina local:
# nslookup www.sanchodistribuidora.com
# Debe devolver la IP de tu VPS

## 🚨 Problemas comunes y soluciones:

### ❌ "404 page not found"
# - Los dominios no apuntan a tu VPS
# - Traefik no puede resolver las rutas
# - Comandos: docker-compose logs traefik

### ❌ "Connection refused"
# - Puertos bloqueados por firewall
# - Docker no está ejecutándose
# - Comandos: netstat -tlnp | grep :80

### ❌ SSL/TLS errors
# - Let's Encrypt no puede validar dominio
# - Puertos 80/443 no accesibles desde internet
# - Comandos: docker-compose logs traefik | grep -i ssl

### ❌ Backend no responde
# - Django no se inició correctamente
# - Base de datos no conecta
# - Comandos: docker-compose logs backend

## 📝 Archivos importantes:
# - docker-compose.yml (configuración principal)
# - .env (variables de entorno)
# - logs/: docker-compose logs [servicio]

## 🌐 URLs de prueba una vez funcionando:
# - https://www.sanchodistribuidora.com (Frontend)
# - https://api.sanchodistribuidora.com (Backend API)
# - http://IP_VPS:8080 (Dashboard Traefik)
