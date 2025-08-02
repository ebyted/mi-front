#!/bin/bash
echo "=== VERIFICACIÓN RÁPIDA DEL ESTADO ==="
echo ""

echo "1. Estado de contenedores:"
ssh -p 22 root@168.231.67.221 "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep maestro"

echo ""
echo "2. Test rápido de productos:"
ssh -p 22 root@168.231.67.221 "docker exec maestro_backend python manage.py shell -c 'from core.models import Product; print(\"Productos:\", Product.objects.count())'"

echo ""
echo "3. Test de conexión a BD:"
ssh -p 22 root@168.231.67.221 "docker exec maestro_backend python manage.py shell -c 'from django.conf import settings; print(\"ENGINE:\", settings.DATABASES[\"default\"][\"ENGINE\"])'"

echo ""
echo "4. Logs recientes:"
ssh -p 22 root@168.231.67.221 "docker logs maestro_backend --tail 5"
