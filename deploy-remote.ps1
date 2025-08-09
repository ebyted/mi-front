# Script PowerShell para ejecutar deploy desde Windows
# Ejecuta el deploy automatizado en el VPS remoto

Write-Host "🚀 DEPLOY REMOTO - Sancho Distribuidora Frontend" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

$VpsHost = "root@168.231.67.221"
$DeployPath = "/etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code"

Write-Host "📡 Conectando a VPS: $VpsHost" -ForegroundColor Cyan
Write-Host "📁 Directorio deploy: $DeployPath" -ForegroundColor Cyan
Write-Host ""

# Verificar conectividad al VPS
Write-Host "🔍 Verificando conectividad..." -ForegroundColor Yellow
try {
    ssh -o ConnectTimeout=10 $VpsHost "echo 'Conexión exitosa'" | Out-Null
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
    Write-Host "⚠️  Frontend no está corriendo" -ForegroundColor Yellow
}

Write-Host ""

# Preguntar confirmación
$confirm = Read-Host "¿Continuar con el deploy? (y/N)"
if ($confirm -notmatch '^[Yy]$') {
    Write-Host "❌ Deploy cancelado" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 Iniciando deploy automático..." -ForegroundColor Green
Write-Host "⏳ Este proceso puede tomar varios minutos..." -ForegroundColor Yellow
Write-Host ""

# Ejecutar deploy completo en el VPS
ssh $VpsHost "cd $DeployPath && ./auto-deploy.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 DEPLOY COMPLETADO EXITOSAMENTE" -ForegroundColor Green
    Write-Host "🌐 Sitio disponible en: https://www.sanchodistribuidora.com" -ForegroundColor Cyan
    
    # Verificación final
    Write-Host ""
    Write-Host "🔍 Verificación final del sitio:" -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "https://www.sanchodistribuidora.com" -Method Head -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Sitio web respondiendo correctamente" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️  Sitio web puede tardar unos momentos en responder" -ForegroundColor Yellow
    }
}
else {
    Write-Host ""
    Write-Host "❌ ERROR EN EL DEPLOY" -ForegroundColor Red
    Write-Host "📋 Revisando logs..." -ForegroundColor Yellow
    ssh $VpsHost "docker logs sancho_frontend_v2 --tail 20"
    exit 1
}

Write-Host ""
Write-Host "📊 Estado final del sistema:" -ForegroundColor Cyan
ssh $VpsHost "docker ps --filter name=sancho"
