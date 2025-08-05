#!/bin/bash

echo "🚨 ELIMINACIÓN DE EMERGENCIA - CONTENEDOR MAESTRO_TRAEFIK"
echo "========================================================="

echo "🔍 Paso 1: Identificando el contenedor conflictivo..."
docker ps -a | grep maestro_traefik

echo ""
echo "🛑 Paso 2: Forzando detención del contenedor maestro_traefik..."
docker stop maestro_traefik 2>/dev/null || echo "Contenedor ya detenido o no existe"

echo ""
echo "🗑️ Paso 3: Forzando eliminación del contenedor maestro_traefik..."
docker rm -f maestro_traefik 2>/dev/null || echo "Contenedor ya eliminado"

echo ""
echo "🧹 Paso 4: Eliminando por ID específico del error..."
docker rm -f 60b67024cef87daecb12594ed86bf9640f70730298c530d03da646f09b8fbbbb 2>/dev/null || echo "Contenedor específico ya eliminado"

echo ""
echo "🔍 Paso 5: Verificando que maestro_traefik ya no existe..."
TRAEFIK_CHECK=$(docker ps -aq --filter "name=maestro_traefik")
if [ -z "$TRAEFIK_CHECK" ]; then
    echo "✅ maestro_traefik eliminado exitosamente"
else
    echo "⚠️ Aún existe contenedor maestro_traefik: $TRAEFIK_CHECK"
    echo "Forzando eliminación adicional..."
    docker rm -f $TRAEFIK_CHECK
fi

echo ""
echo "🚀 Paso 6: Intentando despliegue nuevamente..."
docker compose up -d

echo ""
echo "✅ Verificación final:"
docker compose ps
