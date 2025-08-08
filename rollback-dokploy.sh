#!/bin/bash

# Script de rollback en caso de problemas
# Ejecutar si la migración falla

set -e

echo "🔄 Iniciando rollback a configuración original..."

NEW_PATH="/etc/dokploy/sancho-app"
OLD_PATH="/root/sancho-app"

# Verificar si hay backup
BACKUP_PATH=$(ls -td /tmp/sancho-backup-* 2>/dev/null | head -1)

if [[ -z "$BACKUP_PATH" ]]; then
    echo "❌ No se encontró backup reciente"
    exit 1
fi

echo "📦 Usando backup: $BACKUP_PATH"

# Detener contenedores en nueva ubicación
echo "⏹️ Deteniendo contenedores..."
cd "$NEW_PATH" 2>/dev/null && docker-compose down || true

# Restaurar desde backup
echo "🔄 Restaurando configuración original..."
rm -rf "$OLD_PATH" 2>/dev/null || true
cp -r "$BACKUP_PATH/sancho-app" "$OLD_PATH"

# Iniciar desde ubicación original
echo "▶️ Iniciando servicios originales..."
cd "$OLD_PATH"
docker-compose up -d

# Verificar
echo "✅ Verificando servicios..."
sleep 10
docker-compose ps

echo "🎉 Rollback completado"
echo "🌐 Verificar: https://www.sanchodistribuidora.com"
