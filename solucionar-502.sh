#!/bin/bash

# 🚨 SOLUCIÓN INMEDIATA PARA ERROR 502
# ===================================

echo "🚨 SOLUCIONANDO ERROR 502 - FRONTEND NO RESPONDE"
echo "================================================"

# 1. Ver estado actual
echo "1️⃣ Estado actual de contenedores:"
docker ps | grep maestro

# 2. Ver logs del frontend
echo -e "\n2️⃣ Logs del frontend (últimas 10 líneas):"
docker logs maestro_frontend --tail=10

# 3. Ver logs del backend
echo -e "\n3️⃣ Logs del backend (últimas 5 líneas):"
docker logs maestro_backend --tail=5

# 4. Reiniciar frontend
echo -e "\n4️⃣ Reiniciando frontend..."
docker restart maestro_frontend

# 5. Esperar estabilización
echo -e "\n5️⃣ Esperando estabilización (15 segundos)..."
sleep 15

# 6. Verificar que frontend esté arriba
echo -e "\n6️⃣ Verificando estado después del reinicio:"
docker ps | grep maestro_frontend

# 7. Test local
echo -e "\n7️⃣ Test de conectividad local:"
curl -I http://localhost:80 2>/dev/null || echo "Error en puerto 80"

# 8. Ver logs actuales
echo -e "\n8️⃣ Logs recientes del frontend:"
docker logs maestro_frontend --tail=5

# 9. Si sigue fallando, reiniciar todo
read -p "¿Frontend sigue fallando? ¿Reiniciar todos los servicios? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🔄 Reiniciando todos los servicios..."
    docker-compose restart
    echo "✅ Servicios reiniciados. Espera 30 segundos y prueba el sitio web."
fi

echo -e "\n✅ PROCESO COMPLETADO"
echo "🌐 Prueba ahora: https://www.sanchodistribuidora.com"
