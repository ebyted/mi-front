#!/usr/bin/env python
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import Product
from core.serializers import ProductSerializer

def test_search_endpoint():
    """
    Simular el endpoint search_all para verificar que funciona correctamente
    """
    print("🔍 Testando endpoint de búsqueda de productos...")
    
    # Obtener todos los productos ordenados por nombre (igual que el endpoint)
    queryset = Product.objects.select_related('category', 'brand').all().order_by('name')
    
    print(f"📦 Total productos en la base de datos: {queryset.count()}")
    
    if queryset.count() == 0:
        print("❌ No hay productos en la base de datos!")
        return
    
    # Serializar los primeros 10 para ver la estructura
    first_products = queryset[:10]
    serializer = ProductSerializer(first_products, many=True)
    
    print(f"📋 Primeros 10 productos:")
    for i, product_data in enumerate(serializer.data, 1):
        print(f"  {i}. ID: {product_data['id']} - Nombre: {product_data['name']} - SKU: {product_data.get('sku', 'N/A')}")
        if product_data.get('brand'):
            brand_info = product_data['brand']
            if isinstance(brand_info, dict):
                brand_name = brand_info.get('name', brand_info.get('description', 'N/A'))
            else:
                brand_name = str(brand_info)
            print(f"      Marca: {brand_name}")
        if product_data.get('category'):
            category_info = product_data['category']
            if isinstance(category_info, dict):
                category_name = category_info.get('name', category_info.get('description', 'N/A'))
            else:
                category_name = str(category_info)
            print(f"      Categoría: {category_name}")
    
    # Verificar estructura de datos
    print(f"\n🧪 Verificando estructura de datos:")
    sample_product = serializer.data[0]
    print(f"  Tipo de datos: {type(serializer.data)} (debe ser list)")
    print(f"  Campos disponibles: {list(sample_product.keys())}")
    
    # Buscar un producto específico para probar filtrado
    from django.db.models import Q
    
    print(f"\n🔍 Probando búsqueda por 'acxion':")
    search_results = queryset.filter(
        Q(name__icontains='acxion') |
        Q(sku__icontains='acxion') |
        Q(description__icontains='acxion')
    )
    
    print(f"  Productos encontrados con 'acxion': {search_results.count()}")
    if search_results.exists():
        for product in search_results[:5]:
            print(f"    - {product.name} (ID: {product.id}, SKU: {product.sku})")

if __name__ == '__main__':
    test_search_endpoint()
