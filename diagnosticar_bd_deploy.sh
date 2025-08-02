#!/bin/bash
echo "======================================================================"
echo "           DIAGNÓSTICO DE BASE DE DATOS EN DEPLOY"
echo "======================================================================"
echo ""

echo "1. VARIABLES DE ENTORNO DE BASE DE DATOS:"
echo "-----------------------------------------"
ssh -p 22 root@168.231.67.221 "docker exec maestro_backend env | grep -E 'DATABASE|DB_'"

echo ""
echo "2. CONFIGURACIÓN DE DJANGO (settings.py):"
echo "-------------------------------------------"
ssh -p 22 root@168.231.67.221 "docker exec maestro_backend python manage.py shell -c \"
from django.conf import settings
import os
print('=== CONFIGURACIÓN DE BASE DE DATOS ===')
print(f'DATABASE_NAME: {os.environ.get(\\\"DATABASE_NAME\\\", \\\"NO DEFINIDO\\\")}')
print(f'DATABASE_USER: {os.environ.get(\\\"DATABASE_USER\\\", \\\"NO DEFINIDO\\\")}')
print(f'DATABASE_HOST: {os.environ.get(\\\"DATABASE_HOST\\\", \\\"NO DEFINIDO\\\")}')
print(f'DATABASE_PORT: {os.environ.get(\\\"DATABASE_PORT\\\", \\\"NO DEFINIDO\\\")}')
print('')
print('=== DATABASES CONFIG EN DJANGO ===')
for alias, config in settings.DATABASES.items():
    print(f'{alias}: {config}')
\""

echo ""
echo "3. TEST DE CONEXIÓN A BASE DE DATOS:"
echo "------------------------------------"
ssh -p 22 root@168.231.67.221 "docker exec maestro_backend python manage.py shell -c \"
from django.db import connection
print('=== TEST DE CONEXIÓN ===')
try:
    cursor = connection.cursor()
    cursor.execute('SELECT current_database(), current_user, inet_server_addr(), inet_server_port();')
    result = cursor.fetchone()
    print(f'Base de datos actual: {result[0]}')
    print(f'Usuario actual: {result[1]}')
    print(f'Servidor: {result[2]}')
    print(f'Puerto: {result[3]}')
    cursor.close()
except Exception as e:
    print(f'ERROR DE CONEXIÓN: {e}')
\""

echo ""
echo "4. CONTEO DE REGISTROS EN TABLAS PRINCIPALES:"
echo "---------------------------------------------"
ssh -p 22 root@168.231.67.221 "docker exec maestro_backend python manage.py shell -c \"
from core.models import Product, User, Business, Warehouse
print('=== CONTEO DE REGISTROS ===')
try:
    print(f'Productos: {Product.objects.count()}')
    print(f'Usuarios: {User.objects.count()}')
    print(f'Empresas: {Business.objects.count()}')
    print(f'Almacenes: {Warehouse.objects.count()}')
except Exception as e:
    print(f'ERROR AL CONTAR REGISTROS: {e}')
\""

echo ""
echo "5. VERIFICACIÓN DE CONTENEDORES Y RED:"
echo "--------------------------------------"
ssh -p 22 root@168.231.67.221 "
echo '=== CONTENEDORES ACTIVOS ==='
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo ''
echo '=== RED DE DOCKER ==='
docker network ls | grep maestro

echo ''
echo '=== LOGS RECIENTES DEL BACKEND ==='
docker logs maestro_backend --tail 20
"

echo ""
echo "======================================================================"
echo "📝 POSIBLES PROBLEMAS:"
echo "• El contenedor se conecta a una BD diferente"
echo "• Variables de entorno mal configuradas"
echo "• Problemas de red entre contenedores"
echo "• Base de datos vacía o en esquema diferente"
echo "======================================================================"
