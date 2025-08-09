#!/bin/bash

# Script para ejecutar deploy desde máquina local
# Ejecuta el deploy automatizado en el VPS remoto

echo "🚀 DEPLOY REMOTO - Sancho Distribuidora Frontend"
echo "================================================"

VPS_HOST="root@168.231.67.221"
DEPLOY_PATH="/etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code"

echo "📡 Conectando a VPS: $VPS_HOST"
echo "📁 Directorio deploy: $DEPLOY_PATH"
echo ""

# Verificar conectividad al VPS
echo "🔍 Verificando conectividad..."
if ! ssh -o ConnectTimeout=10 $VPS_HOST "echo 'Conexión exitosa'"; then
    echo "❌ Error: No se pudo conectar al VPS"
    exit 1
fi

echo "✅ Conexión establecida"
echo ""

# Mostrar estado actual
echo "📊 Estado actual del frontend:"
ssh $VPS_HOST "docker ps --filter name=sancho_frontend_v2 --format 'table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}'" || echo "⚠️  Frontend no está corriendo"
echo ""

# Preguntar confirmación
read -p "¿Continuar con el deploy? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "❌ Deploy cancelado"
    exit 0
fi

echo ""
echo "🚀 Iniciando deploy automático..."
echo "⏳ Este proceso puede tomar varios minutos..."
echo ""

# Ejecutar deploy completo en el VPS
if ssh $VPS_HOST "cd $DEPLOY_PATH && ./auto-deploy.sh"; then
    echo ""
    echo "🎉 DEPLOY COMPLETADO EXITOSAMENTE"
    echo "🌐 Sitio disponible en: https://www.sanchodistribuidora.com"
    
    # Verificación final
    echo ""
    echo "🔍 Verificación final del sitio:"
    if curl -s -f -I https://www.sanchodistribuidora.com >/dev/null; then
        echo "✅ Sitio web respondiendo correctamente"
    else
        echo "⚠️  Sitio web puede tardar unos momentos en responder"
    fi
else
    echo ""
    echo "❌ ERROR EN EL DEPLOY"
    echo "📋 Revisando logs..."
    ssh $VPS_HOST "docker logs sancho_frontend_v2 --tail 20" || echo "No se pudieron obtener logs"
    exit 1
fi

echo ""
echo "📊 Estado final del sistema:"
ssh $VPS_HOST "docker ps --filter name=sancho --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
