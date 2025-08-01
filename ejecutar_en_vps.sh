# Script para ejecutar el procesamiento de inventario inicial en el VPS

# 1. Subir archivos al VPS
echo "📤 Subiendo archivos al VPS..."
scp procesar_inventario_inicial.py root@168.231.67.221:/tmp/
scp scripts/entrada.csv root@168.231.67.221:/tmp/

# 2. Copiar archivos al contenedor backend
echo "📁 Copiando archivos al contenedor..."
ssh root@168.231.67.221 "docker cp /tmp/procesar_inventario_inicial.py maestro_backend:/app/"
ssh root@168.231.67.221 "docker cp /tmp/entrada.csv maestro_backend:/app/scripts/"

# 3. Ejecutar el script en el VPS
echo "🏃‍♂️ Ejecutando procesamiento de inventario..."
ssh root@168.231.67.221 "docker exec maestro_backend python /app/procesar_inventario_inicial.py"

echo "✅ Proceso completado en el VPS"
