#!/bin/bash
echo "=== LIMPIANDO ARCHIVO DE CARACTERES PROBLEMÁTICOS ==="

# Limpiar el archivo de caracteres problemáticos
sed 's/\xEF\xBB\xBF//g' /tmp/bdtotal_local_utf8.sql | sed 's/\r$//' | tr -d '\000-\010\013\014\016-\037\177-\377' > /tmp/bdtotal_clean.sql

echo "Archivo limpiado: /tmp/bdtotal_clean.sql"
ls -la /tmp/bdtotal_clean.sql

echo ""
echo "=== CREANDO BASE DE DATOS ==="
docker exec maestro_db createdb -U maestro maestro_inventario || echo "Base de datos ya existe o error"

echo ""
echo "=== RESTAURANDO RESPALDO LIMPIO ==="
docker exec -i maestro_db psql -U maestro -d maestro_inventario < /tmp/bdtotal_clean.sql

echo ""
echo "=== VERIFICANDO RESTAURACIÓN ==="
docker exec maestro_db psql -U maestro -d maestro_inventario -c "SELECT COUNT(*) as total_tablas FROM information_schema.tables WHERE table_schema = 'public';"

echo ""
echo "=== CONTEO DE REGISTROS ==="
docker exec maestro_db psql -U maestro -d maestro_inventario -c "SELECT 'core_product' as tabla, COUNT(*) as registros FROM core_product;"
