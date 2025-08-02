#!/bin/bash
echo "=== DIAGNÓSTICO COMPLETO - TODAS LAS TABLAS CLAVE ==="
echo ""
echo "1. CONTEO EN BD MAESTRO (actual de la app - VACÍA):"
echo "---------------------------------------------------"
docker exec maestro_db psql -U maestro -d maestro -c "
SELECT 'core_product' as tabla, COUNT(*) as registros FROM core_product
UNION ALL
SELECT 'core_user', COUNT(*) FROM core_user
UNION ALL
SELECT 'core_business', COUNT(*) FROM core_business
UNION ALL
SELECT 'core_warehouse', COUNT(*) FROM core_warehouse
UNION ALL
SELECT 'core_supplier', COUNT(*) FROM core_supplier
UNION ALL
SELECT 'core_inventorymovement', COUNT(*) FROM core_inventorymovement
UNION ALL
SELECT 'core_inventorymovementdetail', COUNT(*) FROM core_inventorymovementdetail
UNION ALL
SELECT 'core_purchaseorder', COUNT(*) FROM core_purchaseorder
ORDER BY tabla;
"

echo ""
echo "2. CONTEO EN BD MAESTRO_INVENTARIO (nuestros datos - COMPLETA):"
echo "-------------------------------------------------------------"
docker exec maestro_db psql -U maestro -d maestro_inventario -c "
SELECT 'core_product' as tabla, COUNT(*) as registros FROM core_product
UNION ALL
SELECT 'core_user', COUNT(*) FROM core_user
UNION ALL
SELECT 'core_business', COUNT(*) FROM core_business
UNION ALL
SELECT 'core_warehouse', COUNT(*) FROM core_warehouse
UNION ALL
SELECT 'core_supplier', COUNT(*) FROM core_supplier
UNION ALL
SELECT 'core_inventorymovement', COUNT(*) FROM core_inventorymovement
UNION ALL
SELECT 'core_inventorymovementdetail', COUNT(*) FROM core_inventorymovementdetail
UNION ALL
SELECT 'core_purchaseorder', COUNT(*) FROM core_purchaseorder
ORDER BY tabla;
"

echo ""
echo "3. DETALLE DE BUSINESSES:"
echo "------------------------"
docker exec maestro_db psql -U maestro -d maestro_inventario -c "SELECT id, name, code FROM core_business;"

echo ""
echo "4. DETALLE DE WAREHOUSES:"
echo "------------------------"
docker exec maestro_db psql -U maestro -d maestro_inventario -c "SELECT id, name, code, business_id FROM core_warehouse;"

echo ""
echo "5. CONFIGURACIÓN ACTUAL DEL BACKEND:"
echo "-----------------------------------"
docker exec maestro_backend env | grep -E "(DATABASE|DB_)" | sort

echo ""
echo "=== FIN DIAGNÓSTICO COMPLETO ==="
