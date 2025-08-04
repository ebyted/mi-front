#!/bin/bash

# 🛠️ COMANDOS RÁPIDOS VPS
# =======================

show_help() {
    echo "🛠️ COMANDOS RÁPIDOS PARA VPS"
    echo "=========================="
    echo ""
    echo "Uso: ./comandos-rapidos.sh [opción]"
    echo ""
    echo "Opciones disponibles:"
    echo "  estado      - Ver estado de contenedores"
    echo "  logs        - Ver logs recientes de todos los servicios"
    echo "  traefik     - Ver logs de Traefik en tiempo real"
    echo "  backend     - Ver logs de Backend en tiempo real"
    echo "  reiniciar   - Reiniciar todos los servicios"
    echo "  limpiar     - Limpiar y reiniciar desde cero"
    echo "  puertos     - Ver qué puertos están en uso"
    echo "  ip          - Mostrar IP del servidor"
    echo "  dns         - Verificar DNS"
    echo "  test        - Probar conectividad"
    echo "  firewall    - Configurar firewall automáticamente"
    echo "  ssl         - Ver estado de certificados SSL"
    echo "  dashboard   - Mostrar URL del dashboard Traefik"
    echo "  help        - Mostrar esta ayuda"
    echo ""
}

case "$1" in
    "estado")
        echo "📊 ESTADO DE CONTENEDORES"
        echo "========================"
        docker-compose ps
        echo ""
        RUNNING=$(docker-compose ps | grep "Up" | wc -l)
        TOTAL=$(docker-compose ps | grep -v "Name\|---" | grep -v "^$" | wc -l)
        echo "Ejecutándose: $RUNNING de $TOTAL contenedores"
        ;;
        
    "logs")
        echo "📝 LOGS RECIENTES"
        echo "================"
        echo "--- TRAEFIK ---"
        docker-compose logs traefik --tail=10
        echo ""
        echo "--- BACKEND ---"
        docker-compose logs backend --tail=10
        echo ""
        echo "--- FRONTEND ---"
        docker-compose logs frontend --tail=10
        ;;
        
    "traefik")
        echo "📝 LOGS DE TRAEFIK EN TIEMPO REAL"
        echo "================================="
        echo "Presiona Ctrl+C para salir"
        docker-compose logs -f traefik
        ;;
        
    "backend")
        echo "📝 LOGS DE BACKEND EN TIEMPO REAL"
        echo "================================="
        echo "Presiona Ctrl+C para salir"
        docker-compose logs -f backend
        ;;
        
    "reiniciar")
        echo "🔄 REINICIANDO SERVICIOS"
        echo "======================="
        docker-compose restart
        echo "✅ Servicios reiniciados"
        sleep 5
        docker-compose ps
        ;;
        
    "limpiar")
        echo "🧹 LIMPIEZA COMPLETA Y REINICIO"
        echo "==============================="
        echo "Deteniendo servicios..."
        docker-compose down
        echo "Limpiando sistema Docker..."
        docker system prune -f
        echo "Iniciando servicios..."
        docker-compose up -d
        echo "✅ Limpieza completa realizada"
        sleep 10
        docker-compose ps
        ;;
        
    "puertos")
        echo "🌐 PUERTOS EN USO"
        echo "================"
        echo "Puertos críticos:"
        netstat -tlnp | grep -E ":80|:443|:8080" || echo "❌ No hay puertos críticos en uso"
        echo ""
        echo "Todos los puertos en uso:"
        netstat -tlnp | head -20
        ;;
        
    "ip")
        echo "🌍 IP DEL SERVIDOR"
        echo "=================="
        EXTERNAL_IP=$(curl -s ifconfig.me || echo "No disponible")
        echo "IP externa: $EXTERNAL_IP"
        echo ""
        echo "IPs locales:"
        ip addr show | grep "inet " | grep -v "127.0.0.1"
        ;;
        
    "dns")
        echo "🔍 VERIFICACIÓN DNS"
        echo "=================="
        echo "www.sanchodistribuidora.com:"
        nslookup www.sanchodistribuidora.com | grep -A2 "Name:" || echo "❌ No resuelve"
        echo ""
        echo "api.sanchodistribuidora.com:"
        nslookup api.sanchodistribuidora.com | grep -A2 "Name:" || echo "❌ No resuelve"
        ;;
        
    "test")
        echo "🧪 PRUEBAS DE CONECTIVIDAD"
        echo "=========================="
        echo "Puerto 80 local:"
        timeout 5 curl -I http://localhost:80 && echo "✅ Responde" || echo "❌ No responde"
        echo ""
        echo "Dashboard Traefik:"
        timeout 5 curl -I http://localhost:8080 && echo "✅ Responde" || echo "❌ No responde"
        echo ""
        echo "Desde internet:"
        timeout 10 curl -I https://www.sanchodistribuidora.com && echo "✅ Funciona" || echo "❌ No funciona"
        ;;
        
    "firewall")
        echo "🛡️ CONFIGURANDO FIREWALL"
        echo "========================"
        if command -v ufw >/dev/null 2>&1; then
            sudo ufw --force enable
            sudo ufw allow ssh
            sudo ufw allow 80
            sudo ufw allow 443
            sudo ufw allow 8080
            echo "✅ Firewall configurado"
            ufw status
        else
            echo "❌ UFW no está disponible"
        fi
        ;;
        
    "ssl")
        echo "🔐 CERTIFICADOS SSL"
        echo "=================="
        SSL_VOLUME=$(docker volume ls | grep letsencrypt | awk '{print $2}' | head -1)
        if [ ! -z "$SSL_VOLUME" ]; then
            echo "✅ Volumen SSL: $SSL_VOLUME"
            VOLUME_PATH=$(docker volume inspect $SSL_VOLUME --format '{{ .Mountpoint }}' 2>/dev/null)
            echo "Ruta: $VOLUME_PATH"
            sudo ls -la "$VOLUME_PATH" 2>/dev/null | head -5 || echo "❌ Sin permisos para ver contenido"
        else
            echo "❌ No se encontró volumen SSL"
        fi
        ;;
        
    "dashboard")
        echo "📊 DASHBOARD TRAEFIK"
        echo "==================="
        EXTERNAL_IP=$(curl -s ifconfig.me || echo "No disponible")
        if [ "$EXTERNAL_IP" != "No disponible" ]; then
            echo "URL del dashboard: http://$EXTERNAL_IP:8080"
            echo ""
            echo "Usuario: admin"
            echo "Contraseña: [configurada en docker-compose.yml]"
        else
            echo "❌ No se pudo obtener IP externa"
        fi
        ;;
        
    "help"|""|*)
        show_help
        ;;
esac
