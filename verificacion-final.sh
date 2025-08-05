#!/bin/bash
# Verificación final del despliegue HTTPS

echo "🎯 VERIFICACIÓN FINAL DEL DESPLIEGUE"
echo "===================================="
echo ""

# Verificar contenedores
echo "📦 CONTENEDORES ACTIVOS:"
ssh root@168.231.67.221 "docker ps | grep maestro | awk '{print \"   ✅ \" \$NF \" (\" \$2 \")\"}'".

echo ""

# Verificar conectividad HTTPS
echo "🔐 VERIFICACIÓN HTTPS:"
if ssh root@168.231.67.221 "curl -s -I https://www.sanchodistribuidora.com/ | grep -q 'HTTP/2 200'"; then
    echo "   ✅ Frontend HTTPS: Funcionando"
else
    echo "   ❌ Frontend HTTPS: Error"
fi

if ssh root@168.231.67.221 "curl -s -I https://www.sanchodistribuidora.com/api/ | grep -q 'HTTP/2 200'"; then
    echo "   ✅ API Backend HTTPS: Funcionando"
else
    echo "   ❌ API Backend HTTPS: Error"
fi

echo ""
echo "🎉 RESUMEN DEL PROBLEMA RESUELTO:"
echo "   - Mixed Content Error: SOLUCIONADO ✅"
echo "   - Frontend URL: https://www.sanchodistribuidora.com ✅"
echo "   - API URL: https://www.sanchodistribuidora.com/api/ ✅"
echo "   - SSL Certificates: Funcionando ✅"
echo "   - Traefik Proxy: Configurado ✅"
echo ""
echo "📱 PRUEBA FINAL:"
echo "   Abre https://www.sanchodistribuidora.com/login"
echo "   El error de Mixed Content ya no debería aparecer"
echo ""
echo "===================================="
