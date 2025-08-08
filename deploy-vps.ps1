# Script de despliegue para VPS
$VPS_IP = "168.231.67.221"
$VPS_USER = "root"
$VPS_PATH = "/root/sancho-app"

Write-Host "🚀 Iniciando despliegue al VPS..." -ForegroundColor Green

# 1. Subir archivos principales
Write-Host "📦 Subiendo archivos del backend..." -ForegroundColor Yellow
scp -r core/ ${VPS_USER}@${VPS_IP}:${VPS_PATH}/
scp -r maestro_inventario_backend/ ${VPS_USER}@${VPS_IP}:${VPS_PATH}/
scp manage.py ${VPS_USER}@${VPS_IP}:${VPS_PATH}/
scp requirements.txt ${VPS_USER}@${VPS_IP}:${VPS_PATH}/

# 2. Subir archivos del frontend
Write-Host "🎨 Subiendo archivos del frontend..." -ForegroundColor Yellow
scp -r dbackf/ ${VPS_USER}@${VPS_IP}:${VPS_PATH}/

# 3. Subir configuraciones
Write-Host "⚙️ Subiendo configuraciones..." -ForegroundColor Yellow
scp docker-compose.yml ${VPS_USER}@${VPS_IP}:${VPS_PATH}/
scp .env ${VPS_USER}@${VPS_IP}:${VPS_PATH}/
scp .env.traefik ${VPS_USER}@${VPS_IP}:${VPS_PATH}/

# 4. Reiniciar servicios en el VPS
Write-Host "🔄 Reiniciando servicios en el VPS..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "cd ${VPS_PATH} && docker-compose down"
ssh ${VPS_USER}@${VPS_IP} "cd ${VPS_PATH} && docker-compose build --no-cache backend frontend"
ssh ${VPS_USER}@${VPS_IP} "cd ${VPS_PATH} && docker-compose up -d"

# 5. Verificar estado
Write-Host "✅ Verificando estado de los contenedores..." -ForegroundColor Green
ssh ${VPS_USER}@${VPS_IP} "cd ${VPS_PATH} && docker-compose ps"

Write-Host "🎉 ¡Despliegue completado!" -ForegroundColor Green
Write-Host "🌐 La aplicación debería estar disponible en: https://www.sanchodistribuidora.com" -ForegroundColor Cyan
