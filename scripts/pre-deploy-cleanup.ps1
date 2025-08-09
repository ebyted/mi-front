# Script de Limpieza Pre-Deploy para Windows PowerShell
# Solo limpia contenedores recreables, preserva la BD

Write-Host "🧹 Iniciando limpieza pre-deploy..." -ForegroundColor Cyan

# Detener y eliminar contenedores recreables (NO la BD)
Write-Host "📦 Deteniendo contenedores recreables..." -ForegroundColor Yellow

$traefikContainers = docker ps -q --filter "name=sancho_traefik"
$backendContainers = docker ps -q --filter "name=sancho_backend"  
$frontendContainers = docker ps -q --filter "name=sancho_frontend"

if ($traefikContainers) { docker stop $traefikContainers }
if ($backendContainers) { docker stop $backendContainers }
if ($frontendContainers) { docker stop $frontendContainers }

Write-Host "🗑️ Eliminando contenedores recreables..." -ForegroundColor Yellow

$allTraefikContainers = docker ps -aq --filter "name=sancho_traefik"
$allBackendContainers = docker ps -aq --filter "name=sancho_backend"
$allFrontendContainers = docker ps -aq --filter "name=sancho_frontend"

if ($allTraefikContainers) { docker rm $allTraefikContainers }
if ($allBackendContainers) { docker rm $allBackendContainers }
if ($allFrontendContainers) { docker rm $allFrontendContainers }

# Limpiar imágenes no utilizadas
Write-Host "🧽 Limpiando imágenes no utilizadas..." -ForegroundColor Yellow
docker image prune -f

# Verificar que la BD sigue corriendo
Write-Host "🔍 Verificando estado de la base de datos..." -ForegroundColor Yellow
$dbStatus = docker ps --filter "name=sancho_db_persistent" --format "{{.Status}}"
if ($dbStatus) {
    Write-Host "✅ Base de datos OK: $dbStatus" -ForegroundColor Green
} else {
    Write-Host "⚠️  Base de datos no encontrada, será creada en el deploy" -ForegroundColor Orange
}

Write-Host "✅ Limpieza completada. El deploy puede proceder." -ForegroundColor Green
