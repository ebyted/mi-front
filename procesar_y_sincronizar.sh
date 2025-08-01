# Script para procesar localmente y luego sincronizar con VPS

# 1. Ejecutar localmente
echo "🏠 Ejecutando procesamiento local..."
docker-compose exec backend python /app/procesar_inventario_inicial.py

# 2. Sincronizar con VPS (incluye el nuevo movimiento)
echo "🔄 Sincronizando con VPS..."
python sync_vps_directo.py

echo "✅ Inventario procesado localmente y sincronizado con VPS"
