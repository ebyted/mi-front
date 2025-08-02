#!/bin/bash
echo "======================================================================"
echo "           USUARIOS VÁLIDOS EN BD maestro_inventario"
echo "======================================================================"
echo ""

echo "1. LISTADO DE USUARIOS DISPONIBLES:"
echo "-----------------------------------"
docker exec maestro_db psql -U maestro -d maestro_inventario -c "
SELECT 
    id,
    email,
    first_name,
    last_name,
    is_active,
    is_staff,
    is_superuser,
    date_joined
FROM core_user 
ORDER BY is_superuser DESC, is_staff DESC, id;
"

echo ""
echo "2. USUARIOS ADMINISTRADORES (SUPERUSERS):"
echo "-----------------------------------------"
docker exec maestro_db psql -U maestro -d maestro_inventario -c "
SELECT 
    'ADMIN' as tipo,
    email,
    first_name || ' ' || last_name as nombre_completo,
    'Puede acceder al Django Admin' as acceso
FROM core_user 
WHERE is_superuser = true;
"

echo ""
echo "3. USUARIOS STAFF (PERSONAL):"
echo "-----------------------------"
docker exec maestro_db psql -U maestro -d maestro_inventario -c "
SELECT 
    'STAFF' as tipo,
    email,
    first_name || ' ' || last_name as nombre_completo,
    'Puede acceder al Django Admin' as acceso
FROM core_user 
WHERE is_staff = true AND is_superuser = false;
"

echo ""
echo "4. USUARIOS REGULARES:"
echo "---------------------"
docker exec maestro_db psql -U maestro -d maestro_inventario -c "
SELECT 
    'REGULAR' as tipo,
    email,
    first_name || ' ' || last_name as nombre_completo,
    'Solo acceso a API' as acceso
FROM core_user 
WHERE is_staff = false AND is_superuser = false;
"

echo ""
echo "======================================================================"
echo "📝 NOTAS IMPORTANTES:"
echo "• Los SUPERUSER pueden acceder al Django Admin (/admin/)"
echo "• Los STAFF pueden acceder al Django Admin con permisos limitados"
echo "• Los REGULAR solo pueden usar la API"
echo "• Para Django Admin usa: http://168.231.67.221:8030/admin/"
echo "======================================================================"
