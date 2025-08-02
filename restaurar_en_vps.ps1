# Script PowerShell para Restaurar Respaldo en VPS
# Uso: .\restaurar_en_vps.ps1 -Usuario tu_usuario_vps

param(
    [Parameter(Mandatory=$true)]
    [string]$Usuario,
    [string]$VPS_IP = "168.231.67.221",
    [string]$Container = "maestro_db", 
    [string]$DBUser = "maestro",
    [string]$BackupFile = "bdtotal_local.sql",
    [string]$TestDB = "bdtotal_test"
)

Write-Host "🚀 Iniciando restauración en VPS..." -ForegroundColor Green
Write-Host "📋 Configuración:" -ForegroundColor Yellow
Write-Host "   • VPS: $VPS_IP"
Write-Host "   • Usuario: $Usuario"
Write-Host "   • Contenedor: $Container"
Write-Host "   • Base de datos de prueba: $TestDB"
Write-Host "   • Archivo: $BackupFile"
Write-Host ""

# Verificar que el archivo existe localmente
if (!(Test-Path $BackupFile)) {
    Write-Host "❌ ERROR: No se encontró el archivo '$BackupFile'" -ForegroundColor Red
    exit 1
}

try {
    # Paso 1: Subir archivo al VPS
    Write-Host "📤 Subiendo archivo al VPS..." -ForegroundColor Cyan
    $scpCommand = "scp `"$BackupFile`" ${Usuario}@${VPS_IP}:/tmp/$BackupFile"
    Write-Host "Ejecutando: $scpCommand" -ForegroundColor Gray
    
    # Ejecutar SCP
    Invoke-Expression $scpCommand
    if ($LASTEXITCODE -ne 0) {
        throw "Error subiendo archivo al VPS"
    }
    Write-Host "✅ Archivo subido exitosamente" -ForegroundColor Green

    # Paso 2: Verificar contenedor en VPS
    Write-Host "🔍 Verificando contenedor en VPS..." -ForegroundColor Cyan
    $checkContainer = "ssh ${Usuario}@${VPS_IP} `"docker ps | grep $Container`""
    $containerResult = Invoke-Expression $checkContainer
    if (!$containerResult) {
        throw "Contenedor '$Container' no encontrado en el VPS"
    }
    Write-Host "✅ Contenedor encontrado: $($containerResult.Split()[0])" -ForegroundColor Green

    # Paso 3: Crear base de datos de prueba
    Write-Host "🏗️  Creando base de datos de prueba..." -ForegroundColor Cyan
    $createDB = "ssh ${Usuario}@${VPS_IP} `"docker exec $Container psql -U $DBUser -c 'DROP DATABASE IF EXISTS $TestDB; CREATE DATABASE $TestDB;'`""
    Invoke-Expression $createDB
    if ($LASTEXITCODE -ne 0) {
        throw "Error creando base de datos de prueba"
    }
    Write-Host "✅ Base de datos '$TestDB' creada" -ForegroundColor Green

    # Paso 4: Restaurar el respaldo
    Write-Host "📥 Restaurando respaldo..." -ForegroundColor Cyan
    Write-Host "   (Esto puede tomar unos momentos...)" -ForegroundColor Yellow
    $restoreDB = "ssh ${Usuario}@${VPS_IP} `"docker exec -i $Container psql -U $DBUser -d $TestDB < /tmp/$BackupFile`""
    Invoke-Expression $restoreDB
    if ($LASTEXITCODE -ne 0) {
        throw "Error durante la restauración"
    }
    Write-Host "✅ Respaldo restaurado exitosamente" -ForegroundColor Green

    # Paso 5: Verificar la restauración
    Write-Host "🔍 Verificando la restauración..." -ForegroundColor Cyan
    $verifyRestore = @"
ssh ${Usuario}@${VPS_IP} "docker exec $Container psql -U $DBUser -d $TestDB -c \"
SELECT 
    'users' as tabla, COUNT(*) as registros 
FROM users
UNION ALL
SELECT 'businesses', COUNT(*) FROM businesses
UNION ALL
SELECT 'business_users', COUNT(*) FROM business_users
UNION ALL
SELECT 'tables_total', COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'public';
\""
"@
    
    $verificationResult = Invoke-Expression $verifyRestore
    Write-Host "📊 Resultados de la verificación:" -ForegroundColor Green
    Write-Host $verificationResult

    # Paso 6: Verificar estructura específica
    Write-Host "🔍 Verificando estructura de tablas..." -ForegroundColor Cyan
    $checkTables = "ssh ${Usuario}@${VPS_IP} `"docker exec $Container psql -U $DBUser -d $TestDB -c '\dt'`""
    $tablesResult = Invoke-Expression $checkTables
    
    $tableCount = ($tablesResult -split "`n" | Where-Object { $_ -match "public \|" }).Count
    Write-Host "✅ Total de tablas creadas: $tableCount" -ForegroundColor Green

    # Paso 7: Limpiar archivo temporal
    Write-Host "🧹 Limpiando archivo temporal..." -ForegroundColor Cyan
    $cleanup = "ssh ${Usuario}@${VPS_IP} `"rm -f /tmp/$BackupFile`""
    Invoke-Expression $cleanup
    Write-Host "✅ Archivo temporal eliminado" -ForegroundColor Green

    Write-Host ""
    Write-Host "🎉 ¡Restauración completada exitosamente en el VPS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Resumen:" -ForegroundColor Yellow
    Write-Host "   • VPS: $VPS_IP" 
    Write-Host "   • Contenedor: $Container"
    Write-Host "   • Base de datos de prueba: $TestDB"
    Write-Host "   • Estado: Respaldo restaurado y verificado"
    Write-Host ""
    Write-Host "🔗 Para conectarte a la base de datos restaurada:" -ForegroundColor Yellow
    Write-Host "   ssh ${Usuario}@${VPS_IP}"
    Write-Host "   docker exec -it $Container psql -U $DBUser -d $TestDB"
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Red
    Write-Host "   La base de datos se restauró como '$TestDB' para pruebas."
    Write-Host "   Si todo funciona bien, puedes reemplazar la BD principal con:"
    Write-Host "   docker exec $Container psql -U $DBUser -c 'DROP DATABASE maestro;'"
    Write-Host "   docker exec $Container psql -U $DBUser -c 'ALTER DATABASE $TestDB RENAME TO maestro;'"
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "❌ ERROR durante la restauración: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Pasos para solucionar:" -ForegroundColor Yellow
    Write-Host "   1. Verificar conexión SSH al VPS: ssh ${Usuario}@${VPS_IP}"
    Write-Host "   2. Verificar que el contenedor esté corriendo: docker ps | grep $Container"
    Write-Host "   3. Verificar permisos del usuario en PostgreSQL"
    Write-Host "   4. Revisar logs: docker logs $Container"
    Write-Host ""
    Write-Host "📞 Comandos de diagnóstico:" -ForegroundColor Cyan
    Write-Host "   ssh ${Usuario}@${VPS_IP} 'docker exec $Container psql -U $DBUser -c `"SELECT version();`"'"
    Write-Host "   ssh ${Usuario}@${VPS_IP} 'docker logs $Container --tail 50'"
    exit 1
}
