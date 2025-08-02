#!/bin/bash
echo "======================================================================"
echo "        DIAGNÓSTICO DE PROBLEMAS DJANGO ADMIN Y ESTÁTICOS"
echo "======================================================================"
echo ""

echo "1. VERIFICAR CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS:"
echo "---------------------------------------------------"
docker exec maestro_backend python manage.py collectstatic --dry-run --noinput | head -10

echo ""
echo "2. VERIFICAR CONFIGURACIÓN DEBUG Y ALLOWED_HOSTS:"
echo "-------------------------------------------------"
docker exec maestro_backend env | grep -E "(DEBUG|ALLOWED_HOSTS|STATIC)"

echo ""
echo "3. VERIFICAR ESTRUCTURA DE ARCHIVOS ESTÁTICOS:"
echo "----------------------------------------------"
docker exec maestro_backend find /app -name "static" -type d 2>/dev/null | head -5
docker exec maestro_backend ls -la /app/static/ 2>/dev/null | head -10

echo ""
echo "4. VERIFICAR CONFIGURACIÓN DJANGO ACTUAL:"
echo "-----------------------------------------"
docker exec maestro_backend python -c "
import os
from django.conf import settings
print('DEBUG:', getattr(settings, 'DEBUG', 'No configurado'))
print('STATIC_URL:', getattr(settings, 'STATIC_URL', 'No configurado'))
print('STATIC_ROOT:', getattr(settings, 'STATIC_ROOT', 'No configurado'))
print('ALLOWED_HOSTS:', getattr(settings, 'ALLOWED_HOSTS', 'No configurado'))
"

echo ""
echo "5. VERIFICAR LOGS RECIENTES DEL BACKEND:"
echo "---------------------------------------"
docker logs maestro_backend --tail 15

echo ""
echo "6. VERIFICAR SI EXISTE EL DIRECTORIO ADMIN:"
echo "------------------------------------------"
docker exec maestro_backend find /usr/local/lib/python*/site-packages/django/contrib/admin/static/ -name "*.css" 2>/dev/null | head -3

echo ""
echo "======================================================================"
