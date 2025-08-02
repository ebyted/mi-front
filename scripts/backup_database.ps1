# =============================================================================
# SCRIPT DE RESPALDO PARA WINDOWS
# Sistema: Maestro Inventario - Windows Backup Script
# Versión: 1.0
# Autor: Sistema Automatizado
# =============================================================================

param(
    [string]$ProjectPath = "C:\inetpub\maestro_inventario",
    [string]$BackupPath = "C:\Backups\maestro_inventario",
    [int]$RetentionDays = 30,
    [switch]$Force
)

# Configuración
$ErrorActionPreference = "Stop"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"

# Funciones de utilidad
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Test-Prerequisites {
    Write-Log "Verificando prerrequisitos..."
    
    # Verificar que el directorio del proyecto existe
    if (-not (Test-Path $ProjectPath)) {
        Write-Log "Directorio del proyecto no encontrado: $ProjectPath" "ERROR"
        return $false
    }
    
    # Crear directorio de respaldos si no existe
    if (-not (Test-Path $BackupPath)) {
        Write-Log "Creando directorio de respaldos: $BackupPath"
        New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    }
    
    return $true
}

function Get-DatabaseConfig {
    Write-Log "Leyendo configuración de base de datos..."
    
    $envFile = Join-Path $ProjectPath ".env"
    $config = @{}
    
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match "^([^#][^=]+)=(.*)$") {
                $config[$matches[1]] = $matches[2]
            }
        }
    }
    
    # Valores por defecto
    if (-not $config.DATABASE_ENGINE) { $config.DATABASE_ENGINE = "django.db.backends.sqlite3" }
    if (-not $config.DATABASE_NAME) { $config.DATABASE_NAME = Join-Path $ProjectPath "db.sqlite3" }
    if (-not $config.DATABASE_HOST) { $config.DATABASE_HOST = "localhost" }
    
    return $config
}

function Backup-SQLiteDatabase {
    param([hashtable]$Config)
    
    $dbFile = $Config.DATABASE_NAME
    $backupFile = Join-Path $BackupPath "sqlite_backup_$Date.db"
    
    Write-Log "Iniciando respaldo SQLite: $dbFile"
    
    if (Test-Path $dbFile) {
        try {
            # Copiar archivo de base de datos
            Copy-Item $dbFile $backupFile
            
            # Comprimir usando 7-Zip si está disponible, sino usar Compress-Archive
            $compressedFile = "$backupFile.zip"
            
            if (Get-Command "7z" -ErrorAction SilentlyContinue) {
                & 7z a $compressedFile $backupFile
            } else {
                Compress-Archive -Path $backupFile -DestinationPath $compressedFile
            }
            
            # Eliminar archivo temporal
            Remove-Item $backupFile
            
            Write-Log "Respaldo SQLite completado: $compressedFile" "SUCCESS"
            
            # Crear también un dump SQL si sqlite3.exe está disponible
            if (Get-Command "sqlite3" -ErrorAction SilentlyContinue) {
                $sqlDump = Join-Path $BackupPath "sqlite_dump_$Date.sql"
                & sqlite3 $dbFile ".dump" | Out-File -FilePath $sqlDump -Encoding UTF8
                
                $compressedSql = "$sqlDump.zip"
                Compress-Archive -Path $sqlDump -DestinationPath $compressedSql
                Remove-Item $sqlDump
                
                Write-Log "Dump SQL creado: $compressedSql" "SUCCESS"
            }
            
            return $true
        }
        catch {
            Write-Log "Error al crear respaldo SQLite: $($_.Exception.Message)" "ERROR"
            return $false
        }
    }
    else {
        Write-Log "Archivo de base de datos SQLite no encontrado: $dbFile" "ERROR"
        return $false
    }
}

