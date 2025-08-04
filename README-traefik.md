# 🚀 Maestro Inventario con Traefik

## 📋 Configuración Completa con Reverse Proxy

Esta configuración incluye **Traefik** como reverse proxy para manejar SSL automático, múltiples dominios y balanceador de carga.

## 🏗️ Arquitectura

```
Internet → Traefik (Reverse Proxy) → Servicios
    ↓
    ├── Frontend (React) → https://www.sanchodistribuidora.com
    ├── Backend API (Django) → https://api.sanchodistribuidora.com
    ├── Dashboard Traefik → https://traefik.sanchodistribuidora.com
    └── Base de Datos PostgreSQL (interno)
```

## 🔧 Servicios Incluidos

| Servicio | Puerto | Dominio | Descripción |
|----------|--------|---------|-------------|
| **Traefik** | 80, 443, 8080 | traefik.sanchodistribuidora.com | Reverse proxy y SSL |
| **Frontend** | - | www.sanchodistribuidora.com | Aplicación React |
| **Backend** | - | api.sanchodistribuidora.com | API Django REST |
| **PostgreSQL** | - | (interno) | Base de datos |

## ⚙️ Características

### ✅ **SSL Automático**
- Certificados Let's Encrypt automáticos
- Renovación automática
- Redirección HTTP → HTTPS

### ✅ **Múltiples Dominios**
- Frontend: `www.sanchodistribuidora.com`
- API: `api.sanchodistribuidora.com`
- Dashboard: `traefik.sanchodistribuidora.com`
- Redirección: `sanchodistribuidora.com` → `www.sanchodistribuidora.com`

### ✅ **Seguridad**
- CORS configurado para la API
- Dashboard protegido con autenticación básica
- Headers de seguridad

### ✅ **Monitoreo**
- Dashboard de Traefik con métricas
- Logs centralizados
- Health checks automáticos

## 🚀 Deployment Rápido

### Opción 1: Script Automático (Windows)
```powershell
.\deploy-traefik.ps1
```

### Opción 2: Script Automático (Linux)
```bash
chmod +x deploy-traefik.sh
./deploy-traefik.sh
```

### Opción 3: Manual
```bash
# Crear red
docker network create maestro_network

# Iniciar servicios
docker-compose up -d

# Ver estado
docker-compose ps
```

## 📝 Configuración DNS Requerida

Configura estos registros A en tu proveedor DNS:

```
Tipo    Nombre                          Valor
A       www.sanchodistribuidora.com     168.231.67.221
A       api.sanchodistribuidora.com     168.231.67.221
A       traefik.sanchodistribuidora.com 168.231.67.221
A       sanchodistribuidora.com         168.231.67.221
```

## 🔐 Accesos

### Dashboard de Traefik
- **URL**: https://traefik.sanchodistribuidora.com
- **Usuario**: `admin`
- **Contraseña**: `admin123`

### Aplicación
- **Frontend**: https://www.sanchodistribuidora.com
- **API**: https://api.sanchodistribuidora.com/api/

## 🛠️ Comandos Útiles

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f traefik
docker-compose logs -f frontend
docker-compose logs -f backend

# Reiniciar servicios
docker-compose restart

# Parar todos los servicios
docker-compose down

# Parar y eliminar volúmenes
docker-compose down -v

# Ver estado de servicios
docker-compose ps

# Verificar certificados SSL
docker-compose exec traefik cat /letsencrypt/acme.json

# Acceder a contenedor
docker-compose exec backend bash
docker-compose exec frontend sh
```

## 🔧 Personalización

### Cambiar Dominios
Edita en `docker-compose.yml`:
```yaml
# Cambiar todas las referencias de sanchodistribuidora.com
# por tu dominio
```

### Cambiar Credenciales Dashboard
```bash
# Generar nueva contraseña hasheada
htpasswd -nb admin nuevacontraseña

# Actualizar en docker-compose.yml
traefik.http.middlewares.dashboard-auth.basicauth.users=admin:$$hash$$
```

### Configurar Email Let's Encrypt
```yaml
# En la sección de Traefik
- --certificatesresolvers.letsencrypt.acme.email=tu@email.com
```

## 🐛 Troubleshooting

### SSL no funciona
```bash
# Verificar logs de Traefik
docker-compose logs traefik | grep -i "acme\|certificate"

# Verificar permisos del archivo ACME
docker-compose exec traefik ls -la /letsencrypt/
```

### Servicios no accesibles
```bash
# Verificar red de Docker
docker network inspect maestro_network

# Verificar labels de Traefik
docker-compose config
```

### Dashboard no accesible
```bash
# Verificar que el puerto 8080 esté abierto
netstat -tlnp | grep 8080

# Verificar configuración DNS
nslookup traefik.sanchodistribuidora.com
```

## 📊 Monitoreo

### Métricas Disponibles
- Requests por segundo
- Latencia de respuesta
- Estado de certificados SSL
- Uptime de servicios

### Logs Centralizados
```bash
# Ver todos los logs en tiempo real
docker-compose logs -f --tail=100

# Filtrar por servicio
docker-compose logs -f traefik | grep ERROR
```

## 🔄 Actualizaciones

### Actualizar Traefik
```bash
docker-compose pull traefik
docker-compose up -d traefik
```

### Actualizar aplicación
```bash
docker-compose build --no-cache
docker-compose up -d
```

## 📞 Soporte

Si encuentras problemas:

1. Verifica que los DNS estén configurados correctamente
2. Revisa los logs: `docker-compose logs -f`
3. Verifica que los puertos 80 y 443 estén abiertos
4. Confirma que Let's Encrypt puede acceder a tu dominio

---

**🎉 ¡Tu aplicación está lista para producción con SSL automático y alta disponibilidad!**
