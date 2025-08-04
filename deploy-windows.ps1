# 🚀 DEPLOYMENT AL VPS DESDE WINDOWS
# ==================================

$VPS_IP = "168.231.67.221"
$VPS_USER = "root"
$VPS_PASSWORD = "Arkano-IA2025+"

Write-Host "🚀 DEPLOYMENT AUTOMÁTICO A VPS" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host "IP: $VPS_IP"
Write-Host "Usuario: $VPS_USER"
Write-Host ""

# Verificar si PuTTY/pscp está disponible
if (!(Get-Command "pscp" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ PuTTY/pscp no está instalado" -ForegroundColor Red
    Write-Host "Descarga PuTTY desde: https://www.putty.org/"
    Write-Host "O usa WSL/Git Bash para ejecutar el script .sh"
    exit 1
}

# Función para ejecutar comandos remotos
function Run-Remote {
    param($Command)
    echo y | plink -ssh -pw $VPS_PASSWORD "$VPS_USER@$VPS_IP" $Command
}

# Función para copiar archivos
function Copy-ToVPS {
    param($LocalFile, $RemotePath)
    echo y | pscp -pw $VPS_PASSWORD $LocalFile "$VPS_USER@${VPS_IP}:$RemotePath"
}

Write-Host "📂 1. COPIANDO ARCHIVOS AL VPS..." -ForegroundColor Blue
Write-Host "=================================="

# Crear directorio
Run-Remote "mkdir -p /opt/sancho-distribuidora"

# Copiar archivos principales
if (Test-Path "docker-compose.yml") {
    Copy-ToVPS "docker-compose.yml" "/opt/sancho-distribuidora/"
    Write-Host "✅ docker-compose.yml copiado" -ForegroundColor Green
}

if (Test-Path "setup-completo.sh") {
    Copy-ToVPS "setup-completo.sh" "/opt/sancho-distribuidora/"
    Write-Host "✅ setup-completo.sh copiado" -ForegroundColor Green
}

if (Test-Path "comandos-rapidos.sh") {
    Copy-ToVPS "comandos-rapidos.sh" "/opt/sancho-distribuidora/"
    Write-Host "✅ comandos-rapidos.sh copiado" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔧 2. INSTALANDO DEPENDENCIAS..." -ForegroundColor Blue
Write-Host "================================"

# Instalar Docker y dependencias
Run-Remote @"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl wget git
if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
fi
if ! command -v docker-compose >/dev/null 2>&1; then
    curl -L 'https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)' -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi
"@

Write-Host "✅ Dependencias instaladas" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 3. EJECUTANDO SETUP..." -ForegroundColor Blue
Write-Host "========================="

# Dar permisos y ejecutar
Run-Remote "cd /opt/sancho-distribuidora && chmod +x *.sh"

Write-Host ""
Write-Host "🎉 ARCHIVOS COPIADOS AL VPS" -ForegroundColor Green
Write-Host "============================"
Write-Host ""
Write-Host "🔗 Para completar el setup, conecta al VPS y ejecuta:" -ForegroundColor Yellow
Write-Host "ssh root@$VPS_IP" -ForegroundColor Cyan
Write-Host "cd /opt/sancho-distribuidora" -ForegroundColor Cyan
Write-Host "./setup-completo.sh" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 URLs una vez completado:" -ForegroundColor Yellow
Write-Host "- Frontend: https://www.sanchodistribuidora.com"
Write-Host "- API: https://api.sanchodistribuidora.com"
Write-Host "- Dashboard: http://$VPS_IP:8080"
