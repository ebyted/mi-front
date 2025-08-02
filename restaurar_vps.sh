#!/bin/bash
echo "=== RESTAURACIÓN EN VPS ==="

echo "1. Creando base de datos de prueba..."
docker exec maestro_db psql -U maestro -c "DROP DATABASE IF EXISTS bdtotal_test; CREATE DATABASE bdtotal_test;"

echo "2. Restaurando respaldo..."
docker exec -i maestro_db psql -U maestro -d bdtotal_test < /tmp/bdtotal_local_utf8.sql

echo "3. Verificando restauración..."
docker exec maestro_db psql -U maestro -d bdtotal_test -c "
SELECT 'core_product' as tabla, COUNT(*) as registros FROM core_product
UNION ALL
SELECT 'core_inventorymovement', COUNT(*) FROM core_inventorymovement
UNION ALL
SELECT 'core_inventorymovementdetail', COUNT(*) FROM core_inventorymovementdetail
UNION ALL
SELECT 'core_user', COUNT(*) FROM core_user
UNION ALL
SELECT 'core_business', COUNT(*) FROM core_business
UNION ALL
SELECT 'core_warehouse', COUNT(*) FROM core_warehouse
UNION ALL
SELECT 'core_supplier', COUNT(*) FROM core_supplier
UNION ALL
SELECT 'core_purchaseorder', COUNT(*) FROM core_purchaseorder
ORDER BY tabla;
"

echo "=== RESTAURACIÓN COMPLETADA ==="
