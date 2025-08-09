# Script de Limpieza Pre-Deploy para Windows PowerShell
# Solo limpia contenedores de aplicación (backend/frontend)
# Preserva BD y Traefik (infraestructura)

Write-Host "🧹 Iniciando limpieza pre-deploy..." -ForegroundColor Cyan

# Detener y eliminar solo contenedores de aplicación
Write-Host "📦 Deteniendo contenedores de aplicación..." -ForegroundColor Yellow

$backendContainers = docker ps -q --filter "name=sancho_backend"  
$frontendContainers = docker ps -q --filter "name=sancho_frontend"

if ($backendContainers) { docker stop $backendContainers }
if ($frontendContainers) { docker stop $frontendContainers }

Write-Host "🗑️ Eliminando contenedores de aplicación..." -ForegroundColor Yellow

$allBackendContainers = docker ps -aq --filter "name=sancho_backend"
$allFrontendContainers = docker ps -aq --filter "name=sancho_frontend"

if ($allBackendContainers) { docker rm $allBackendContainers }
if ($allFrontendContainers) { docker rm $allFrontendContainers }

# Limpiar imágenes no utilizadas
Write-Host "🧽 Limpiando imágenes no utilizadas..." -ForegroundColor Yellow
docker image prune -f

# Verificar que la infraestructura sigue corriendo
Write-Host "🔍 Verificando estado de la infraestructura..." -ForegroundColor Yellow
$dbStatus = docker ps --filter "name=sancho_db_persistent" --format "{{.Status}}"
$traefikStatus = docker ps --filter "name=sancho_traefik_persistent" --format "{{.Status}}"

if ($dbStatus) {
    Write-Host "✅ Base de datos OK: $dbStatus" -ForegroundColor Green
} else {
    Write-Host "⚠️  Base de datos no encontrada, será creada en el deploy" -ForegroundColor Orange
}

if ($traefikStatus) {
    Write-Host "✅ Traefik OK: $traefikStatus" -ForegroundColor Green
} else {
    Write-Host "⚠️  Traefik no encontrado, será creado en el deploy" -ForegroundColor Orange
}

Write-Host "✅ Limpieza completada. El deploy puede proceder." -ForegroundColor Green
