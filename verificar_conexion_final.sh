#!/bin/bash
echo "Verificando conexión a base de datos..."
docker exec maestro_backend python manage.py shell -c "
from django.db import connection
cursor = connection.cursor()
cursor.execute('SELECT current_database(), current_user, version()')
result = cursor.fetchone()
print('Base de datos:', result[0])
print('Usuario:', result[1])
print('PostgreSQL:', result[2])
cursor.close()
"

echo ""
echo "Contando registros en tablas principales..."
docker exec maestro_backend python manage.py shell -c "
from core.models import Product, User, Business, Warehouse
print('Productos:', Product.objects.count())
print('Usuarios:', User.objects.count())  
print('Empresas:', Business.objects.count())
print('Almacenes:', Warehouse.objects.count())
"

echo ""
echo "Verificando que la base de datos maestro_inventario tenga los datos..."
docker exec maestro_db psql -U maestro -d maestro_inventario -c "
SELECT 'maestro_inventario' as base_datos, count(*) as total_productos 
FROM core_product;
"
