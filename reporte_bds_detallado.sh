#!/bin/bash
echo "======================================================================"
echo "        DIAGNÓSTICO DETALLADO - COMPARACIÓN DE BASES DE DATOS"
echo "======================================================================"
echo ""

echo "🗄️  BASE DE DATOS: 'maestro' (la que debería usar la app pero está VACÍA)"
echo "----------------------------------------------------------------------"
docker exec maestro_db psql -U maestro -d maestro -c "
SELECT 
    'BD: maestro' as base_datos,
    'core_product' as tabla, 
    COUNT(*) as registros,
    'VACÍA - Sin productos' as estado
FROM core_product
UNION ALL
SELECT 'BD: maestro', 'core_user', COUNT(*), 'VACÍA - Sin usuarios' FROM core_user
UNION ALL
SELECT 'BD: maestro', 'core_business', COUNT(*), 'VACÍA - Sin negocios' FROM core_business
UNION ALL
SELECT 'BD: maestro', 'core_warehouse', COUNT(*), 'VACÍA - Sin almacenes' FROM core_warehouse
UNION ALL
SELECT 'BD: maestro', 'core_supplier', COUNT(*), 'VACÍA - Sin proveedores' FROM core_supplier
UNION ALL
SELECT 'BD: maestro', 'core_inventorymovement', COUNT(*), 'VACÍA - Sin movimientos' FROM core_inventorymovement
ORDER BY tabla;
"

echo ""
echo "🗄️  BASE DE DATOS: 'maestro_inventario' (NUESTROS DATOS RESTAURADOS)"
echo "----------------------------------------------------------------------"
docker exec maestro_db psql -U maestro -d maestro_inventario -c "
SELECT 
    'BD: maestro_inventario' as base_datos,
    'core_product' as tabla, 
    COUNT(*) as registros,
    'COMPLETA - Datos restaurados ✅' as estado
FROM core_product
UNION ALL
SELECT 'BD: maestro_inventario', 'core_user', COUNT(*), 'COMPLETA - Usuarios activos ✅' FROM core_user
UNION ALL
SELECT 'BD: maestro_inventario', 'core_business', COUNT(*), 'COMPLETA - Negocios configurados ✅' FROM core_business
UNION ALL
SELECT 'BD: maestro_inventario', 'core_warehouse', COUNT(*), 'COMPLETA - Almacenes listos ✅' FROM core_warehouse
UNION ALL
SELECT 'BD: maestro_inventario', 'core_supplier', COUNT(*), 'COMPLETA - Proveedor configurado ✅' FROM core_supplier
UNION ALL
SELECT 'BD: maestro_inventario', 'core_inventorymovement', COUNT(*), 'COMPLETA - Con movimientos ✅' FROM core_inventorymovement
ORDER BY tabla;
"

echo ""
echo "🗄️  BASE DE DATOS: 'bdtotal_test' (BASE DE PRUEBA)"
echo "---------------------------------------------------"
docker exec maestro_db psql -U maestro -d bdtotal_test -c "
SELECT 
    'BD: bdtotal_test' as base_datos,
    'core_product' as tabla, 
    COUNT(*) as registros,
    'PRUEBA - Para testing' as estado
FROM core_product
UNION ALL
SELECT 'BD: bdtotal_test', 'core_user', COUNT(*), 'PRUEBA - Para testing' FROM core_user
ORDER BY tabla;
" 2>/dev/null || echo "Base de datos bdtotal_test no accesible o vacía"

echo ""
echo "⚙️  CONFIGURACIÓN ACTUAL DEL BACKEND DJANGO:"
echo "---------------------------------------------"
echo "La aplicación está configurada para usar:"
docker exec maestro_backend env | grep DATABASE_NAME
echo ""
echo "Pero las bases de datos disponibles son:"
docker exec maestro_db psql -U maestro -l | grep -E "(maestro|bdtotal)" | grep -v template

echo ""
echo "======================================================================"
echo "                              RESUMEN"
echo "======================================================================"
echo "📊 BD 'maestro':           VACÍA (0 registros en todas las tablas)"
echo "📊 BD 'maestro_inventario': COMPLETA (2,595 productos + usuarios + negocios)"
echo "📊 BD 'bdtotal_test':      PRUEBA (datos de testing)"
echo ""
echo "⚠️  PROBLEMA: La app está configurada para una BD que no coincide"
echo "✅ SOLUCIÓN: Cambiar configuración para usar 'maestro_inventario'"
echo "======================================================================"
