# Configuración para sincronización VPS
VPS_HOST = "http://168.231.67.221/"
VPS_USER = "root"
VPS_PATH = "es un docker"
DB_NAME = "maestro_inventario"

# Comandos de ejemplo para usar:
# 1. Crear backup: docker-compose exec postgres pg_dump -U postgres maestro_inventario > backup.sql
# 2. Subir: scp backup.sql root@http://168.231.67.221/:es un docker/
# 3. Restaurar en VPS: ssh root@http://168.231.67.221/ "cd es un docker && docker-compose exec postgres psql -U postgres -d maestro_inventario < backup.sql"
