#!/bin/bash
echo "=== RESTAURACIÓN EN VPS - maestro_inventario ==="

echo "1. Verificando contenedor maestro_db..."
docker ps | grep maestro_db

echo "2. Creando base de datos de prueba..."
docker exec maestro_db psql -U maestro -c "DROP DATABASE IF EXISTS bdtotal_test; CREATE DATABASE bdtotal_test;"

echo "3. Restaurando respaldo desde bdtotal_local_utf8.sql..."
docker exec -i maestro_db psql -U maestro -d bdtotal_test < /tmp/bdtotal_local_utf8.sql

echo "4. Verificando restauración..."
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

echo ""
echo "5. Listando todas las tablas creadas..."
docker exec maestro_db psql -U maestro -d bdtotal_test -c "\dt"

echo ""
echo "=== RESTAURACIÓN COMPLETADA ==="
echo "Para reemplazar la BD principal maestro_inventario, ejecuta:"
echo "docker exec maestro_db psql -U maestro -c \"DROP DATABASE IF EXISTS maestro_inventario;\""
echo "docker exec maestro_db psql -U maestro -c \"ALTER DATABASE bdtotal_test RENAME TO maestro_inventario;\""
