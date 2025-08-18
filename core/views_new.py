from .models import AuditLog, User
from .serializers import AuditLogSerializer, UserSerializer

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action

# Permiso para importadores y vistas de edición
class IsStaffOrReadOnly(IsAuthenticated):
    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return super().has_permission(request, view)
        return super().has_permission(request, view) and (request.user.is_staff or request.user.is_superuser)

from rest_framework.views import APIView

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer

# === VISTAS DE MOVIMIENTOS DE INVENTARIO ELIMINADAS ===
# RECREAR DESDE CERO CON IMPLEMENTACIÓN LIMPIA


# --- IMPORTADORES DE CSV ---
# Estructura esperada de cada CSV se detalla en el comentario de cada vista

from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
import csv
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from rest_framework.permissions import IsAuthenticated

# Permiso para importadores y vistas de edición
class IsStaffOrReadOnly(IsAuthenticated):
    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return super().has_permission(request, view)
        return super().has_permission(request, view) and (request.user.is_staff or request.user.is_superuser)

# --- Importador de Productos ---
# CSV: sku,name,category,brand,base_unit,description,minimum_stock,maximum_stock,image_url
class ProductImportView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsStaffOrReadOnly]
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No se recibió archivo.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            decoded = file.read().decode('utf-8').splitlines()
            reader = csv.DictReader(decoded)
        except Exception:
            return Response({'error': 'Archivo inválido o formato incorrecto.'}, status=status.HTTP_400_BAD_REQUEST)
        created, errors, duplicates = [], [], []
        business_id = request.data.get('business') or request.user.business_id
        if not business_id:
            return Response({'error': 'No se especificó empresa (business).'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            for row in reader:
                sku = row.get('sku')
                name = row.get('name')
                category_name = row.get('category')
                brand_name = row.get('brand')
                base_unit_name = row.get('base_unit')
                description = row.get('description', '')
                minimum_stock = row.get('minimum_stock', 0)
                maximum_stock = row.get('maximum_stock', 0)
                image_url = row.get('image_url', '')
                if not (sku and name and category_name and brand_name and base_unit_name):
                    errors.append({'sku': sku, 'error': 'Faltan campos requeridos.'})
                    continue
                if Product.objects.filter(sku=sku).exists():
                    duplicates.append({'sku': sku, 'error': 'SKU duplicado.'})
                    continue
                from .models import Category, Brand, Unit, Business, Product
                category, _ = Category.objects.get_or_create(name=category_name, business_id=business_id)
                brand, _ = Brand.objects.get_or_create(name=brand_name, business_id=business_id)
                base_unit, _ = Unit.objects.get_or_create(name=base_unit_name, business_id=business_id)
                business = Business.objects.get(id=business_id)
                product = Product.objects.create(
                    sku=sku, name=name, category=category, brand=brand, base_unit=base_unit,
                    description=description, minimum_stock=minimum_stock, maximum_stock=maximum_stock,
                    image_url=image_url, business=business
                )
                created.append({'sku': sku, 'name': name, 'id': product.id})
        return Response({'created': created, 'errors': errors, 'duplicates': duplicates}, status=status.HTTP_201_CREATED)

# --- Importador de Marcas ---
# CSV: name,description
class BrandImportView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsStaffOrReadOnly]
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No se recibió archivo.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            decoded = file.read().decode('utf-8').splitlines()
            reader = csv.DictReader(decoded)
        except Exception:
            return Response({'error': 'Archivo inválido o formato incorrecto.'}, status=status.HTTP_400_BAD_REQUEST)
        created, errors, duplicates = [], [], []
        business_id = request.data.get('business') or request.user.business_id
        if not business_id:
            return Response({'error': 'No se especificó empresa (business).'}, status=status.HTTP_400_BAD_REQUEST)
        from .models import Brand, Business
        with transaction.atomic():
            for row in reader:
                name = row.get('name')
                description = row.get('description', '')
                if not name:
                    errors.append({'name': name, 'error': 'Falta nombre.'})
                    continue
                if Brand.objects.filter(name=name, business_id=business_id).exists():
                    duplicates.append({'name': name, 'error': 'Marca duplicada.'})
                    continue
                business = Business.objects.get(id=business_id)
                brand = Brand.objects.create(name=name, description=description, business=business)
                created.append({'name': name, 'id': brand.id})
        return Response({'created': created, 'errors': errors, 'duplicates': duplicates}, status=status.HTTP_201_CREATED)

# Resto del archivo se mantiene igual...
# Aquí iría el resto de las vistas que NO están relacionadas con InventoryMovement

from .models import (
    Business, Category, Brand, Unit, Product, ProductVariant, Warehouse, ProductWarehouseStock,
    Supplier, SupplierProduct, PurchaseOrder, PurchaseOrderItem, PurchaseOrderReceipt, PurchaseOrderReceiptItem,
    ExchangeRate, CustomerType, Customer, SalesOrder, SalesOrderItem, Quotation, QuotationItem,
    Role, MenuOption
)

from .serializers import (
    BusinessSerializer, CategorySerializer, BrandSerializer, UnitSerializer, ProductSerializer, ProductVariantSerializer,
    WarehouseSerializer, ProductWarehouseStockSerializer, SupplierSerializer, SupplierProductSerializer,
    PurchaseOrderSerializer, PurchaseOrderItemSerializer, PurchaseOrderReceiptSerializer, PurchaseOrderReceiptItemSerializer,
    ExchangeRateSerializer, CustomerTypeSerializer, CustomerSerializer, SalesOrderSerializer, SalesOrderItemSerializer,
    QuotationSerializer, QuotationItemSerializer, RoleSerializer, MenuOptionSerializer
)

# Permiso para importadores y vistas de edición
class IsStaffOrReadOnly(IsAuthenticated):
    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return super().has_permission(request, view)
        return super().has_permission(request, view) and (request.user.is_staff or request.user.is_superuser)

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsStaffOrReadOnly]

