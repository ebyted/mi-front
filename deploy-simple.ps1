#!/usr/bin/env pwsh
# Script para desplegar backend HTTPS - Resuelve Mixed Content

$VPS_IP = "168.231.67.221"
$VPS_USER = "root"

Write-Host "🚀 DESPLEGANDO BACKEND HTTPS" -ForegroundColor Green

# 1. Verificar conectividad
Write-Host "🔍 Verificando conectividad..." -ForegroundColor Yellow
$ping = Test-Connection -ComputerName $VPS_IP -Count 1 -Quiet
if (-not $ping) {
    Write-Host "❌ No se puede conectar al servidor" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Servidor accesible" -ForegroundColor Green

# 2. Subir configuración
Write-Host "📤 Subiendo docker-compose.yml..." -ForegroundColor Cyan
$scpResult = scp "docker-compose-final.yml" "${VPS_USER}@${VPS_IP}:/root/docker-compose.yml"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Archivo subido correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error subiendo archivo" -ForegroundColor Red
    exit 1
}

# 3. Reiniciar servicios
Write-Host "🔄 Reiniciando servicios..." -ForegroundColor Cyan
ssh $VPS_USER@$VPS_IP "docker-compose down && docker-compose up -d"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Servicios reiniciados" -ForegroundColor Green
    
    # 4. Esperar un momento y verificar estado
    Start-Sleep -Seconds 15
    Write-Host "🔍 Verificando estado..." -ForegroundColor Cyan
    ssh $VPS_USER@$VPS_IP "docker ps"
    
    Write-Host ""
    Write-Host "🎉 DESPLIEGUE COMPLETADO" -ForegroundColor Green
    Write-Host "✅ Frontend: https://www.sanchodistribuidora.com" -ForegroundColor Green
    Write-Host "✅ API: https://www.sanchodistribuidora.com/api/" -ForegroundColor Green
    
} else {
    Write-Host "❌ Error reiniciando servicios" -ForegroundColor Red
    ssh $VPS_USER@$VPS_IP "docker-compose logs"
}
