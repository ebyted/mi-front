# 📋 Historial de Problemas y Soluciones

## 🎯 Problemas Originales Resueltos

### 1. **"No sale el nombre de almacén"** ✅ RESUELTO
**Problema**: El frontend no mostraba nombres de almacenes  
**Causa**: Falta de endpoint específico para obtener stock por almacén  
**Solución**: Creado `SimpleProductWarehouseStockViewSet` en Django  
**Archivo modificado**: `core/views.py`  
**Fecha**: Agosto 9, 2025

### 2. **Despliegue en VPS con Dokploy** ✅ RESUELTO
**Problema**: Migrar de despliegue manual a Dokploy automático  
**Causa**: Configuración manual previa incompatible  
**Solución**: Migración completa a docker-compose.dokploy.yml  
**Archivo clave**: `docker-compose.dokploy.yml`  
**Fecha**: Agosto 9, 2025

### 3. **Conflicto de puertos del backend** ✅ RESUELTO
**Problema**: Backend exponiendo puerto 8030 pero Traefik buscando 8000  
**Causa**: Inconsistencia en configuración de puertos  
**Solución**: Estandarizar todo a puerto 8030  
**Archivos modificados**: 
- `Dockerfile` (EXPOSE 8030)
- `docker-entrypoint.sh` (runserver 0.0.0.0:8030)
- `docker-compose.dokploy.yml` (loadbalancer.server.port=8030)  
**Fecha**: Agosto 9, 2025

### 4. **Credenciales de base de datos inconsistentes** ✅ RESUELTO
**Problema**: Mezcla de credenciales postgres/postgres y maestro/maestro  
**Causa**: Configuraciones heredadas de deployments anteriores  
**Solución**: Estandarizar todo a maestro/maestro  
**Variables afectadas**: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_USER`, `DATABASE_PASSWORD`  
**Fecha**: Agosto 9, 2025

### 5. **SSL/HTTPS no funcionando** ✅ RESUELTO
**Problema**: Sitio sin certificado SSL válido  
**Causa**: Rate limiting de Let's Encrypt  
**Solución**: Esperar reset automático y configuración correcta  
**Estado**: Certificado válido hasta Aug 9, 2026  
**Fecha**: Agosto 9, 2025

---

## 🔄 Evolución de la Configuración

### **Fase 1: Manual Deployment**
- Despliegue manual en VPS
- Configuraciones dispersas
- Sin automatización

### **Fase 2: Dokploy Migration** 
- Migración a docker-compose
- Integración con GitHub
- Automatización del despliegue

### **Fase 3: Standardization**
- Puerto único 8030
- Credenciales maestro/maestro
- SSL automático funcionando

### **Fase 4: Current State** ✅
- Todo funcionando perfectamente
- SSL válido por 1 año
- Backups múltiples
- Documentación completa

---

## 🛠️ Comandos de Diagnóstico Utilizados

### **Verificación de Contenedores**
```bash
ssh root@168.231.67.221 "docker ps --filter name=sancho --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
```

### **Logs de Servicios**
```bash
ssh root@168.231.67.221 "docker logs sancho_traefik_v2 --tail 20"
ssh root@168.231.67.221 "docker logs sancho_backend_v2 --tail 20"
```

### **Verificación SSL**
```bash
echo | openssl s_client -connect www.sanchodistribuidora.com:443 -servername www.sanchodistribuidora.com 2>/dev/null | openssl x509 -noout -dates
```

### **Test de Conectividad**
```bash
curl -k -I https://www.sanchodistribuidora.com
curl -k -I https://www.sanchodistribuidora.com/api/
```

---

## 🚨 Patrones de Problemas Identificados

### **1. Inconsistencia de Puertos**
- **Síntoma**: 404 en API, contenedores corriendo pero no responden
- **Diagnóstico**: Verificar `docker port <container>`
- **Prevención**: Mantener coherencia en Dockerfile, entrypoint y docker-compose

### **2. Credenciales Mezcladas**
- **Síntoma**: Connection refused a base de datos
- **Diagnóstico**: Verificar variables de entorno
- **Prevención**: Usar single source of truth para credenciales

### **3. SSL Rate Limiting**
- **Síntoma**: Certificado no se genera, errors 429 en logs
- **Diagnóstico**: Revisar logs de Traefik
- **Prevención**: No recrear certificados innecesariamente

### **4. Dependencias de Servicios**
- **Síntoma**: Servicios iniciando antes de dependencias
- **Diagnóstico**: Verificar `depends_on` en docker-compose
- **Prevención**: Healthchecks y depends_on correctos

---

## 📈 Métricas de Éxito

### **Antes de la Resolución**
- ❌ Almacenes sin nombre
- ❌ Puerto 8000/8030 inconsistente  
- ❌ SSL no funcionando
- ❌ Credenciales mixtas
- ❌ Despliegue manual

### **Después de la Resolución**
- ✅ Frontend completo funcionando
- ✅ Puerto 8030 consistente
- ✅ SSL válido por 1 año
- ✅ Credenciales maestro/maestro uniformes
- ✅ Despliegue automático con Dokploy

### **Tiempo de Resolución**
- **Problema inicial**: "No sale el nombre de almacén"
- **Tiempo total**: ~4 horas
- **Problemas adicionales resueltos**: 4 problemas críticos
- **Estado final**: Sistema 100% funcional

---

## 🎓 Lecciones Aprendidas

1. **Consistencia es clave**: Todos los archivos deben usar la misma configuración
2. **Backups múltiples**: Local, VPS y GitHub para máxima protección
3. **Documentación crítica**: Sin docs, es fácil perder configuraciones funcionando
4. **Rate limits**: Let's Encrypt tiene límites, planificar accordingly
5. **Healthchecks**: Fundamentales para servicios que dependen de base de datos

---

## 🔮 Prevención Futura

### **Checklist antes de cambios**
- [ ] Backup del estado actual funcionando
- [ ] Verificar consistencia de puertos en todos los archivos  
- [ ] Confirmar credenciales uniformes
- [ ] Probar en local antes de despliegue
- [ ] Verificar dependencias de servicios

### **Monitoreo recomendado**
- Verificación SSL mensual
- Logs de Traefik semanales  
- Estado de contenedores diario
- Backup de configuración antes de cambios

---

**📝 Creado**: Agosto 9, 2025  
**🔄 Última actualización**: Agosto 9, 2025  
**📊 Estado**: Todos los problemas resueltos, sistema estable
