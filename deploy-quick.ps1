# Script de despliegue rápido para emergencias
Write-Host "🚀 DESPLIEGUE RÁPIDO - Aplicando correcciones de autenticación" -ForegroundColor Red

$server = "root@168.231.67.221"

Write-Host "📂 Actualizando código en servidor..." -ForegroundColor Yellow
ssh $server "cd /root/mi-front && git pull origin main"

Write-Host "🔧 Reconstruyendo frontend..." -ForegroundColor Yellow  
ssh $server "cd /root/mi-front && docker-compose -f docker-compose-fixed.yml stop frontend"
ssh $server "cd /root/mi-front && docker-compose -f docker-compose-fixed.yml build --no-cache frontend"
ssh $server "cd /root/mi-front && docker-compose -f docker-compose-fixed.yml up -d frontend"

Write-Host "✅ Verificando estado..." -ForegroundColor Green
ssh $server "cd /root/mi-front && docker-compose -f docker-compose-fixed.yml ps"

Write-Host "🎯 Despliegue completado. Verifica: https://www.sanchodistribuidora.com" -ForegroundColor Green
Write-Host "⚠️  IMPORTANTE: Limpia caché del navegador (Ctrl+F5) para ver cambios" -ForegroundColor Red
