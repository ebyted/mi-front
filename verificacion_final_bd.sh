#!/bin/bash
echo "=== VERIFICACIÓN FINAL DE BASE DE DATOS ==="
echo ""

echo "1. Verificando conexión directa a PostgreSQL:"
ssh -p 22 root@168.231.67.221 "docker exec maestro_db psql -U maestro -d maestro_inventario -c 'SELECT count(*) as total_productos FROM core_product;'"

echo ""
echo "2. Verificando Django ORM:"
ssh -p 22 root@168.231.67.221 "docker exec maestro_backend python -c 'import django; django.setup(); from core.models import Product; print(\"Django ORM - Productos:\", Product.objects.count())'"

echo ""
echo "3. Verificando configuración de Django:"
ssh -p 22 root@168.231.67.221 "docker exec maestro_backend python -c 'import django; django.setup(); from django.conf import settings; print(\"ENGINE:\", settings.DATABASES[\"default\"][\"ENGINE\"]); print(\"NAME:\", settings.DATABASES[\"default\"][\"NAME\"])'"

echo ""
echo "4. Test simple de API sin auth:"
ssh -p 22 root@168.231.67.221 "curl -s http://localhost:8030/api/ | head -c 200"
