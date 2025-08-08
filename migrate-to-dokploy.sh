#!/bin/bash

# Script de migración de /root/sancho-app a /etc/dokploy/sancho-app
# Ejecutar como root en el VPS

set -e  # Exit on any error

echo "🚀 Iniciando migración a Dokploy..."

# Variables
OLD_PATH="/root/sancho-app"
NEW_PATH="/etc/dokploy/sancho-app"
BACKUP_PATH="/tmp/sancho-backup-$(date +%Y%m%d_%H%M%S)"

# Verificar que los contenedores están corriendo
echo "📊 Verificando contenedores actuales..."
docker ps --filter "name=sancho_" --format "table {{.Names}}\t{{.Status}}"

# Crear backup de seguridad
echo "💾 Creando backup de seguridad..."
mkdir -p "$BACKUP_PATH"
cp -r "$OLD_PATH" "$BACKUP_PATH/"
echo "✅ Backup creado en: $BACKUP_PATH"

# Crear directorio de Dokploy
echo "📁 Preparando directorio de Dokploy..."
mkdir -p "$NEW_PATH"
mkdir -p "$NEW_PATH/media"
mkdir -p "$NEW_PATH/static" 
mkdir -p "$NEW_PATH/logs"
mkdir -p "$NEW_PATH/backups"

# Copiar archivos (excluyendo volúmenes de Docker)
echo "📦 Copiando archivos..."
rsync -av --exclude='__pycache__' --exclude='*.pyc' --exclude='.git' --exclude='node_modules' "$OLD_PATH/" "$NEW_PATH/"

# Copiar el docker-compose específico para Dokploy
cp "$NEW_PATH/docker-compose.dokploy.yml" "$NEW_PATH/docker-compose.yml"

# Ajustar permisos para Dokploy
echo "🔐 Ajustando permisos..."
chown -R root:docker "$NEW_PATH" 2>/dev/null || chown -R root:root "$NEW_PATH"
chmod -R 755 "$NEW_PATH"

# Verificar archivos críticos
echo "🔍 Verificando archivos críticos..."
critical_files=(".env" ".env.traefik" "docker-compose.yml" "requirements.txt" "manage.py")
for file in "${critical_files[@]}"; do
    if [[ -f "$NEW_PATH/$file" ]]; then
        echo "✅ $file - OK"
    else
        echo "❌ $file - FALTANTE"
        exit 1
    fi
done

# Test build (opcional - puede tomar tiempo)
echo "🔨 Probando build en nueva ubicación..."
cd "$NEW_PATH"
docker-compose build --no-cache frontend backend

echo "🎯 Migración preparada. Para completar:"
echo ""
echo "1. Detener contenedores actuales:"
echo "   cd $OLD_PATH && docker-compose down"
echo ""
echo "2. Iniciar desde nueva ubicación:"
echo "   cd $NEW_PATH && docker-compose up -d"
echo ""
echo "3. Verificar funcionamiento:"
echo "   docker-compose ps"
echo "   curl -I https://www.sanchodistribuidora.com"
echo ""
echo "4. Si todo funciona, eliminar ubicación anterior:"
echo "   rm -rf $OLD_PATH"
echo ""
echo "💾 Backup disponible en: $BACKUP_PATH"
