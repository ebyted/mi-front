# 🗃️ Sistema de Respaldos - Maestro Inventario

Este sistema proporciona respaldos automáticos y restauración para el proyecto Maestro Inventario, soportando múltiples tipos de bases de datos y configuraciones.

## 📁 Archivos Incluidos

- `backup_database.sh` - Script principal de respaldo (Linux/Unix)
- `backup_database.ps1` - Script de respaldo para Windows
- `restore_database.sh` - Script de restauración
- `setup_backup_cron.sh` - Configurador de tareas automáticas
- `backup.env.example` - Ejemplo de configuración

## 🚀 Instalación Rápida

### En Linux/VPS:

```bash
# 1. Hacer scripts ejecutables
chmod +x scripts/*.sh

# 2. Copiar configuración de ejemplo
cp scripts/backup.env.example /opt/maestro_inventario/.env

# 3. Editar configuración
nano /opt/maestro_inventario/.env

# 4. Instalar respaldos diarios automáticos
./scripts/setup_backup_cron.sh --install --frequency daily

# 5. Probar respaldo manual
./scripts/backup_database.sh
```

### En Windows:

```powershell
# Ejecutar respaldo manual
.\scripts\backup_database.ps1

# Con parámetros personalizados
.\scripts\backup_database.ps1 -ProjectPath "C:\inetpub\maestro_inventario" -BackupPath "D:\Backups"
```

## ⚙️ Configuración

### Variables de Entorno Principales

```bash
# Base de Datos
DATABASE_ENGINE=django.db.backends.postgresql  # sqlite3|postgresql|mysql
DATABASE_NAME=maestro_inventario
DATABASE_USER=postgres
DATABASE_PASSWORD=tu_password
DATABASE_HOST=localhost
DATABASE_PORT=5432

# Respaldos
BACKUP_RETENTION_DAYS=30
BACKUP_DIRECTORY=/opt/backups/maestro_inventario
```

### Tipos de Base de Datos Soportados

#### SQLite
```bash
DATABASE_ENGINE=django.db.backends.sqlite3
DATABASE_NAME=/path/to/db.sqlite3
```

#### PostgreSQL
```bash
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=maestro_inventario
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_HOST=localhost
DATABASE_PORT=5432
```

#### MySQL
```bash
DATABASE_ENGINE=django.db.backends.mysql
DATABASE_NAME=maestro_inventario
DATABASE_USER=root
DATABASE_PASSWORD=password
DATABASE_HOST=localhost
DATABASE_PORT=3306
```

## 🔄 Uso de Scripts

### Respaldo Manual

```bash
# Respaldo básico
./scripts/backup_database.sh

# Ver logs en tiempo real
tail -f /var/log/maestro_inventario_backup.log
```

### Configurar Respaldos Automáticos

```bash
# Instalar respaldos diarios (2:00 AM)
./scripts/setup_backup_cron.sh --install --frequency daily

# Instalar respaldos semanales (Domingos 2:00 AM)
./scripts/setup_backup_cron.sh --install --frequency weekly

# Instalar respaldos cada hora
./scripts/setup_backup_cron.sh --install --frequency hourly

# Ver estado actual
./scripts/setup_backup_cron.sh --status

# Listar respaldos existentes
./scripts/setup_backup_cron.sh --list

# Remover respaldos automáticos
./scripts/setup_backup_cron.sh --remove
```

### Restauración

```bash
# Restauración automática (detecta tipo de BD)
./scripts/restore_database.sh sqlite_backup_20240801_143022.db.gz

# Restauración especificando tipo
./scripts/restore_database.sh -t postgresql postgresql_backup_20240801_143022.sql.gz

# Restauración forzada (sin confirmación)
./scripts/restore_database.sh --force mysql_backup_20240801_143022.sql.gz

# Ver ayuda
./scripts/restore_database.sh --help
```

## 📊 Tipos de Respaldo Generados

### Para SQLite:
- `sqlite_backup_YYYYMMDD_HHMMSS.db.gz` - Copia directa de la BD
- `sqlite_dump_YYYYMMDD_HHMMSS.sql.gz` - Dump SQL completo

