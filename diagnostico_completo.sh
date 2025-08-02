#!/bin/bash
echo "=== DIAGNÓSTICO COMPLETO DEL VPS ==="
echo ""
echo "1. CONTEO EN BD MAESTRO (actual de la app):"
docker exec maestro_db psql -U maestro -d maestro -c "SELECT 'core_product' as tabla, COUNT(*) as registros FROM core_product;"
docker exec maestro_db psql -U maestro -d maestro -c "SELECT 'core_user' as tabla, COUNT(*) as registros FROM core_user;"

echo ""
echo "2. CONTEO EN BD MAESTRO_INVENTARIO (nuestros datos):"
docker exec maestro_db psql -U maestro -d maestro_inventario -c "SELECT 'core_product' as tabla, COUNT(*) as registros FROM core_product;"
docker exec maestro_db psql -U maestro -d maestro_inventario -c "SELECT 'core_user' as tabla, COUNT(*) as registros FROM core_user;"

echo ""
echo "3. VERIFICAR VARIABLES DE ENTORNO DEL BACKEND:"
docker exec maestro_backend env | grep -E "(DATABASE|DB_)" | head -10

echo ""
echo "=== FIN DIAGNÓSTICO ==="
