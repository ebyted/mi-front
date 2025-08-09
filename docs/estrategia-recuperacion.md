# 🛡️ Estrategia de Recuperación - Sancho Distribuidora

## 📅 Estado Protegido: Agosto 9, 2025

### ✅ Configuración Funcionando Completamente

- **Frontend**: https://www.sanchodistribuidora.com ✅
- **API**: https://www.sanchodistribuidora.com/api/ ✅  
- **SSL/HTTPS**: Certificado válido hasta Aug 9, 2026 ✅
- **Backend**: Puerto 8030 funcionando correctamente ✅
- **Base de Datos**: PostgreSQL con credenciales maestro/maestro ✅
- **Contenedores**: Todos operativos (traefik, db, backend, frontend) ✅

---

## 🗃️ Ubicaciones de Backup

### 1. **Backup Local**
```
📁 Archivo: docker-compose.WORKING-BACKUP-Aug9-2025.yml
📍 Ubicación: C:\Users\dell\Documents\Proyectos\Maestro_inventario\mi-front\
```

### 2. **Backup VPS**
```
📁 Archivo: docker-compose.WORKING-BACKUP-Aug9-2025.yml
📍 Ubicación: /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code/
```

### 3. **Backup GitHub**
```
📁 Commit: 32316aa
📍 Mensaje: "✅ WORKING BACKUP: SSL funcionando + Puerto 8030 + Todos los servicios operativos - Aug 9, 2025"
📍 Repositorio: https://github.com/ebyted/mi-front
```

---

## 🔧 Comandos de Recuperación

### **Restaurar desde Backup Local**
```powershell
# Navegar al directorio del proyecto
cd "C:\Users\dell\Documents\Proyectos\Maestro_inventario\mi-front"

# Restaurar el archivo funcionando
copy "docker-compose.WORKING-BACKUP-Aug9-2025.yml" "docker-compose.dokploy.yml"

# Verificar el contenido
Get-Content "docker-compose.dokploy.yml"
```

### **Restaurar desde Backup VPS**
```bash
# Conectar al VPS y navegar al directorio
ssh root@168.231.67.221
cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code

# Restaurar el archivo funcionando
cp docker-compose.WORKING-BACKUP-Aug9-2025.yml docker-compose.dokploy.yml

# Verificar el contenido
cat docker-compose.dokploy.yml
```

### **Restaurar desde GitHub**
```bash
# Desde el directorio local del proyecto
git checkout 32316aa -- docker-compose.WORKING-BACKUP-Aug9-2025.yml

# Restaurar como archivo principal
copy "docker-compose.WORKING-BACKUP-Aug9-2025.yml" "docker-compose.dokploy.yml"
```

---

## 🚀 Proceso de Redespliegue Completo

### **1. Verificar Estado de Contenedores**
```bash
ssh root@168.231.67.221 "docker ps --filter name=sancho --format 'table {{.Names}}\t{{.Status}}'"
```

### **2. Restaurar Configuración (si es necesario)**
```bash
# Usar cualquiera de los comandos de recuperación arriba
```

### **3. Reconstruir y Desplegar**
```bash
ssh root@168.231.67.221 "
cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code && \
docker-compose -f docker-compose.dokploy.yml down && \
docker-compose -f docker-compose.dokploy.yml up -d --build
"
```

### **4. Verificar Funcionamiento**
```bash
# Verificar contenedores
ssh root@168.231.67.221 "docker ps --filter name=sancho"

# Verificar sitio web
curl -k -I https://www.sanchodistribuidora.com

# Verificar API
curl -k -I https://www.sanchodistribuidora.com/api/
```

---

## 📋 Configuración Crítica

### **Puertos Importantes**
- **Traefik**: 80 (HTTP) / 443 (HTTPS)
- **Backend Django**: 8030 (INTERNO)
- **Frontend Nginx**: 80 (INTERNO)
- **PostgreSQL**: 5432 (INTERNO)

### **Credenciales de Base de Datos**
```yaml
POSTGRES_DB: maestro_inventario
POSTGRES_USER: maestro
POSTGRES_PASSWORD: maestro
```

### **Configuración SSL**
- **Certificado**: Let's Encrypt automático
- **Email**: admin@sanchodistribuidora.com
- **Válido hasta**: Aug 9, 2026

### **Contenedores Críticos**
1. `sancho_traefik_v2` - Proxy reverso y SSL
2. `sancho_db_v2` - Base de datos PostgreSQL
3. `sancho_backend_v2` - API Django
4. `sancho_frontend_v2` - Frontend React

---

## ⚠️ Puntos de Atención

### **Problemas Conocidos Resueltos**
- ✅ **Puerto 8030**: Configurado correctamente en Dockerfile, docker-entrypoint.sh y docker-compose
- ✅ **Credenciales DB**: Estandarizadas a maestro/maestro en todo el stack
- ✅ **SSL**: Funcionando con certificado válido por 1 año
- ✅ **Sincronización**: Archivos local y VPS idénticos

### **Comandos de Diagnóstico**
```bash
# Estado de contenedores
ssh root@168.231.67.221 "docker ps --filter name=sancho"

# Logs de Traefik
ssh root@168.231.67.221 "docker logs sancho_traefik_v2 --tail 20"

# Logs de Backend
ssh root@168.231.67.221 "docker logs sancho_backend_v2 --tail 20"

# Verificar certificado SSL
echo | openssl s_client -connect www.sanchodistribuidora.com:443 -servername www.sanchodistribuidora.com 2>/dev/null | openssl x509 -noout -dates
```

---

## 📞 Información de Infraestructura

### **VPS Details**
- **IP**: 168.231.67.221
- **Usuario**: root
- **Plataforma**: Dokploy
- **Proyecto**: sancho-distribuidora-mi-front-npxvvf

### **GitHub Repository**
- **URL**: https://github.com/ebyted/mi-front
- **Branch**: main
- **Commit Funcionando**: 32316aa

### **Dominio**
- **Principal**: www.sanchodistribuidora.com
- **DNS**: Configurado y funcionando
- **SSL**: Válido y automático

---

## 🎯 Checklist de Recuperación

- [ ] Identificar el problema específico
- [ ] Verificar logs de contenedores
- [ ] Restaurar archivo de configuración desde backup
- [ ] Reconstruir contenedores si es necesario
- [ ] Verificar conectividad de red
- [ ] Probar frontend y API
- [ ] Confirmar SSL funcionando
- [ ] Documentar la resolución

---

**📝 Última actualización**: Agosto 9, 2025  
**🔄 Estado**: Todo funcionando perfectamente  
**📊 Próxima revisión**: Al realizar cambios importantes
