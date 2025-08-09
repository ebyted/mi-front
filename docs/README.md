# 📚 Documentación - Sancho Distribuidora

Este directorio contiene toda la documentación crítica para mantener y recuperar el sistema de inventario.

## 📄 Archivos de Documentación

### 🛡️ [Estrategia de Recuperación](./estrategia-recuperacion.md)
**Propósito**: Procedimientos completos para restaurar el sistema funcionando  
**Incluye**: 
- Ubicaciones de backups (local, VPS, GitHub)
- Comandos de restauración paso a paso
- Checklist de verificación
- Información de infraestructura

### 🔧 [Configuración Técnica](./configuracion-tecnica.md)
**Propósito**: Detalles técnicos exactos de la configuración funcionando  
**Incluye**:
- Contenido completo de docker-compose.dokploy.yml
- Puntos críticos de configuración (puertos, SSL, DB)
- Archivos relacionados (Dockerfile, entrypoint)
- Comandos de verificación

### 📋 [Historial de Problemas](./historial-problemas.md)
**Propósito**: Registro completo de problemas resueltos y soluciones  
**Incluye**:
- Problemas originales y sus soluciones
- Evolución de la configuración
- Patrones de problemas identificados
- Lecciones aprendidas

## 🎯 Estado Actual del Sistema

### ✅ **SISTEMA FUNCIONANDO PERFECTAMENTE**

**URLs Operativas:**
- **Frontend**: https://www.sanchodistribuidora.com
- **API**: https://www.sanchodistribuidora.com/api/

**Servicios Activos:**
- ✅ Traefik (Proxy + SSL)
- ✅ PostgreSQL Database
- ✅ Django Backend (Puerto 8030)
- ✅ React Frontend

**Configuración Clave:**
- **SSL**: Válido hasta Agosto 9, 2026
- **Puerto Backend**: 8030 (consistente)
- **DB Credentials**: maestro/maestro
- **Archivo Oficial**: docker-compose.dokploy.yml

## 🚨 En Caso de Emergencia

### **Paso 1: Identificar el Problema**
```bash
# Verificar estado de contenedores
ssh root@168.231.67.221 "docker ps --filter name=sancho"

# Verificar conectividad
curl -k -I https://www.sanchodistribuidora.com
```

### **Paso 2: Consultar Documentación**
1. **Si hay problemas de conectividad** → Ver [Estrategia de Recuperación](./estrategia-recuperacion.md)
2. **Si necesitas detalles técnicos** → Ver [Configuración Técnica](./configuracion-tecnica.md)  
3. **Si es un problema conocido** → Ver [Historial de Problemas](./historial-problemas.md)

### **Paso 3: Restaurar si es Necesario**
```bash
# Desde backup local
copy "docker-compose.WORKING-BACKUP-Aug9-2025.yml" "docker-compose.dokploy.yml"

# Desde backup VPS  
ssh root@168.231.67.221 "cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code && cp docker-compose.WORKING-BACKUP-Aug9-2025.yml docker-compose.dokploy.yml"
```

## 🔄 Mantenimiento Recomendado

### **Semanal**
- [ ] Verificar estado de contenedores
- [ ] Revisar logs de Traefik y Backend
- [ ] Confirmar conectividad frontend y API

### **Mensual**  
- [ ] Verificar validez del certificado SSL
- [ ] Crear backup de configuración actualizada
- [ ] Revisar espacio en disco del VPS

### **Antes de Cambios Importantes**
- [ ] Crear backup del estado actual
- [ ] Documentar cambios realizados
- [ ] Verificar consistencia de puertos/credenciales
- [ ] Probar en entorno local si es posible

## 📞 Información de Contacto

### **Infraestructura**
- **VPS IP**: 168.231.67.221
- **Usuario**: root
- **Plataforma**: Dokploy
- **Dominio**: www.sanchodistribuidora.com

### **Repositorio**
- **GitHub**: https://github.com/ebyted/mi-front
- **Branch Principal**: main
- **Commit Funcionando**: 32316aa

## 📈 Métricas de Éxito

- ✅ **Uptime**: Sistema estable desde Agosto 9, 2025
- ✅ **SSL**: Certificado válido y renovación automática
- ✅ **Performance**: Todos los servicios respondiendo < 1s
- ✅ **Backup**: Triple redundancia (local, VPS, GitHub)
- ✅ **Documentación**: 100% de procedimientos documentados

---

**📝 Última actualización**: Agosto 9, 2025  
**👤 Mantenido por**: Equipo de desarrollo  
**🔄 Próxima revisión**: Al realizar cambios importantes

## 🌟 Nota Importante

Esta documentación fue creada cuando **todo estaba funcionando perfectamente**. Es el punto de referencia dorado para cualquier recuperación futura. Mantén siempre estos archivos actualizados cuando hagas cambios exitosos.
