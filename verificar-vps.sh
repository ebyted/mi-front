#!/bin/bash

# 🔍 VERIFICAR ESTADO DEL VPS DESDE LOCAL
# =======================================

VPS_IP="168.231.67.221"
VPS_USER="root"
VPS_PASSWORD="Arkano-IA2025+"

echo "🔍 VERIFICANDO ESTADO DEL VPS"
echo "============================="
echo "IP: $VPS_IP"
echo ""

# Función para ejecutar comandos remotos
run_remote() {
    sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "$1"
}

echo "📊 1. ESTADO DE CONTENEDORES"
echo "============================"
run_remote "cd /opt/sancho-distribuidora && docker-compose ps"

echo ""
echo "🌐 2. PUERTOS EN USO"
echo "==================="
run_remote "netstat -tlnp | grep -E ':80|:443|:8080'"

echo ""
echo "🧪 3. TESTS DE CONECTIVIDAD"
echo "==========================="
echo "Probando puerto 80..."
timeout 10 curl -I http://$VPS_IP:80 && echo "✅ Puerto 80 responde" || echo "❌ Puerto 80 no responde"

echo ""
echo "Probando dashboard Traefik..."
timeout 10 curl -I http://$VPS_IP:8080 && echo "✅ Dashboard responde" || echo "❌ Dashboard no responde"

echo ""
echo "Probando dominio principal..."
timeout 15 curl -I https://www.sanchodistribuidora.com && echo "✅ Dominio funciona" || echo "❌ Dominio no responde"

echo ""
echo "📝 4. LOGS RECIENTES"
echo "==================="
run_remote "cd /opt/sancho-distribuidora && docker-compose logs traefik --tail=5"

echo ""
echo "🔗 5. URLS IMPORTANTES"
echo "====================="
echo "- Frontend: https://www.sanchodistribuidora.com"
echo "- API: https://api.sanchodistribuidora.com"
echo "- Dashboard: http://$VPS_IP:8080"
echo ""
echo "Para conectarte al VPS: ssh root@$VPS_IP"