class MenuOptionViewSet(viewsets.ModelViewSet):
    queryset = MenuOption.objects.all()
    serializer_class = MenuOptionSerializer
    permission_classes = [IsStaffOrReadOnly]

# ViewSets principales
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class BusinessViewSet(viewsets.ModelViewSet):
    queryset = Business.objects.all()
    serializer_class = BusinessSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer

class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

class ProductVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.all()
    serializer_class = ProductVariantSerializer

class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer

class ProductWarehouseStockViewSet(viewsets.ModelViewSet):
    queryset = ProductWarehouseStock.objects.all()
    serializer_class = ProductWarehouseStockSerializer

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

class SupplierProductViewSet(viewsets.ModelViewSet):
    queryset = SupplierProduct.objects.all()
    serializer_class = SupplierProductSerializer

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer

class PurchaseOrderItemViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderItem.objects.all()
    serializer_class = PurchaseOrderItemSerializer

class PurchaseOrderReceiptViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderReceipt.objects.all()
    serializer_class = PurchaseOrderReceiptSerializer

class PurchaseOrderReceiptItemViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderReceiptItem.objects.all()
    serializer_class = PurchaseOrderReceiptItemSerializer

class ExchangeRateViewSet(viewsets.ModelViewSet):
    queryset = ExchangeRate.objects.all()
    serializer_class = ExchangeRateSerializer

class CustomerTypeViewSet(viewsets.ModelViewSet):
    queryset = CustomerType.objects.all()
    serializer_class = CustomerTypeSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

class SalesOrderViewSet(viewsets.ModelViewSet):
    queryset = SalesOrder.objects.all()
    serializer_class = SalesOrderSerializer

class SalesOrderItemViewSet(viewsets.ModelViewSet):
    queryset = SalesOrderItem.objects.all()
    serializer_class = SalesOrderItemSerializer

class QuotationViewSet(viewsets.ModelViewSet):
    queryset = Quotation.objects.all()
    serializer_class = QuotationSerializer

class QuotationItemViewSet(viewsets.ModelViewSet):
    queryset = QuotationItem.objects.all()
    serializer_class = QuotationItemSerializer

# Vista especial para inventario actual
class CurrentInventoryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        stocks = ProductWarehouseStock.objects.select_related(
            'product_variant__product__category',
            'product_variant__product__brand',
            'warehouse'
        ).all()
        
        data = []
        for stock in stocks:
            data.append({
                'id': stock.id,
                'product_variant': {
                    'id': stock.product_variant.id,
                    'name': stock.product_variant.name,
                    'sku': stock.product_variant.sku,
                    'product': {
                        'name': stock.product_variant.product.name,
                        'category': stock.product_variant.product.category.name if stock.product_variant.product.category else '',
                        'brand': stock.product_variant.product.brand.name if stock.product_variant.product.brand else ''
                    }
                },
                'warehouse': {
                    'id': stock.warehouse.id,
                    'name': stock.warehouse.name
                },
                'quantity': stock.quantity,
                'updated_at': stock.updated_at
            })
        
        return Response(data)

# Vista para obtener lista de almacenes (simplificada)
class WarehouseListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        warehouses = Warehouse.objects.all()
        data = [{'id': w.id, 'name': w.name} for w in warehouses]
        return Response(data)

# Función para obtener opciones de menú del usuario
def user_menu_options(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Usuario no autenticado'}, status=401)
    
    # Aquí iría la lógica para obtener opciones de menú
    options = [
        {'name': 'Productos', 'url': '/products'},
        {'name': 'Almacenes', 'url': '/warehouses'},
        {'name': 'Inventario', 'url': '/inventory'},
        # Movimientos de inventario se agregará cuando se recree
    ]
    
    return Response({'menu_options': options})

# === AQUÍ SE AGREGARÁN LAS NUEVAS VISTAS DE MOVIMIENTOS DE INVENTARIO ===
# IMPLEMENTACIÓN LIMPIA Y DESDE CERO