### Para PostgreSQL:
- `postgresql_backup_YYYYMMDD_HHMMSS.sql.gz` - Dump SQL
- `postgresql_custom_YYYYMMDD_HHMMSS.dump.gz` - Formato personalizado

### Para MySQL:
- `mysql_backup_YYYYMMDD_HHMMSS.sql.gz` - Dump SQL completo

### Archivos Adicionales:
- `media_files_YYYYMMDD_HHMMSS.tar.gz` - Archivos de media
- `static_files_YYYYMMDD_HHMMSS.tar.gz` - Archivos estáticos

## 🛠️ Troubleshooting

### Problemas Comunes

#### Error: "pg_dump: command not found"
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# CentOS/RHEL
sudo yum install postgresql

# Verificar instalación
which pg_dump
```

#### Error: "mysqldump: command not found"
```bash
# Ubuntu/Debian
sudo apt-get install mysql-client

# CentOS/RHEL
sudo yum install mysql

# Verificar instalación
which mysqldump
```

#### Error de permisos
```bash
# Hacer scripts ejecutables
chmod +x scripts/*.sh

# Verificar permisos del directorio de respaldos
sudo chown -R $(whoami) /opt/backups/
```

#### Problemas de espacio en disco
```bash
# Verificar espacio disponible
df -h /opt/backups/

# Limpiar respaldos antiguos manualmente
find /opt/backups/ -name "*.gz" -mtime +30 -delete

# Reducir período de retención
echo "BACKUP_RETENTION_DAYS=15" >> /opt/maestro_inventario/.env
```

### Verificación de Respaldos

```bash
# Verificar integridad de respaldo SQLite
gunzip -c sqlite_backup_20240801_143022.db.gz > test.db
sqlite3 test.db "PRAGMA integrity_check;"

# Verificar respaldo PostgreSQL
gunzip -c postgresql_backup_20240801_143022.sql.gz | head -20

# Ver tamaño de respaldos
ls -lh /opt/backups/maestro_inventario/
```

## 📈 Monitoreo y Alertas

### Verificar Logs

```bash
# Ver logs de respaldos
tail -f /var/log/maestro_inventario_backup.log

# Buscar errores
grep ERROR /var/log/maestro_inventario_backup.log

# Estadísticas de respaldos del último mes
grep "RESPALDO COMPLETADO" /var/log/maestro_inventario_backup.log | tail -30
```

### Script de Monitoreo Simple

```bash
#!/bin/bash
# Agregar al cron para verificar respaldos diarios

BACKUP_DIR="/opt/backups/maestro_inventario"
YESTERDAY=$(date -d "yesterday" +%Y%m%d)

if ls $BACKUP_DIR/*$YESTERDAY* 1> /dev/null 2>&1; then
    echo "✓ Respaldo de ayer encontrado"
else
    echo "✗ No se encontró respaldo de ayer" | mail -s "ALERTA: Respaldo faltante" admin@tudominio.com
fi
```

## 🔒 Seguridad

### Permisos Recomendados

```bash
# Directorio de respaldos - solo propietario
chmod 700 /opt/backups/

# Scripts de respaldo - ejecutable para propietario
chmod 750 scripts/*.sh

# Archivo de configuración - solo lectura para propietario
chmod 600 /opt/maestro_inventario/.env
```

### Encripción de Respaldos (Opcional)

```bash
# Encriptar respaldo con GPG
gpg --cipher-algo AES256 --compress-algo 2 --symmetric \
    --output backup_encrypted.gpg backup_file.sql.gz

# Desencriptar
gpg --output backup_file.sql.gz --decrypt backup_encrypted.gpg
```

## 📞 Soporte

Si tienes problemas con los scripts de respaldo:

1. Verifica los logs: `/var/log/maestro_inventario_backup.log`
2. Ejecuta el script manualmente para ver errores en tiempo real
3. Verifica la configuración en el archivo `.env`
4. Asegúrate de que las herramientas necesarias estén instaladas

## 🔄 Actualizaciones

Para actualizar los scripts:

```bash
# Respaldar configuración actual
cp /opt/maestro_inventario/.env /opt/maestro_inventario/.env.backup

# Actualizar scripts
git pull origin main

# Restaurar configuración
cp /opt/maestro_inventario/.env.backup /opt/maestro_inventario/.env
```
