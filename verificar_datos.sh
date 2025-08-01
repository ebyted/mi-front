#!/bin/bash
# Script para verificar datos en VPS
# Guarda este archivo como verificar_datos.sh en tu VPS y ejecuta: bash verificar_datos.sh

echo "🚀 VERIFICANDO DATOS EN VPS"
echo "==========================="

# Definir nombre del contenedor
CONTAINER_NAME="maestro_db"

echo "🐳 Contenedores en ejecución:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

echo ""
echo "🔍 Verificando contenedor: $CONTAINER_NAME"

if docker ps | grep -q $CONTAINER_NAME; then
    echo "✅ Contenedor $CONTAINER_NAME está en ejecución"
    
    echo ""
    echo "🗄️ Bases de datos disponibles:"
    docker exec $CONTAINER_NAME psql -U maestro -l
    
    echo ""
    echo "📊 CONTEO DE DATOS:"
    docker exec $CONTAINER_NAME psql -U maestro -d maestro_inventario -c "
    SELECT 
        'Productos' as tabla, COUNT(*) as registros FROM core_product
    UNION ALL
    SELECT 
        'Variantes' as tabla, COUNT(*) as registros FROM core_productvariant
    UNION ALL
    SELECT 
        'Marcas' as tabla, COUNT(*) as registros FROM core_brand
    UNION ALL
    SELECT 
        'Categorias' as tabla, COUNT(*) as registros FROM core_category
    UNION ALL
    SELECT 
        'Usuarios' as tabla, COUNT(*) as registros FROM core_user;
    " 2>/dev/null || echo "❌ Error al consultar datos"
    
    echo ""
    echo "📦 Primeros 3 productos:"
    docker exec $CONTAINER_NAME psql -U maestro -d maestro_inventario -c "
    SELECT id, name FROM core_product LIMIT 3;
    " 2>/dev/null || echo "❌ Error al consultar productos"
    
    echo ""
    echo "👤 Usuarios disponibles:"
    docker exec $CONTAINER_NAME psql -U maestro -d maestro_inventario -c "
    SELECT email, first_name, last_name FROM core_user;
    " 2>/dev/null || echo "❌ Error al consultar usuarios"
    
else
    echo "❌ Contenedor $CONTAINER_NAME no está en ejecución"
    echo "Contenedores disponibles:"
    docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    
    echo ""
    echo "Intentando con otros nombres comunes:"
    for nombre in "postgres" "db" "database" "maestro" "backend_db"; do
        if docker ps | grep -q $nombre; then
            echo "✅ Encontrado contenedor: $nombre"
            CONTAINER_NAME=$nombre
            break
        fi
    done
fi

echo ""
echo "🌐 Puertos en uso:"
netstat -tlnp 2>/dev/null | grep -E ":(80|3000|8000|5432)" | head -5

echo ""
echo "✅ Verificación completada"
echo "💡 Si tienes datos, deberías ver números > 0 en el conteo"
echo "💡 Si no hay datos, necesitarás sincronizar desde tu local"
