#!/bin/bash
echo "=== VERIFICACIÓN FINAL EN maestro_inventario ==="
docker exec maestro_db psql -U maestro -d maestro_inventario -c "SELECT 'core_product' as tabla, COUNT(*) as registros FROM core_product;"
docker exec maestro_db psql -U maestro -d maestro_inventario -c "SELECT 'core_user' as tabla, COUNT(*) as registros FROM core_user;"
docker exec maestro_db psql -U maestro -d maestro_inventario -c "SELECT 'core_business' as tabla, COUNT(*) as registros FROM core_business;"
docker exec maestro_db psql -U maestro -d maestro_inventario -c "SELECT 'core_warehouse' as tabla, COUNT(*) as registros FROM core_warehouse;"
echo "=== FIN VERIFICACIÓN ==="
