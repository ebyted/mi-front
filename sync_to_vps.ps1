# Script PowerShell para sincronizar base de datos local con VPS
# Uso: .\sync_to_vps.ps1

param(
    [string]$VPSHost = "tu-servidor.com",
    [string]$VPSUser = "usuario",
    [string]$VPSPath = "/ruta/a/tu/proyecto"
)

Write-Host "🚀 Iniciando sincronización con VPS..." -ForegroundColor Green

# 1. Crear backup de PostgreSQL local
Write-Host "📦 Creando backup de base de datos local..." -ForegroundColor Yellow
docker-compose exec postgres pg_dump -U postgres maestro_inventario > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup creado exitosamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error creando backup" -ForegroundColor Red
    exit 1
}

# 2. Comprimir backup
$backupFile = Get-ChildItem -Filter "backup_*.sql" | Sort-Object CreationTime -Descending | Select-Object -First 1
Write-Host "🗜️ Comprimiendo $($backupFile.Name)..." -ForegroundColor Yellow
Compress-Archive -Path $backupFile.FullName -DestinationPath "$($backupFile.BaseName).zip"

# 3. Subir al VPS usando SCP
Write-Host "⬆️ Subiendo backup al VPS..." -ForegroundColor Yellow
scp "$($backupFile.BaseName).zip" "${VPSUser}@${VPSHost}:${VPSPath}/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Archivo subido exitosamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error subiendo archivo" -ForegroundColor Red
    exit 1
}

# 4. Ejecutar comandos en VPS
Write-Host "🔄 Ejecutando restauración en VPS..." -ForegroundColor Yellow

$vpsCommands = @"
cd $VPSPath
unzip -o $($backupFile.BaseName).zip
docker-compose down
docker-compose up -d postgres
sleep 10
docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS maestro_inventario;"
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE maestro_inventario;"
docker-compose exec postgres psql -U postgres -d maestro_inventario < $($backupFile.Name)
docker-compose up -d
rm $($backupFile.Name) $($backupFile.BaseName).zip
"@

ssh "${VPSUser}@${VPSHost}" $vpsCommands

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Sincronización completada exitosamente!" -ForegroundColor Green
    
    # Limpiar archivos locales
    Remove-Item $backupFile.FullName
    Remove-Item "$($backupFile.BaseName).zip"
    
    Write-Host "🧹 Archivos temporales limpiados" -ForegroundColor Yellow
} else {
    Write-Host "❌ Error en la sincronización" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 ¡Proceso completado!" -ForegroundColor Green
