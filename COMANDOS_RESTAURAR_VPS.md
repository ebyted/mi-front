# Script para Restaurar Respaldo en VPS
# Comandos para ejecutar en tu máquina local y luego en el VPS

## PASO 1: Subir el archivo al VPS
# Ejecuta esto desde tu máquina local donde está el archivo bdtotal_local.sql

# Usando SCP (reemplaza 'usuario' con tu usuario del VPS)
scp bdtotal_local.sql root@168.231.67.221:/tmp/bdtotal_local.sql

# O usando SFTP si tienes configurado
# sftp usuario@168.231.67.221
# put bdtotal_local.sql /tmp/bdtotal_local.sql

## PASO 2: Conectarse al VPS
ssh root@168.231.67.221

## PASO 3: Una vez en el VPS, verificar que el contenedor esté corriendo
docker ps | grep maestro_db

## PASO 4: Verificar que el archivo se subió correctamente
ls -la /tmp/bdtotal_local.sql

## PASO 5: Crear una nueva base de datos para la prueba
docker exec maestro_db psql -U maestro -c "CREATE DATABASE bdtotal_test;"

## PASO 6: Restaurar el respaldo

# PROBLEMA: Error de codificación UTF-8
# SOLUCIÓN 1: Limpiar el archivo de caracteres problemáticos
sed 's/\xEF\xBB\xBF//g' /tmp/bdtotal_local.sql > /tmp/bdtotal_clean.sql
docker exec -i maestro_db psql -U maestro -d bdtotal_test < /tmp/bdtotal_clean.sql

# SOLUCIÓN 2: Forzar codificación UTF-8
iconv -f UTF-8 -t UTF-8 -c /tmp/bdtotal_local.sql > /tmp/bdtotal_utf8.sql
docker exec -i maestro_db psql -U maestro -d bdtotal_test < /tmp/bdtotal_utf8.sql

# SOLUCIÓN 3: Usar cat con limpieza en línea
cat /tmp/bdtotal_local.sql | tr -d '\000-\010\013\014\016-\037\177-\377' | docker exec -i maestro_db psql -U maestro -d bdtotal_test

# SOLUCIÓN 4: Si las anteriores fallan, usar dos pasos
# Crear un archivo limpio manualmente
cat > /tmp/fix_encoding.sh << 'EOF'
#!/bin/bash
# Limpiar archivo de caracteres problemáticos
sed 's/\xEF\xBB\xBF//g' /tmp/bdtotal_local.sql | \
sed 's/\r$//' | \
iconv -f UTF-8 -t UTF-8 -c > /tmp/bdtotal_fixed.sql
EOF

chmod +x /tmp/fix_encoding.sh
/tmp/fix_encoding.sh
docker exec -i maestro_db psql -U maestro -d bdtotal_test < /tmp/bdtotal_fixed.sql

## PASO 7: Verificar la restauración
docker exec maestro_db psql -U maestro -d bdtotal_test -c "
SELECT 
    'users' as tabla, COUNT(*) as registros 
FROM users
UNION ALL
SELECT 'businesses', COUNT(*) FROM businesses
UNION ALL
SELECT 'business_users', COUNT(*) FROM business_users;
"

## PASO 8: Verificar estructura de tablas
docker exec maestro_db psql -U maestro -d bdtotal_test -c "
SELECT COUNT(*) as total_tablas 
FROM information_schema.tables 
WHERE table_schema = 'public';
"

## PASO 9: (Opcional) Si todo funciona bien, puedes reemplazar la BD principal
# CUIDADO: Esto sobrescribirá la base de datos actual
# docker exec maestro_db psql -U maestro -c "DROP DATABASE IF EXISTS maestro;"
# docker exec maestro_db psql -U maestro -c "CREATE DATABASE maestro;"
# docker exec -i maestro_db psql -U maestro -d maestro < /tmp/bdtotal_local.sql

## PASO 10: Limpiar archivo temporal (opcional)
rm /tmp/bdtotal_local.sql

## COMANDOS DE DIAGNÓSTICO

# Ver logs del contenedor si hay problemas
docker logs maestro_db

# Verificar conexión a PostgreSQL
docker exec maestro_db psql -U maestro -c "SELECT version();"

# Listar todas las bases de datos
docker exec maestro_db psql -U maestro -l

# Ver tablas en la base de datos restaurada
docker exec maestro_db psql -U maestro -d bdtotal_test -c "\dt"
