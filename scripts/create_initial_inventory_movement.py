import os
import sys
import django
import csv
from datetime import datetime

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import Product, ProductVariant, Warehouse, User, InventoryMovement, InventoryMovementDetail

# Set all products to is_active = True
Product.objects.all().update(is_active=True)

CSV_FILE = 'scripts/inv_inicial30.csv'
WAREHOUSE_NAME = 'sancho'
USER_EMAIL = 'ebyted@hotmail.com'
MOVEMENT_TYPE = 'entrada'
NOTE = 'Inventario inicial'
REFERENCE_DOCUMENT = '0001'
DATE = datetime(2026, 7, 30)

# Delete all inventory movements and their details
InventoryMovementDetail.objects.all().delete()
InventoryMovement.objects.all().delete()

# Find warehouse and user
warehouse = Warehouse.objects.filter(name__iexact=WAREHOUSE_NAME).first()
if not warehouse:
    print(f"Warehouse '{WAREHOUSE_NAME}' not found.")
    sys.exit(1)
user = User.objects.filter(email__iexact=USER_EMAIL).first()
if not user:
    print(f"User '{USER_EMAIL}' not found.")
    sys.exit(1)

# Create InventoryMovement
movement = InventoryMovement.objects.create(
    warehouse=warehouse,
    user=user,
    movement_type=MOVEMENT_TYPE,
    reference_document=REFERENCE_DOCUMENT,
    notes=NOTE,
    created_at=DATE
)

not_found = []
added = 0

with open(CSV_FILE, encoding='utf-8') as f:
    reader = csv.reader(f)
    for idx, row in enumerate(reader, 1):
        if not row or not row[0].strip():
            print(f"[{idx}] Línea vacía o sin nombre, omitida.")
            continue
        name = row[0].strip().strip('"')
        quantity = row[1].replace(',', '').strip() if len(row) > 1 else ''
        price = row[2].replace('$', '').replace(',', '.').strip() if len(row) > 2 else ''
        try:
            quantity = float(quantity) if quantity else 0.0
            price = float(price) if price else 0.0
        except Exception:
            print(f"[{idx}] Error convirtiendo cantidad/precio para '{name}'. Se asigna 0.")
            quantity = 0.0
            price = 0.0
        print(f"[{idx}] Producto: '{name}', Cantidad: {quantity}, Precio: {price}")
        product = Product.objects.filter(name__iexact=name).first()
        if not product:
            print(f"[{idx}] ❌ Producto NO encontrado: '{name}'")
            not_found.append(name)
            continue
        variant = ProductVariant.objects.filter(product=product).first()
        if not variant:
            print(f"[{idx}] ⚠️ Producto encontrado pero SIN variante: '{name}'. Creando variante genérica...")
            variant = ProductVariant.objects.create(
                product=product,
                name=product.name,
                sku=f"GEN-{product.id}",
                cost_price=0,
                sale_price=0,
                purchase_price=0,
                barcode="",
                unit=None,
                low_stock_threshold=0,
                is_active=True
            )
            print(f"[{idx}] ✅ Variante creada: {variant.sku}")
        InventoryMovementDetail.objects.create(
            movement=movement,
            product_variant=variant,
            quantity=quantity,
            price=price,
            total=quantity * price,
            lote='',
            expiration_date=None,
            aux1=''
        )
        print(f"[{idx}] ✅ Detalle insertado para '{name}' (Variante: {variant.sku})")
        added += 1

print(f"Added {added} products to movement.")
if not_found:
    print("Products not found or missing variant:")
    for name in not_found:
        print(f"- {name}")
else:
    print("All products found and variants assigned.")
