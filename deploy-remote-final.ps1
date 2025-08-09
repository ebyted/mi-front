# Script PowerShell para ejecutar deploy desde Windows
# Ejecuta el deploy automatizado en el VPS remoto
# Versión simplificada y funcional

param(
    [switch]$Help,
    [switch]$Status,
    [switch]$Force
)

# Función de ayuda
if ($Help) {
    Write-Host "🚀 DEPLOY REMOTO - Sancho Distribuidora Frontend" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "USO:" -ForegroundColor Cyan
    Write-Host "  .\deploy-remote-final.ps1                # Deploy normal con confirmación"
    Write-Host "  .\deploy-remote-final.ps1 -Status        # Solo verificar estado actual"
    Write-Host "  .\deploy-remote-final.ps1 -Force         # Deploy sin confirmación"
    Write-Host "  .\deploy-remote-final.ps1 -Help          # Mostrar esta ayuda"
    Write-Host ""
    Write-Host "DESCRIPCIÓN:" -ForegroundColor Cyan
    Write-Host "  Este script ejecuta el deploy automatizado del frontend en el VPS remoto."
    Write-Host "  Incluye verificaciones de estado, logs detallados y manejo de errores."
    Write-Host ""
    exit 0
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "🚀 DEPLOY REMOTO - Sancho Distribuidora Frontend" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "📅 Iniciado: $timestamp" -ForegroundColor Gray

$VpsHost = "root@168.231.67.221"
$DeployPath = "/etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code"

Write-Host "📡 Conectando a VPS: $VpsHost" -ForegroundColor Cyan
Write-Host "📁 Directorio deploy: $DeployPath" -ForegroundColor Cyan
Write-Host ""

# Verificar conectividad al VPS
Write-Host "🔍 Verificando conectividad..." -ForegroundColor Yellow
try {
    ssh -o ConnectTimeout=10 $VpsHost "echo Conexion-exitosa" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Error de conexión"
    }
    Write-Host "✅ Conexión establecida" -ForegroundColor Green
}
catch {
    Write-Host "❌ Error: No se pudo conectar al VPS" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Mostrar estado actual
Write-Host "📊 Estado actual del frontend:" -ForegroundColor Cyan
ssh $VpsHost "docker ps --filter name=sancho_frontend_v2"
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Frontend no está corriendo o no existe" -ForegroundColor Yellow
}

# Verificar acceso web actual
Write-Host ""
Write-Host "🌐 Verificando acceso web actual:" -ForegroundColor Cyan
try {
    $currentResponse = Invoke-WebRequest -Uri "https://www.sanchodistribuidora.com" -Method Head -TimeoutSec 5
    if ($currentResponse.StatusCode -eq 200) {
        Write-Host "✅ Sitio web actualmente accesible (HTTP $($currentResponse.StatusCode))" -ForegroundColor Green
    }
}
catch {
    Write-Host "⚠️  Sitio web no responde actualmente" -ForegroundColor Yellow
}

# Si solo se pidió verificar estado, salir aquí
if ($Status) {
    Write-Host ""
    Write-Host "📊 Verificación de estado completada" -ForegroundColor Green
    Write-Host "💡 Para hacer deploy, ejecuta sin el parámetro -Status" -ForegroundColor Cyan
    exit 0
}

Write-Host ""

# Preguntar confirmación (a menos que se use -Force)
if (-not $Force) {
    $confirm = Read-Host "Continuar con el deploy? (y/N)"
    if ($confirm -notmatch '^[Yy]$') {
        Write-Host "❌ Deploy cancelado" -ForegroundColor Red
        exit 0
    }
} else {
    Write-Host "🚨 Deploy forzado (sin confirmación)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Iniciando deploy automático..." -ForegroundColor Green
Write-Host "⏳ Este proceso puede tomar varios minutos..." -ForegroundColor Yellow
Write-Host ""

# Ejecutar deploy completo en el VPS
Write-Host "🔄 Ejecutando script de deploy automatizado en VPS..." -ForegroundColor Yellow
$deployStart = Get-Date

ssh $VpsHost "cd $DeployPath && ./auto-deploy.sh"
$deployEnd = Get-Date
$deployDuration = $deployEnd - $deployStart

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 DEPLOY COMPLETADO EXITOSAMENTE" -ForegroundColor Green
    $minutes = [math]::Round($deployDuration.TotalMinutes, 1)
    Write-Host "⏱️  Duración total: $minutes minutos" -ForegroundColor Gray
    Write-Host "🌐 Sitio disponible en: https://www.sanchodistribuidora.com" -ForegroundColor Cyan
    
    # Verificación final mejorada
    Write-Host ""
    Write-Host "🔍 Verificación final del sitio:" -ForegroundColor Yellow
    
    # Esperar un momento para que el contenedor esté completamente listo
    Start-Sleep -Seconds 5
    
    try {
        $response = Invoke-WebRequest -Uri "https://www.sanchodistribuidora.com" -Method Head -TimeoutSec 15
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Sitio web respondiendo correctamente (HTTP $($response.StatusCode))" -ForegroundColor Green
            Write-Host "🔐 SSL/TLS funcionando correctamente" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Sitio responde pero con código: $($response.StatusCode)" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "⚠️  Sitio web puede tardar unos momentos en responder" -ForegroundColor Yellow
        Write-Host "💡 Intenta acceder en tu navegador en unos minutos" -ForegroundColor Cyan
    }
}
else {
    Write-Host ""
    Write-Host "❌ ERROR EN EL DEPLOY" -ForegroundColor Red
    $minutes = [math]::Round($deployDuration.TotalMinutes, 1)
    Write-Host "⏱️  Duración antes del error: $minutes minutos" -ForegroundColor Gray
    Write-Host "📋 Revisando logs del frontend..." -ForegroundColor Yellow
    
    # Mostrar logs detallados para diagnóstico
    ssh $VpsHost "docker logs sancho_frontend_v2 --tail 20"
    
    Write-Host ""
    Write-Host "📋 Revisando logs de Traefik..." -ForegroundColor Yellow
    ssh $VpsHost "docker logs sancho_traefik_v2 --tail 10"
    
    Write-Host ""
    Write-Host "💡 Sugerencias para resolver problemas:" -ForegroundColor Cyan
    Write-Host "   1. Verificar que todos los contenedores estén en la misma red" -ForegroundColor Gray
    Write-Host "   2. Revisar las etiquetas de Traefik en el contenedor frontend" -ForegroundColor Gray
    Write-Host "   3. Ejecutar manualmente el comando de deploy en el VPS" -ForegroundColor Gray
    
    exit 1
}

Write-Host ""
Write-Host "📊 Estado final del sistema:" -ForegroundColor Cyan
ssh $VpsHost "docker ps --filter name=sancho"

Write-Host ""
$finalTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "📅 Finalizado: $finalTime" -ForegroundColor Gray
Write-Host "✨ Deploy remoto completado" -ForegroundColor Green
