# Script de deployment con Traefik para Maestro Inventario
# Uso: .\deploy-traefik.ps1

Write-Host "🚀 Iniciando deployment con Traefik..." -ForegroundColor Green

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "❌ Error: docker-compose.yml no encontrado" -ForegroundColor Red
    Write-Host "Ejecuta este script desde la raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

try {
    # Crear red de Traefik si no existe
    Write-Host "🔗 Creando red de Docker..." -ForegroundColor Blue
    docker network create maestro_network 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Red ya existe o se creó correctamente" -ForegroundColor Yellow
    }

    # Parar servicios existentes
    Write-Host "⏹️ Parando servicios existentes..." -ForegroundColor Yellow
    docker-compose down --remove-orphans

    # Construir y iniciar servicios
    Write-Host "🏗️ Construyendo servicios..." -ForegroundColor Blue
    docker-compose build --no-cache

    Write-Host "🚀 Iniciando servicios con Traefik..." -ForegroundColor Blue
    docker-compose up -d

    # Esperar a que los servicios estén listos
    Write-Host "⏳ Esperando que los servicios estén listos..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30

    # Verificar estado de los servicios
    Write-Host "📊 Estado de los servicios:" -ForegroundColor Blue
    docker-compose ps

    # Verificar conectividad
    Write-Host "🔍 Verificando conectividad..." -ForegroundColor Blue

    # Test del backend
    Write-Host -NoNewline "Backend API: "
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8030/api/" -TimeoutSec 5 -UseBasicParsing
        Write-Host "✅ OK" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error" -ForegroundColor Red
    }

    # Test del frontend a través de Traefik
    Write-Host -NoNewline "Frontend (Traefik): "
    try {
        $headers = @{ "Host" = "www.sanchodistribuidora.com" }
        $response = Invoke-WebRequest -Uri "http://localhost/" -Headers $headers -TimeoutSec 5 -UseBasicParsing
        Write-Host "✅ OK" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error" -ForegroundColor Red
    }

    # Mostrar información útil
    Write-Host "`n✅ Deployment completado!" -ForegroundColor Green
    Write-Host "`n📋 Información del deployment:" -ForegroundColor Blue
    Write-Host "• Frontend: https://www.sanchodistribuidora.com"
    Write-Host "• API: https://api.sanchodistribuidora.com"
    Write-Host "• Traefik Dashboard: https://traefik.sanchodistribuidora.com"
    Write-Host "• Dashboard User: admin"
    Write-Host "• Dashboard Pass: admin123"
    
    Write-Host "`n📝 Configuración DNS necesaria:" -ForegroundColor Yellow
    Write-Host "• A Record: www.sanchodistribuidora.com -> 168.231.67.221"
    Write-Host "• A Record: api.sanchodistribuidora.com -> 168.231.67.221"
    Write-Host "• A Record: traefik.sanchodistribuidora.com -> 168.231.67.221"
    Write-Host "• A Record: sanchodistribuidora.com -> 168.231.67.221"
    
    Write-Host "`n🔧 Comandos útiles:" -ForegroundColor Blue
    Write-Host "• Ver logs: docker-compose logs -f [servicio]"
    Write-Host "• Reiniciar: docker-compose restart [servicio]"
    Write-Host "• Parar todo: docker-compose down"
    Write-Host "• Estado: docker-compose ps"

    # Preguntar si mostrar logs
    $showLogs = Read-Host "`n¿Mostrar logs en tiempo real? (y/N)"
    if ($showLogs -eq "y" -or $showLogs -eq "Y") {
        Write-Host "📄 Mostrando logs (Ctrl+C para salir):" -ForegroundColor Blue
        docker-compose logs -f --tail=50
    }

} catch {
    Write-Host "❌ Error durante el deployment: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
