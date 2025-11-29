# 🔄 Sistema de Sincronización Automática de Stock

## ✅ Implementación Completada

Se ha implementado un sistema completo para mantener actualizada la tabla `core_productwarehousestock` automáticamente.

## 🎯 ¿Qué hace?

### **1. Sincronización Automática en Tiempo Real**
Cada vez que hay un movimiento de inventario (venta, compra, ajuste, transferencia), el sistema:
- ✅ Detecta el cambio automáticamente
- ✅ Calcula el stock real basado en TODOS los movimientos
- ✅ Actualiza `ProductWarehouseStock` instantáneamente

### **2. Creación Automática de Registros**
Cuando se crea un nuevo producto:
- ✅ Automáticamente se crean registros en TODOS los almacenes
- ✅ Stock inicial en 0
- ✅ Listo para recibir movimientos

### **3. Limpieza Automática**
Cuando se elimina un producto:
- ✅ Se eliminan automáticamente todos sus registros de stock
- ✅ No quedan registros huérfanos

## 🚀 Cómo Inicializar (PRIMERA VEZ)

### **Opción A: Script Interactivo (Recomendado)**
```bash
# En desarrollo local
python inicializar_stock.py

# En producción (dentro del contenedor Docker)
docker exec -it <container_name> python inicializar_stock.py
```

### **Opción B: Comando Django Directo**
```bash
# Sincronizar solo Tijuana
python manage.py sync_warehouse_stock --warehouse TIJUANA --force

# Sincronizar todos los almacenes
python manage.py sync_warehouse_stock --force

# Solo corregir discrepancias (más rápido)
python manage.py sync_warehouse_stock --fix-discrepancies
```

### **Opción C: Desde la API (requiere autenticación)**
```bash
curl -X POST https://www.sanchodistribuidora.com/api/sync-warehouse-stock/ \
  -H "Authorization: Bearer <tu_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouse": "TIJUANA",
    "force": true
  }'
```

## 📊 Verificar Salud del Inventario

### **Desde la terminal:**
```bash
python manage.py sync_warehouse_stock --fix-discrepancies
```

### **Desde la API:**
```bash
curl https://www.sanchodistribuidora.com/api/check-stock-health/?warehouse=TIJUANA \
  -H "Authorization: Bearer <tu_token>"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "warehouse": "TIJUANA",
  "total_checked": 2000,
  "discrepancies_found": 0,
  "health_score": 100.0,
  "message": "Salud del inventario: 100.0%"
}
```

## 🔧 Mantenimiento

### **¿Necesitas forzar sincronización?**
```bash
# Solo para casos excepcionales
python manage.py sync_warehouse_stock --warehouse TIJUANA --force
```

### **¿Cómo saber si está funcionando?**
1. Haz una venta/compra desde el sistema
2. Verifica que el stock se actualice automáticamente
3. Si hay dudas, ejecuta: `python manage.py sync_warehouse_stock --fix-discrepancies`

## 📁 Archivos Modificados/Creados

### **Archivos Nuevos:**
- ✅ `core/management/commands/sync_warehouse_stock.py` - Comando de sincronización
- ✅ `inicializar_stock.py` - Script de inicialización

### **Archivos Modificados (sin romper funcionalidad):**
- ✅ `core/signals.py` - Agregadas señales de sincronización
- ✅ `core/views.py` - Agregados endpoints API
- ✅ `core/urls.py` - Agregadas rutas API
- ✅ `core/apps.py` - Ya importaba signals (sin cambios)

## 🎓 Cómo Funciona Internamente

### **1. Señales Django (Automático)**
```python
# Cuando hay un movimiento de inventario:
@receiver(post_save, sender='core.InventoryMovementDetail')
def update_warehouse_stock_on_movement(sender, instance, **kwargs):
    # Calcula stock real
    # Actualiza ProductWarehouseStock
```

### **2. Cálculo de Stock Real**
```python
def calculate_variant_stock(variant, warehouse):
    ingresos = Sum(compras + devoluciones + ajustes_positivos)
    salidas = Sum(ventas + transferencias + daños + ajustes_negativos)
    stock_final = ingresos - salidas
    return max(stock_final, 0)  # No negativo
```

## ⚠️ Notas Importantes

1. **NO afecta código existente** - Solo agrega funcionalidad nueva
2. **Las señales se activan automáticamente** al reiniciar Django
3. **La primera sincronización puede tardar** 5-10 minutos con 2000+ productos
4. **Después de la primera vez**, todo es automático
5. **Los stocks se calculan desde movimientos**, no desde valores arbitrarios

## 🚨 Solución de Problemas

### **Problema: Solo se muestran 113 productos en la tienda**
**Causa:** Los registros de ProductWarehouseStock no existen para todos los productos
**Solución:**
```bash
python inicializar_stock.py
# O directamente:
python manage.py sync_warehouse_stock --warehouse TIJUANA --force
```

### **Problema: Stock incorrecto después de ventas**
**Causa:** Discrepancia entre movimientos y ProductWarehouseStock
**Solución:**
```bash
python manage.py sync_warehouse_stock --fix-discrepancies
```

### **Problema: Nuevos productos no aparecen**
**Causa:** Las señales no están activas
**Verificar:**
```bash
# Reiniciar Django
python manage.py runserver
# Las señales deberían cargarse automáticamente
```

## 📞 Soporte

Si encuentras algún problema:
1. Revisa los logs: `docker logs <container_name>`
2. Verifica la salud: `GET /api/check-stock-health/`
3. Ejecuta sincronización manual: `python manage.py sync_warehouse_stock --fix-discrepancies`

## ✅ Checklist de Implementación

- [x] Señales automáticas creadas
- [x] Comando de sincronización creado
- [x] Endpoints API agregados
- [x] Script de inicialización creado
- [x] README con instrucciones
- [ ] **PENDIENTE: Ejecutar inicialización en producción**
- [ ] **PENDIENTE: Verificar que aparezcan 2000+ productos en la tienda**

---

**Fecha de implementación:** 29 de Noviembre de 2025  
**Estado:** ✅ Listo para producción