function Backup-PostgreSQLDatabase {
    param([hashtable]$Config)
    
    $backupFile = Join-Path $BackupPath "postgresql_backup_$Date.sql"
    
    Write-Log "Iniciando respaldo PostgreSQL"
    
    try {
        # Configurar variables de entorno
        $env:PGPASSWORD = $Config.DATABASE_PASSWORD
        
        $port = if ($Config.DATABASE_PORT) { $Config.DATABASE_PORT } else { "5432" }
        
        # Ejecutar pg_dump
        $pgDumpArgs = @(
            "-h", $Config.DATABASE_HOST,
            "-p", $port,
            "-U", $Config.DATABASE_USER,
            "-d", $Config.DATABASE_NAME,
            "--verbose",
            "--clean",
            "--no-owner",
            "--no-privileges"
        )
        
        & pg_dump @pgDumpArgs | Out-File -FilePath $backupFile -Encoding UTF8
        
        if ($LASTEXITCODE -eq 0) {
            # Comprimir respaldo
            $compressedFile = "$backupFile.zip"
            Compress-Archive -Path $backupFile -DestinationPath $compressedFile
            Remove-Item $backupFile
            
            Write-Log "Respaldo PostgreSQL completado: $compressedFile" "SUCCESS"
            return $true
        }
        else {
            Write-Log "Error al ejecutar pg_dump" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Error al crear respaldo PostgreSQL: $($_.Exception.Message)" "ERROR"
        return $false
    }
    finally {
        # Limpiar variable de entorno
        Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Backup-MySQLDatabase {
    param([hashtable]$Config)
    
    $backupFile = Join-Path $BackupPath "mysql_backup_$Date.sql"
    
    Write-Log "Iniciando respaldo MySQL"
    
    try {
        $port = if ($Config.DATABASE_PORT) { $Config.DATABASE_PORT } else { "3306" }
        
        # Ejecutar mysqldump
        $mysqldumpArgs = @(
            "-h", $Config.DATABASE_HOST,
            "-P", $port,
            "-u", $Config.DATABASE_USER,
            "-p$($Config.DATABASE_PASSWORD)",
            "--single-transaction",
            "--routines",
            "--triggers",
            "--events",
            "--add-drop-database",
            "--databases", $Config.DATABASE_NAME
        )
        
        & mysqldump @mysqldumpArgs | Out-File -FilePath $backupFile -Encoding UTF8
        
        if ($LASTEXITCODE -eq 0) {
            # Comprimir respaldo
            $compressedFile = "$backupFile.zip"
            Compress-Archive -Path $backupFile -DestinationPath $compressedFile
            Remove-Item $backupFile
            
            Write-Log "Respaldo MySQL completado: $compressedFile" "SUCCESS"
            return $true
        }
        else {
            Write-Log "Error al ejecutar mysqldump" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Error al crear respaldo MySQL: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Backup-MediaFiles {
    Write-Log "Iniciando respaldo de archivos media"
    
    $mediaPath = Join-Path $ProjectPath "media"
    $staticPath = Join-Path $ProjectPath "static"
    
    if (Test-Path $mediaPath) {
        $mediaBackup = Join-Path $BackupPath "media_files_$Date.zip"
        Compress-Archive -Path $mediaPath -DestinationPath $mediaBackup
        Write-Log "Respaldo de archivos media completado: $mediaBackup" "SUCCESS"
    }
    else {
        Write-Log "Directorio media no encontrado" "WARNING"
    }
    
    if (Test-Path $staticPath) {
        $staticBackup = Join-Path $BackupPath "static_files_$Date.zip"
        Compress-Archive -Path $staticPath -DestinationPath $staticBackup
        Write-Log "Respaldo de archivos static completado: $staticBackup" "SUCCESS"
    }
}

function Remove-OldBackups {
    Write-Log "Limpiando respaldos antiguos (más de $RetentionDays días)"
    
    $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
    
    Get-ChildItem -Path $BackupPath -File | Where-Object {
        $_.LastWriteTime -lt $cutoffDate -and 
        ($_.Extension -eq ".zip" -or $_.Extension -eq ".sql" -or $_.Extension -eq ".db")
    } | ForEach-Object {
        Write-Log "Eliminando: $($_.Name)"
        Remove-Item $_.FullName
    }
    
    Write-Log "Limpieza completada"
}

function Show-BackupStats {
    Write-Log "Estadísticas de respaldos:"
    
    $todayBackups = Get-ChildItem -Path $BackupPath -File | Where-Object {
        $_.Name -like "*$($Date.Substring(0,8))*"
    }
    
    if ($todayBackups) {
        Write-Log "Archivos creados hoy:" "SUCCESS"
        $todayBackups | ForEach-Object {
            $size = [math]::Round($_.Length / 1MB, 2)
            Write-Log "  $($_.Name) - $size MB"
        }
    }
    else {
        Write-Log "No se encontraron archivos del respaldo actual" "WARNING"
    }
}

# Función principal
function Main {
    Write-Log "=== INICIANDO RESPALDO AUTOMÁTICO ===" "SUCCESS"
    Write-Log "Fecha: $(Get-Date)"
    Write-Log "Directorio del proyecto: $ProjectPath"
    Write-Log "Directorio de respaldos: $BackupPath"
    
    # Verificar prerrequisitos
    if (-not (Test-Prerequisites)) {
        Write-Log "Faltan prerrequisitos necesarios" "ERROR"
        exit 1
    }
    
    # Obtener configuración de base de datos
    $dbConfig = Get-DatabaseConfig
    Write-Log "Motor de base de datos: $($dbConfig.DATABASE_ENGINE)"
    
    $success = $false
    
    # Determinar tipo de base de datos y ejecutar respaldo
    switch -Wildcard ($dbConfig.DATABASE_ENGINE) {
        "*sqlite3*" {
            $success = Backup-SQLiteDatabase -Config $dbConfig
        }
        "*postgresql*" {
            $success = Backup-PostgreSQLDatabase -Config $dbConfig
        }
        "*mysql*" {
            $success = Backup-MySQLDatabase -Config $dbConfig
        }
        default {
            Write-Log "Motor de base de datos no soportado: $($dbConfig.DATABASE_ENGINE)" "ERROR"
            exit 1
        }
    }
    
    if (-not $success) {
        Write-Log "Error en el respaldo de la base de datos" "ERROR"
        exit 1
    }
    
    # Respaldar archivos
    Backup-MediaFiles
    
    # Limpiar respaldos antiguos
    Remove-OldBackups
    
    # Mostrar estadísticas
    Show-BackupStats
    
    Write-Log "=== RESPALDO COMPLETADO ===" "SUCCESS"
}

# Ejecutar función principal
try {
    Main
}
catch {
    Write-Log "Error durante la ejecución: $($_.Exception.Message)" "ERROR"
    exit 1
}
