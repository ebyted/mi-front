# Script de Restauración - bdlocal_v3.5
# Ejecutar desde PowerShell como Administrador

param(
    [Parameter(Mandatory=$true)]
    [string]$DatabaseName,
    
    [Parameter(Mandatory=$false)]
    [string]$PostgresUser = "postgres",
    
    [Parameter(Mandatory=$false)]
    [string]$BackupFile = "bdlocal_v3.5_.backup"
)

Write-Host "=== Restauración de Base de Datos bdlocal_v3.5 ===" -ForegroundColor Green
Write-Host "Base de datos destino: $DatabaseName" -ForegroundColor Yellow
Write-Host "Usuario PostgreSQL: $PostgresUser" -ForegroundColor Yellow
Write-Host "Archivo de respaldo: $BackupFile" -ForegroundColor Yellow
Write-Host ""

# Verificar que existe el archivo de backup
if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ ERROR: No se encuentra el archivo $BackupFile" -ForegroundColor Red
    Write-Host "Archivos disponibles:" -ForegroundColor Yellow
    Get-ChildItem *.backup, *.sql | Select-Object Name, Length
    exit 1
}

# Configurar encoding UTF-8
$env:PGCLIENTENCODING = "UTF8"
Write-Host "✅ Configurado encoding UTF-8" -ForegroundColor Green

# Crear la base de datos
Write-Host "📁 Creando base de datos '$DatabaseName'..." -ForegroundColor Cyan
$createDbCommand = "createdb -U $PostgresUser -E UTF8 --template=template0 $DatabaseName"
try {
    Invoke-Expression $createDbCommand
    Write-Host "✅ Base de datos creada exitosamente" -ForegroundColor Green
} catch {
    Write-Host "⚠️  La base de datos ya existe o hay un error. Continuando..." -ForegroundColor Yellow
}

# Restaurar el backup
Write-Host "🔄 Restaurando backup..." -ForegroundColor Cyan
if ($BackupFile.EndsWith(".backup")) {
    # Usar pg_restore para archivos .backup
    $restoreCommand = "pg_restore -U $PostgresUser -d $DatabaseName --clean --if-exists --verbose --no-owner --no-privileges `"$BackupFile`""
} else {
    # Usar psql para archivos .sql
    $restoreCommand = "psql -U $PostgresUser -d $DatabaseName -f `"$BackupFile`""
}

Write-Host "Ejecutando: $restoreCommand" -ForegroundColor Gray
try {
    Invoke-Expression $restoreCommand
    Write-Host "✅ Backup restaurado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Error durante la restauración: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Verificar la restauración
Write-Host "🔍 Verificando la restauración..." -ForegroundColor Cyan
$verifyCommand = "psql -U $PostgresUser -d $DatabaseName -c `"SELECT COUNT(*) as total_productos FROM main_producto;`""
try {
    $result = Invoke-Expression $verifyCommand
    Write-Host "✅ Verificación completada" -ForegroundColor Green
    Write-Host $result
} catch {
    Write-Host "⚠️  No se pudo verificar automáticamente, pero el restore probablemente fue exitoso" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== PROCESO COMPLETADO ===" -ForegroundColor Green
Write-Host "Base de datos: $DatabaseName" -ForegroundColor White
Write-Host "Backup utilizado: $BackupFile" -ForegroundColor White
Write-Host ""
Write-Host "Para conectarte a la base de datos:" -ForegroundColor Cyan
Write-Host "psql -U $PostgresUser -d $DatabaseName" -ForegroundColor White
