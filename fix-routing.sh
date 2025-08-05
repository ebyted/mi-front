#!/bin/bash

echo "🔧 Actualizando configuración de Traefik para corregir routing de API..."

# Detener servicios
docker-compose -f docker-compose-fixed.yml down

# Limpiar containers y reiniciar
docker-compose -f docker-compose-fixed.yml up -d

echo "✅ Configuración actualizada"
echo ""
echo "🔍 Verificando estado de containers:"
docker ps | grep maestro

echo ""
echo "📋 Logs del backend (últimas 10 líneas):"
docker logs maestro_backend_api --tail 10

echo ""
echo "🌐 Testear endpoints:"
echo "curl -k https://www.sanchodistribuidora.com/api/token/"
echo "curl -k https://www.sanchodistribuidora.com/api/usuarios/"

echo ""
echo "🔗 URLs de prueba:"
echo "Frontend: https://www.sanchodistribuidora.com"
echo "API Token: https://www.sanchodistribuidora.com/api/token/"
echo "API Users: https://www.sanchodistribuidora.com/api/usuarios/"
