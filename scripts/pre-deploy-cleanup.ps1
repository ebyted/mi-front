# Script de Limpieza Pre-Deploy para Windows PowerShell
# Limpia todos los contenedores para evitar conflictos de nombres
# Los datos persisten en volúmenes externos

Write-Host "🧹 Iniciando limpieza pre-deploy..." -ForegroundColor Cyan

# Detener todos los contenedores de la aplicación
Write-Host "📦 Deteniendo contenedores..." -ForegroundColor Yellow

$traefikContainers = docker ps -q --filter "name=sancho_traefik"
$backendContainers = docker ps -q --filter "name=sancho_backend"  
$frontendContainers = docker ps -q --filter "name=sancho_frontend"
$dbContainers = docker ps -q --filter "name=sancho_db"

if ($traefikContainers) { docker stop $traefikContainers }
if ($backendContainers) { docker stop $backendContainers }
if ($frontendContainers) { docker stop $frontendContainers }
if ($dbContainers) { docker stop $dbContainers }

Write-Host "🗑️ Eliminando contenedores..." -ForegroundColor Yellow

$allTraefikContainers = docker ps -aq --filter "name=sancho_traefik"
$allBackendContainers = docker ps -aq --filter "name=sancho_backend"
$allFrontendContainers = docker ps -aq --filter "name=sancho_frontend"
$allDbContainers = docker ps -aq --filter "name=sancho_db"

if ($allTraefikContainers) { docker rm $allTraefikContainers }
if ($allBackendContainers) { docker rm $allBackendContainers }
if ($allFrontendContainers) { docker rm $allFrontendContainers }
if ($allDbContainers) { docker rm $allDbContainers }

# Limpiar imágenes no utilizadas
Write-Host "🧽 Limpiando imágenes no utilizadas..." -ForegroundColor Yellow
docker image prune -f

# Verificar que los volúmenes persisten
Write-Host "🔍 Verificando volúmenes persistentes..." -ForegroundColor Yellow
$postgresVol = docker volume ls -q --filter "name=sancho_postgres_data"
$sslVol = docker volume ls -q --filter "name=traefik_letsencrypt"

if ($postgresVol) {
    Write-Host "✅ Volumen de BD encontrado: $postgresVol" -ForegroundColor Green
} else {
    Write-Host "⚠️  Volumen de BD no encontrado, será creado en el deploy" -ForegroundColor Orange
}

if ($sslVol) {
    Write-Host "✅ Volumen SSL encontrado: $sslVol" -ForegroundColor Green
} else {
    Write-Host "⚠️  Volumen SSL no encontrado, será creado en el deploy" -ForegroundColor Orange
}

Write-Host "✅ Limpieza completada. El deploy puede proceder." -ForegroundColor Green
