#!/bin/bash

# Script de deploy automatizado que garantiza recreación completa
# Este script combina pre-deploy cleanup + deploy completo

echo "🚀 DEPLOY AUTOMATIZADO - Recreación completa del frontend"
echo "================================================"

# Obtener timestamp para logs
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "📅 Iniciado: $TIMESTAMP"

# Paso 1: Pre-deploy cleanup
echo ""
echo "🔧 FASE 1: Pre-deploy cleanup"
echo "--------------------------------"

# Navegar al directorio del proyecto
cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code/

# Ejecutar limpieza previa
if [ -f "pre-deploy.sh" ]; then
    chmod +x pre-deploy.sh
    ./pre-deploy.sh
else
    echo "⚠️  pre-deploy.sh no encontrado, ejecutando limpieza manual..."
    docker ps -q --filter name=sancho_frontend_v2 | xargs -r docker stop
    docker ps -aq --filter name=sancho_frontend_v2 | xargs -r docker rm -f
fi

# Paso 2: Deploy completo
echo ""
echo "🚀 FASE 2: Deploy del frontend"
echo "--------------------------------"

# Ejecutar deploy principal
if [ -f "deploy-frontend.sh" ]; then
    chmod +x deploy-frontend.sh
    ./deploy-frontend.sh
else
    echo "❌ Error: deploy-frontend.sh no encontrado"
    exit 1
fi

# Paso 3: Verificación final
echo ""
echo "✅ FASE 3: Verificación final"
echo "--------------------------------"

# Verificar estado final
docker ps --filter name=sancho_frontend_v2 --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"

# Verificar conectividad web
echo "🌐 Verificando sitio web..."
sleep 5
if curl -s -f -I https://www.sanchodistribuidora.com >/dev/null; then
    echo "✅ Sitio web respondiendo correctamente"
else
    echo "⚠️  Sitio web puede tardar unos momentos en responder"
fi

TIMESTAMP_END=$(date '+%Y-%m-%d %H:%M:%S')
echo ""
echo "🎉 DEPLOY COMPLETADO EXITOSAMENTE"
echo "📅 Finalizado: $TIMESTAMP_END"
echo "🌐 Frontend disponible en: https://www.sanchodistribuidora.com"
