# PASO 1: DIAGNÓSTICO BÁSICO VPS
# ===============================

# Ejecuta estos comandos UNO POR UNO en tu VPS y comparte los resultados

echo "=== 1. ESTADO DE CONTENEDORES ==="
docker-compose ps

echo ""
echo "=== 2. PUERTOS ABIERTOS ==="
netstat -tlnp | grep -E ":80|:443|:8080"

echo ""
echo "=== 3. IP DEL SERVIDOR ==="
curl -s ifconfig.me

echo ""
echo "=== 4. TEST DNS BÁSICO ==="
nslookup www.sanchodistribuidora.com

echo ""
echo "=== 5. TEST CONECTIVIDAD LOCAL ==="
curl -I http://localhost:80 -m 5
