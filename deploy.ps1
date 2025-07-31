# Script de Deploy para Maestro Inventario
# PowerShell Script

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "    DEPLOY MAESTRO INVENTARIO" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 1. Verificar Docker
Write-Host "`n1. Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker detectado: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ ERROR: Docker no está instalado o no está en el PATH" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

# 2. Verificar que Docker esté corriendo
Write-Host "`n2. Verificando que Docker esté corriendo..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✓ Docker está corriendo" -ForegroundColor Green
} catch {
    Write-Host "✗ ERROR: Docker no está corriendo" -ForegroundColor Red
    Write-Host "Inicia Docker Desktop primero" -ForegroundColor Yellow
    Read-Host "Presiona Enter después de iniciar Docker Desktop"
    
    # Esperar hasta que Docker esté disponible
    do {
        Start-Sleep -Seconds 2
        try {
            docker ps | Out-Null
            $dockerRunning = $true
        } catch {
            $dockerRunning = $false
        }
    } while (-not $dockerRunning)
    
    Write-Host "✓ Docker ahora está corriendo" -ForegroundColor Green
}

# 3. Preparar archivo .env
Write-Host "`n3. Preparando archivo de entorno..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✓ Archivo .env creado desde template" -ForegroundColor Green
    Write-Host "¡IMPORTANTE! Edita el archivo .env con tus datos reales:" -ForegroundColor Yellow
    Write-Host "  - DB_PASSWORD=tu_password_seguro" -ForegroundColor White
    Write-Host "  - SECRET_KEY=tu_secret_key_muy_largo" -ForegroundColor White
    Write-Host "  - DOMAIN=tu-dominio.com" -ForegroundColor White
    Read-Host "Presiona Enter cuando hayas editado .env"
} else {
    Write-Host "✓ Archivo .env ya existe" -ForegroundColor Green
}

# 4. Limpiar contenedores existentes
Write-Host "`n4. Deteniendo contenedores existentes..." -ForegroundColor Yellow
try {
    docker-compose down -v 2>$null
    Write-Host "✓ Contenedores detenidos" -ForegroundColor Green
} catch {
    Write-Host "! No había contenedores ejecutándose" -ForegroundColor Yellow
}

# 5. Limpiar sistema Docker
Write-Host "`n5. Limpiando sistema Docker..." -ForegroundColor Yellow
docker system prune -f | Out-Null
Write-Host "✓ Sistema Docker limpiado" -ForegroundColor Green

# 6. Construir imágenes
Write-Host "`n6. Construyendo imágenes (esto puede tomar varios minutos)..." -ForegroundColor Yellow
Write-Host "   Por favor espera..." -ForegroundColor Cyan
try {
    docker-compose build --no-cache
    Write-Host "✓ Imágenes construidas exitosamente" -ForegroundColor Green
} catch {
    Write-Host "✗ ERROR: Falló la construcción de imágenes" -ForegroundColor Red
    Write-Host "Logs del error:" -ForegroundColor Yellow
    docker-compose logs
    Read-Host "Presiona Enter para salir"
    exit 1
}

# 7. Iniciar servicios
Write-Host "`n7. Iniciando servicios..." -ForegroundColor Yellow
try {
    docker-compose up -d
    Write-Host "✓ Servicios iniciados" -ForegroundColor Green
} catch {
    Write-Host "✗ ERROR: Falló el inicio de servicios" -ForegroundColor Red
    docker-compose logs
    Read-Host "Presiona Enter para salir"
    exit 1
}

# 8. Esperar y verificar
Write-Host "`n8. Esperando que los servicios estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "`n9. Verificando estado de los servicios..." -ForegroundColor Yellow
docker-compose ps

Write-Host "`n10. Verificando logs del backend..." -ForegroundColor Yellow
Write-Host "Últimas 20 líneas de logs del backend:" -ForegroundColor Cyan
docker-compose logs --tail=20 backend

# Resultados
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "        DEPLOY COMPLETADO" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

Write-Host "`nURLs de acceso:" -ForegroundColor Green
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  - Backend:  http://localhost:8030" -ForegroundColor White
Write-Host "  - Admin:    http://localhost:8030/admin" -ForegroundColor White

Write-Host "`nComandos útiles:" -ForegroundColor Green
Write-Host "  - Ver logs: docker-compose logs -f" -ForegroundColor White
Write-Host "  - Reiniciar: docker-compose restart" -ForegroundColor White
Write-Host "  - Detener: docker-compose down" -ForegroundColor White

Write-Host "`nPrimera vez? Ejecuta las migraciones:" -ForegroundColor Yellow
Write-Host "  docker-compose exec backend python manage.py migrate" -ForegroundColor White
Write-Host "  docker-compose exec backend python manage.py createsuperuser" -ForegroundColor White

Read-Host "`nPresiona Enter para finalizar"
