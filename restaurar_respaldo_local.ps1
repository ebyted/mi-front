# Script para Restaurar Respaldo Local
# Uso: .\restaurar_respaldo_local.ps1 [nombre_nueva_bd]

param(
    [string]$DatabaseName = "maestro_inventario_restore",
    [string]$ContainerName = "maestro-postgres",
    [string]$Username = "postgres",
    [string]$BackupFile = "bdtotal_local.sql"
)

Write-Host "🔄 Iniciando restauración de respaldo local..." -ForegroundColor Green
Write-Host "📋 Configuración:" -ForegroundColor Yellow
Write-Host "   • Contenedor: $ContainerName"
Write-Host "   • Usuario: $Username"
Write-Host "   • Base de datos destino: $DatabaseName"
Write-Host "   • Archivo de respaldo: $BackupFile"
Write-Host ""

# Verificar que el archivo de respaldo existe
if (!(Test-Path $BackupFile)) {
    Write-Host "❌ ERROR: No se encontró el archivo de respaldo '$BackupFile'" -ForegroundColor Red
    Write-Host "   Asegúrate de que el archivo esté en el directorio actual." -ForegroundColor Yellow
    exit 1
}

# Verificar que el contenedor esté corriendo
$containerRunning = docker ps --filter "name=$ContainerName" --format "{{.Names}}"
if ($containerRunning -ne $ContainerName) {
    Write-Host "❌ ERROR: El contenedor '$ContainerName' no está corriendo" -ForegroundColor Red
    Write-Host "   Inicia el contenedor con: docker start $ContainerName" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Verificaciones pasadas, continuando..." -ForegroundColor Green
Write-Host ""

try {
    # Paso 1: Verificar conexión
    Write-Host "🔍 Verificando conexión a PostgreSQL..." -ForegroundColor Cyan
    docker exec $ContainerName psql -U $Username -c "SELECT version();" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo conectar a PostgreSQL"
    }
    Write-Host "✅ Conexión exitosa" -ForegroundColor Green

    # Paso 2: Eliminar base de datos si existe
    Write-Host "🗑️  Eliminando base de datos existente (si existe)..." -ForegroundColor Cyan
    docker exec $ContainerName psql -U $Username -c "DROP DATABASE IF EXISTS `"$DatabaseName`";" 2>$null

    # Paso 3: Crear nueva base de datos
    Write-Host "🏗️  Creando nueva base de datos '$DatabaseName'..." -ForegroundColor Cyan
    docker exec $ContainerName psql -U $Username -c "CREATE DATABASE `"$DatabaseName`";"
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo crear la base de datos"
    }
    Write-Host "✅ Base de datos creada" -ForegroundColor Green

    # Paso 4: Restaurar el respaldo
    Write-Host "📥 Restaurando respaldo..." -ForegroundColor Cyan
    Write-Host "   (Esto puede tomar unos momentos...)" -ForegroundColor Yellow
    
    Get-Content $BackupFile | docker exec -i $ContainerName psql -U $Username -d $DatabaseName
    if ($LASTEXITCODE -ne 0) {
        throw "Error durante la restauración"
    }
    Write-Host "✅ Respaldo restaurado exitosamente" -ForegroundColor Green

    # Paso 5: Verificar la restauración
    Write-Host "🔍 Verificando la restauración..." -ForegroundColor Cyan
    $tableCount = docker exec $ContainerName psql -U $Username -d $DatabaseName -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
    $userCount = docker exec $ContainerName psql -U $Username -d $DatabaseName -t -c "SELECT COUNT(*) FROM users;" 2>$null
    $productCount = docker exec $ContainerName psql -U $Username -d $DatabaseName -t -c "SELECT COUNT(*) FROM products;" 2>$null

    Write-Host "📊 Estadísticas de la restauración:" -ForegroundColor Green
    Write-Host "   • Tablas creadas: $($tableCount.Trim())"
    if ($userCount) { Write-Host "   • Usuarios: $($userCount.Trim())" }
    if ($productCount) { Write-Host "   • Productos: $($productCount.Trim())" }

    Write-Host ""
    Write-Host "🎉 ¡Restauración completada exitosamente!" -ForegroundColor Green
    Write-Host "🔗 Para conectarte a la base de datos restaurada:" -ForegroundColor Yellow
    Write-Host "   docker exec -it $ContainerName psql -U $Username -d $DatabaseName"
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ ERROR durante la restauración: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Pasos para solucionar:" -ForegroundColor Yellow
    Write-Host "   1. Verificar que el contenedor '$ContainerName' esté corriendo"
    Write-Host "   2. Verificar que el usuario '$Username' tenga permisos"
    Write-Host "   3. Verificar que el archivo '$BackupFile' no esté corrupto"
    Write-Host "   4. Revisar los logs del contenedor: docker logs $ContainerName"
    exit 1
}
