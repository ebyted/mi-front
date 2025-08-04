#!/bin/bash

# 🚀 DEPLOYMENT AUTOMÁTICO AL VPS
# ===============================
# Conecta al VPS y configura todo automáticamente

VPS_IP="168.231.67.221"
VPS_USER="root"
VPS_PASSWORD="Arkano-IA2025+"

echo "🚀 DEPLOYMENT AUTOMÁTICO A VPS"
echo "=============================="
echo "IP: $VPS_IP"
echo "Usuario: $VPS_USER"
echo ""

# Verificar si sshpass está instalado
if ! command -v sshpass >/dev/null 2>&1; then
    echo "❌ sshpass no está instalado"
    echo "Instalando sshpass..."
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update && sudo apt-get install -y sshpass
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y sshpass
    elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -S sshpass
    else
        echo "Por favor instala sshpass manualmente y vuelve a ejecutar el script"
        exit 1
    fi
fi

# Función para ejecutar comandos en el VPS
run_remote() {
    sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "$1"
}

# Función para copiar archivos al VPS
copy_to_vps() {
    sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no "$1" "$VPS_USER@$VPS_IP:$2"
}

echo "📂 1. COPIANDO ARCHIVOS AL VPS..."
echo "=================================="

# Crear directorio del proyecto en el VPS
run_remote "mkdir -p /opt/sancho-distribuidora"

# Copiar docker-compose.yml
copy_to_vps "docker-compose.yml" "/opt/sancho-distribuidora/"
echo "✅ docker-compose.yml copiado"

# Copiar scripts
copy_to_vps "setup-completo.sh" "/opt/sancho-distribuidora/"
copy_to_vps "comandos-rapidos.sh" "/opt/sancho-distribuidora/"
echo "✅ Scripts copiados"

# Copiar archivos del proyecto si existen
if [ -d "dbackf" ]; then
    sshpass -p "$VPS_PASSWORD" scp -r -o StrictHostKeyChecking=no "dbackf" "$VPS_USER@$VPS_IP:/opt/sancho-distribuidora/"
    echo "✅ Directorio dbackf copiado"
fi

if [ -f "Dockerfile" ]; then
    copy_to_vps "Dockerfile" "/opt/sancho-distribuidora/"
    echo "✅ Dockerfile copiado"
fi

if [ -f ".env" ]; then
    copy_to_vps ".env" "/opt/sancho-distribuidora/"
    echo "✅ Archivo .env copiado"
fi

# Copiar otros archivos necesarios
for file in requirements.txt manage.py core; do
    if [ -e "$file" ]; then
        sshpass -p "$VPS_PASSWORD" scp -r -o StrictHostKeyChecking=no "$file" "$VPS_USER@$VPS_IP:/opt/sancho-distribuidora/"
        echo "✅ $file copiado"
    fi
done

echo ""
echo "🔧 2. INSTALANDO DEPENDENCIAS EN EL VPS..."
echo "=========================================="

# Actualizar sistema e instalar Docker
run_remote "
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl wget git

# Instalar Docker si no está instalado
if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# Instalar Docker Compose si no está instalado
if ! command -v docker-compose >/dev/null 2>&1; then
    curl -L \"https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi
"

echo "✅ Dependencias instaladas"

echo ""
echo "🚀 3. EJECUTANDO SETUP EN EL VPS..."
echo "==================================="

# Dar permisos y ejecutar setup
run_remote "
cd /opt/sancho-distribuidora
chmod +x setup-completo.sh
chmod +x comandos-rapidos.sh
echo 'Ejecutando setup automático...'
"

echo ""
echo "🌐 4. EJECUTANDO DIAGNÓSTICO COMPLETO..."
echo "========================================"

# Ejecutar el setup completo
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no -t "$VPS_USER@$VPS_IP" "cd /opt/sancho-distribuidora && ./setup-completo.sh"

echo ""
echo "🎉 DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "🌐 URLs de tu aplicación:"
echo "- Frontend: https://www.sanchodistribuidora.com"
echo "- API: https://api.sanchodistribuidora.com"
echo "- Dashboard Traefik: http://$VPS_IP:8080"
echo ""
echo "📱 Para administrar tu VPS:"
echo "- SSH: ssh root@$VPS_IP"
echo "- Carpeta del proyecto: /opt/sancho-distribuidora"
echo ""
echo "🛠️ Comandos útiles (ejecutar en el VPS):"
echo "- Ver estado: cd /opt/sancho-distribuidora && ./comandos-rapidos.sh estado"
echo "- Ver logs: cd /opt/sancho-distribuidora && ./comandos-rapidos.sh logs"
echo "- Reiniciar: cd /opt/sancho-distribuidora && ./comandos-rapidos.sh reiniciar"
echo ""
echo "🔍 Para verificar que todo funciona:"
echo "1. Abre https://www.sanchodistribuidora.com en tu navegador"
echo "2. Verifica que el dashboard funcione en http://$VPS_IP:8080"
echo "3. Prueba la API en https://api.sanchodistribuidora.com"
