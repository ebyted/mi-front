from core.models import Supplier, ProductVariant, Business

# Crear un negocio de prueba si no existe
business, created = Business.objects.get_or_create(
    name="Mi Negocio",
    defaults={
        'address': 'Dirección de prueba',
        'phone': '555-0123',
        'email': 'test@business.com'
    }
)

# Crear algunos proveedores de prueba
suppliers_data = [
    {
        'name': 'Juan Pérez',
        'company_name': 'Distribuidora Pérez SA',
        'email': 'juan@distribuidora.com',
        'phone': '555-1234',
        'business': business
    },
    {
        'name': 'María García',
        'company_name': 'Comercial García',
        'email': 'maria@comercial.com',  
        'phone': '555-5678',
        'business': business
    },
    {
        'name': 'Carlos López',
        'company_name': 'Proveedores López',
        'email': 'carlos@proveedores.com',
        'phone': '555-9012',
        'business': business
    }
]

for supplier_data in suppliers_data:
    supplier, created = Supplier.objects.get_or_create(
        email=supplier_data['email'],
        defaults=supplier_data
    )
    if created:
        print(f"Proveedor creado: {supplier.name} - {supplier.company_name}")

# Crear algunas variantes de productos de prueba si no existen
if ProductVariant.objects.count() == 0:
    from core.models import Product, Category
    
    # Crear categoría de prueba
    category, created = Category.objects.get_or_create(
        name="Electrónicos",
        defaults={'business': business}
    )
    
    # Crear producto de prueba
    product, created = Product.objects.get_or_create(
        name="Smartphone",
        defaults={
            'category': category,
            'business': business,
            'description': 'Teléfono inteligente'
        }
    )
    
    # Crear variantes
    variants_data = [
        {'name': 'Smartphone 64GB Negro', 'sku': 'SP64BLK', 'price': 299.99},
        {'name': 'Smartphone 128GB Blanco', 'sku': 'SP128WHT', 'price': 399.99},
        {'name': 'Smartphone 256GB Azul', 'sku': 'SP256BLU', 'price': 499.99}
    ]
    
    for variant_data in variants_data:
        variant, created = ProductVariant.objects.get_or_create(
            sku=variant_data['sku'],
            defaults={
                **variant_data,
                'product': product,
                'business': business
            }
        )
        if created:
            print(f"Variante creada: {variant.name} - {variant.sku}")

print(f"\nTotal proveedores: {Supplier.objects.count()}")
print(f"Total variantes: {ProductVariant.objects.count()}")
print("Datos de prueba listos!")
