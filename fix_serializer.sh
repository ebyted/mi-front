# Fix para incluir información del customer en SalesOrderSerializer

# Primero, respaldar el archivo original
cp /app/core/serializers.py /app/core/serializers.py.bak

# Buscar la línea del customer en SalesOrderSerializer y modificarla

# Buscar el serializer
echo "Buscando SalesOrderSerializer..."
grep -n "class SalesOrderSerializer" /app/core/serializers.py

# Ver el customer field actual
echo "Campo customer actual:"
grep -A5 -B5 "customer = serializers.PrimaryKeyRelatedField" /app/core/serializers.py
