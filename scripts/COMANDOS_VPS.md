# =============================================================================
# COMANDOS PARA ACTUALIZAR VPS MANUALMENTE
# =============================================================================

# 1. Ir al directorio del proyecto
cd /opt/maestro_inventario  # Ajustar según tu instalación

# 2. Respaldar BD antes de actualizar (opcional pero recomendado)
cp db.sqlite3 db_backup_$(date +%Y%m%d_%H%M%S).sqlite3

# 3. Actualizar código
git stash  # Guardar cambios locales si los hay
git pull origin main

# 4. Activar entorno virtual
source venv/bin/activate
# O si usas .venv:
# source .venv/bin/activate

# 5. Actualizar dependencias (si hay nuevas)
pip install -r requirements.txt

# 6. Generar nuevas migraciones
python manage.py makemigrations core

# 7. Aplicar migraciones
python manage.py migrate

# 8. Recolectar archivos estáticos (si aplica)
python manage.py collectstatic --noinput

# 9. Reiniciar servicio
# Si usas systemd:
sudo systemctl restart maestro_inventario

# O si ejecutas manualmente:
# Detener proceso actual (Ctrl+C si está en primer plano)
# Luego iniciar:
python manage.py runserver 0.0.0.0:8030

# 10. Verificar que funciona
curl http://localhost:8030/api/

# =============================================================================
# COMANDOS RÁPIDOS (EJECUTAR TODO DE UNA VEZ)
# =============================================================================

# Comando completo (copiar y pegar):
cd /opt/maestro_inventario && \
cp db.sqlite3 db_backup_$(date +%Y%m%d_%H%M%S).sqlite3 && \
git pull origin main && \
source venv/bin/activate && \
pip install -r requirements.txt && \
python manage.py makemigrations core && \
python manage.py migrate && \
python manage.py collectstatic --noinput && \
echo "Actualización completada. Reinicia el servicio manualmente."

# =============================================================================
# VERIFICACIÓN DE ERRORES
# =============================================================================

# Ver logs de Django
tail -f /var/log/django.log

# Ver logs del sistema
journalctl -u maestro_inventario -f

# Verificar procesos
ps aux | grep python

# Verificar puertos
netstat -tulpn | grep 8030

# =============================================================================
# ROLLBACK (SI ALGO SALE MAL)
# =============================================================================

# Volver a la versión anterior del código
git reset --hard HEAD~1

# Restaurar BD desde respaldo
cp db_backup_XXXXXXXX_XXXXXX.sqlite3 db.sqlite3

# Aplicar migraciones hacia atrás (si es necesario)
python manage.py migrate core 0008  # Número de la migración anterior
