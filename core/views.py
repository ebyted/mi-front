from .models import Product, ProductVariant, ProductWarehouseStock, Supplier, PurchaseOrder, SalesOrder, Quotation, AuditLog, InventoryMovement, InventoryMovementDetail
from .serializers import ProductSerializer, ProductVariantSerializer, ProductWarehouseStockSerializer, SupplierSerializer, PurchaseOrderSerializer, SalesOrderSerializer, QuotationSerializer, AuditLogSerializer
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

# Vista para el perfil de usuario
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user
        data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_active': user.is_active,
        }
        return Response(data)

# 1. Búsqueda avanzada de productos
class PCProductSearchView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        q = request.GET.get('q', '')
        products = Product.objects.filter(
            Q(name__icontains=q) |
            Q(sku__icontains=q) |
            Q(barcode__icontains=q) |
            Q(category__name__icontains=q) |
            Q(brand__name__icontains=q) |
            Q(description__icontains=q)
        ).order_by('name')[:50]
        data = [
            {
                'id': p.id,
                'name': p.name,
                'sku': p.sku,
                'category': p.category.name if p.category else '',
                'brand': p.brand.name if p.brand else '',
                'image_url': p.image_url,
                'is_active': p.is_active,
                'status': p.status,
            } for p in products
        ]
        return Response(data)

# 2. Detalles completos del producto
class PCProductDetailView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        serializer = ProductSerializer(product)
        return Response(serializer.data)

# 3. Variantes del producto
class PCProductVariantsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, pk):
        variants = ProductVariant.objects.filter(product_id=pk)
        serializer = ProductVariantSerializer(variants, many=True)
        return Response(serializer.data)

# 4. Kardex y movimientos
class PCProductKardexView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        variants = ProductVariant.objects.filter(product=product)
        variant_ids = list(variants.values_list('id', flat=True))
        movements = InventoryMovement.objects.filter(details__product_variant__product_id=product.id).distinct().order_by('created_at')
        balance = 0
        kardex = []
        for mov in movements:
            details = mov.details.filter(product_variant__product_id=product.id)
            for detail in details:
                quantity = detail.quantity or 0
                movement_type = mov.movement_type
                is_inbound = movement_type in ['IN', 'PURCHASE'] or (movement_type == 'ADJUSTMENT' and quantity > 0)
                if is_inbound:
                    balance += abs(quantity)
                else:
                    balance -= abs(quantity)
                kardex.append({
                    'date': str(mov.created_at),
                    'movement_type': movement_type,
                    'quantity_in': abs(quantity) if is_inbound else None,
                    'quantity_out': abs(quantity) if not is_inbound else None,
                    'balance': balance,
                    'unit_cost': detail.unit_cost if hasattr(detail, 'unit_cost') else 0,
                    'total_value': balance * (detail.unit_cost if hasattr(detail, 'unit_cost') else 0),
                    'reference': mov.reference_document or mov.id,
                    'warehouse': mov.warehouse.name if hasattr(mov, 'warehouse') and mov.warehouse else None,
                    'user': mov.user.email if hasattr(mov, 'user') and mov.user else None,
                    'notes': getattr(mov, 'notes', None)
                })
        return Response(kardex)

# 5. Stock en almacenes
class PCProductStockView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, pk):
        stocks = ProductWarehouseStock.objects.filter(product_variant__product_id=pk)
        serializer = ProductWarehouseStockSerializer(stocks, many=True)
        return Response(serializer.data)

# 6. Proveedores relacionados
class PCProductSuppliersView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, pk):
        suppliers = Supplier.objects.filter(supplierproduct__product_variant__product_id=pk).distinct()
        serializer = SupplierSerializer(suppliers, many=True)
        return Response(serializer.data)

# 7. Órdenes de compra/venta/cotizaciones
class PCProductOrdersView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, pk):
        purchase_orders = PurchaseOrder.objects.filter(purchaseorderitem__product_variant__product_id=pk).distinct()
        sales_orders = SalesOrder.objects.filter(items__product_variant__product_id=pk).distinct()
        quotations = Quotation.objects.filter(details__product__id=pk).distinct()
        return Response({
            'purchase_orders': PurchaseOrderSerializer(purchase_orders, many=True).data,
            'sales_orders': SalesOrderSerializer(sales_orders, many=True).data,
            'quotations': QuotationSerializer(quotations, many=True).data,
        })

# 8. Auditoría y log
class PCProductAuditLogView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, pk):
        logs = AuditLog.objects.filter(object_id=str(pk), model='Product').order_by('-timestamp')
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
from .models import AuditLog, User
from .serializers import AuditLogSerializer, UserSerializer

from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404

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
# CSV: name,code,description,country
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
                code = row.get('code', '')
                country = row.get('country', '')
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
    Role, MenuOption, InventoryMovement, InventoryMovementDetail, CustomerPayment, SupplierPayment
)

from .serializers import (
    BusinessSerializer, CategorySerializer, BrandSerializer, UnitSerializer, ProductSerializer, ProductVariantSerializer,
    WarehouseSerializer, ProductWarehouseStockSerializer, SupplierSerializer, SupplierProductSerializer,
    PurchaseOrderSerializer, PurchaseOrderItemSerializer, PurchaseOrderReceiptSerializer, PurchaseOrderReceiptItemSerializer,
    ExchangeRateSerializer, CustomerTypeSerializer, CustomerSerializer, SalesOrderSerializer, SalesOrderItemSerializer,
    QuotationSerializer, QuotationItemSerializer, RoleSerializer, MenuOptionSerializer,
    InventoryMovementSerializer, InventoryMovementDetailSerializer
)
# Endpoint para obtener el kardex de un producto
from rest_framework.views import APIView
class ProductKardexView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, pk):
        try:
            product = get_object_or_404(Product, pk=pk)
            variants = ProductVariant.objects.filter(product=product)
            variant_ids = list(variants.values_list('id', flat=True))

            # Obtener movimientos ligados al producto y variantes
            movements = InventoryMovement.objects.filter(details__product_id=product.id).distinct()
            if variant_ids:
                movements = movements | InventoryMovement.objects.filter(details__product_variant_id__in=variant_ids).distinct()
            movements = movements.order_by('created_at')

            balance = 0
            kardex = []
            for mov in movements:
                # Buscar el detalle correcto
                detail = mov.details.filter(product_variant__product_id=product.id).first()
                quantity = None
                if detail:
                    quantity = detail.quantity
                else:
                    # Si no hay detalle, usar el primer detalle disponible
                    detail = mov.details.first()
                    quantity = detail.quantity if detail else 0

                # Si no hay cantidad, poner 0
                if quantity is None:
                    quantity = 0

                movement_type = getattr(mov, 'movement_type', 'UNKNOWN')
                is_inbound = movement_type in ['IN', 'PURCHASE'] or (movement_type == 'ADJUSTMENT' and quantity > 0)
                if is_inbound:
                    balance += abs(quantity)
                else:
                    balance -= abs(quantity)
                kardex.append({
                    'date': str(mov.created_at),
                    'description': movement_type,
                    'movement_type': movement_type,
                    'quantity_in': abs(quantity) if is_inbound else None,
                    'quantity_out': abs(quantity) if not is_inbound else None,
                    'balance': balance,
                    'unit_cost': getattr(detail, 'unit_cost', 0) if detail else 0,
                    'total_value': balance * (getattr(detail, 'unit_cost', 0) if detail else 0),
                    'reference': getattr(mov, 'reference', None) or mov.id
                })
            return Response(kardex)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': 'Error interno en el kardex', 'detail': str(e)}, status=500)

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

from rest_framework.pagination import PageNumberPagination
from django.db.models import Q

class CustomPageNumberPagination(PageNumberPagination):
    page_size = 52
    page_size_query_param = 'page_size'
    max_page_size = 200

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['name', 'created_at', 'price']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtro por búsqueda manual
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(sku__icontains=search) |
                Q(code__icontains=search) |
                Q(barcode__icontains=search) |
                Q(brand__name__icontains=search) |
                Q(category__name__icontains=search)
            )
        
        # Filtro por activo/inactivo
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            if is_active in ['true', 'True', '1', True]:
                queryset = queryset.filter(is_active=True)
            elif is_active in ['false', 'False', '0', False]:
                queryset = queryset.filter(is_active=False)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def show_all(self, request):
        """
        Endpoint para devolver todos los productos con filtros y variantes, sin paginación.
        Filtros: name, sku, category, brand
        """
        name = request.query_params.get('name', '').strip()
        sku = request.query_params.get('sku', '').strip()
        category = request.query_params.get('category', '').strip()
        brand = request.query_params.get('brand', '').strip()
        queryset = Product.objects.select_related('category', 'brand').all()
        if name:
            queryset = queryset.filter(name__icontains=name)
        if sku:
            queryset = queryset.filter(Q(sku__icontains=sku) | Q(barcode__icontains=sku) | Q(code__icontains=sku))
        if category:
            queryset = queryset.filter(category_id=category)
        if brand:
            queryset = queryset.filter(brand_id=brand)
        queryset = queryset.order_by('name')
        from .serializers_product_search import ProductWithMainVariantSerializer
        serializer = ProductWithMainVariantSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search_all(self, request):
        """
        Endpoint para búsqueda sin paginación - devuelve TODOS los productos ordenados por nombre
        """
        queryset = Product.objects.select_related('category', 'brand').all().order_by('name')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def search_filtered(self, request):
        """
        Endpoint optimizado para búsqueda con filtros y paginación
        """
        # Parámetros de búsqueda
        search_text = request.query_params.get('search', '').strip()
        brand_id = request.query_params.get('brand', '')
        category_id = request.query_params.get('category', '')
        is_active = request.query_params.get('is_active', '')
        stock_status = request.query_params.get('stock_status', '')
        
        # Parámetros de paginación
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 50)), 200)  # Máximo 200
        
        # Base queryset con optimizaciones
        queryset = Product.objects.select_related('category', 'brand').prefetch_related('productvariant_set')
        
        # Aplicar filtros
        if search_text:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(name__icontains=search_text) |
                Q(sku__icontains=search_text) |
                Q(barcode__icontains=search_text) |
                Q(description__icontains=search_text) |
                Q(brand__name__icontains=search_text) |
                Q(brand__description__icontains=search_text) |
                Q(category__name__icontains=search_text) |
                Q(category__description__icontains=search_text) |
                Q(variants__name__icontains=search_text) |
                Q(variants__sku__icontains=search_text)
            ).distinct()
        
        if brand_id:
            queryset = queryset.filter(brand_id=brand_id)
            
        if category_id:
            queryset = queryset.filter(category_id=category_id)
            
        if is_active == 'true':
            queryset = queryset.filter(is_active=True)
        elif is_active == 'false':
            queryset = queryset.filter(is_active=False)
            
        # Filtro por stock (requiere lógica adicional si es necesario)
        if stock_status == 'low':
            queryset = queryset.filter(minimum_stock__lt=10)
        elif stock_status == 'zero':
            queryset = queryset.filter(current_stock=0)
        elif stock_status == 'ok':
            queryset = queryset.exclude(current_stock=0)
        
        # Ordenar
        queryset = queryset.order_by('name')
        
        # Contar total (antes de paginación)
        total_count = queryset.count()
        
        # Aplicar paginación
        start = (page - 1) * page_size
        end = start + page_size
        paginated_queryset = queryset[start:end]
        
        # Serializar
        serializer = self.get_serializer(paginated_queryset, many=True)
        
        return Response({
            'results': serializer.data,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'has_next': end < total_count,
            'has_previous': page > 1
        })

    @action(detail=False, methods=['get'])
    def simple_list(self, request):
        """
        Endpoint simple: devuelve id, nombre, categoria, marca y estado de todos los productos sin paginación ni filtros
        """
        products = Product.objects.select_related('category', 'brand').all().order_by('name')
        from .serializers import ProductVariantSerializer
        data = [
                {
                    'id': p.id,
                    'name': p.name,
                    'category': p.category.name if p.category else None,
                    'brand': p.brand.name if p.brand else None,
                    'status': p.status,
                    'variants': ProductVariantSerializer(p.productvariant_set.all(), many=True).data
                }
                for p in products
            ]
        return Response(data)

class ProductVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.all()
    serializer_class = ProductVariantSerializer

class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer

class ProductWarehouseStockViewSet(viewsets.ModelViewSet):
    queryset = ProductWarehouseStock.objects.all()
    serializer_class = ProductWarehouseStockSerializer
    pagination_class = None  # Sin paginación - devuelve todos los productos

    def get_queryset(self):
        # Mostrar TODOS los productos, incluidos los con stock 0 o negativo
        queryset = ProductWarehouseStock.objects.all()
        
        # Optional: Add filtering by warehouse if provided
        warehouse_id = self.request.query_params.get('warehouse')
        if warehouse_id:
            queryset = queryset.filter(warehouse_id=warehouse_id)
        
        return queryset

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
    def create(self, request, *args, **kwargs):
        """
        Al crear una venta, también crea un movimiento de almacén tipo OUT con el mismo detalle y nota 'Venta Portal {fecha}'.
        """
        from django.utils import timezone
        from core.models import InventoryMovement, InventoryMovementDetail, Warehouse
        from decimal import Decimal

        # Crear la venta normalmente
        response = super().create(request, *args, **kwargs)
        try:
            sales_order_id = response.data.get('id')
            sales_order = SalesOrder.objects.get(id=sales_order_id)
            # Determinar almacén (puedes ajustar esta lógica según tu modelo)
            warehouse = None
            if hasattr(sales_order, 'warehouse') and sales_order.warehouse:
                warehouse = sales_order.warehouse
            else:
                # Si no hay almacén en la venta, usa el primero activo
                warehouse = Warehouse.objects.filter(is_active=True).first()
            if not warehouse:
                return response  # No se puede crear movimiento sin almacén

            fecha = timezone.now().strftime('%d/%m/%Y %H:%M')
            movimiento = InventoryMovement.objects.create(
                warehouse=warehouse,
                user=request.user,
                movement_type='OUT',
                notes=f'Venta Portal {fecha}',
                authorized=True,
                authorized_by=request.user,
                authorized_at=timezone.now()
            )
            for item in sales_order.items.all():
                InventoryMovementDetail.objects.create(
                    movement=movimiento,
                    product_variant=item.product_variant,
                    quantity=item.quantity,
                    price=item.unit_price,
                    total=Decimal(item.quantity) * Decimal(item.unit_price),
                    notes=f'Venta Portal {fecha}'
                )
        except Exception as e:
            # Puedes loggear el error si lo deseas
            pass
        return response
    queryset = SalesOrder.objects.all().order_by('-created_at')
    serializer_class = SalesOrderSerializer

    def update(self, request, *args, **kwargs):
        """Override update to ensure fresh data in response"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(serializer.data)

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

class InventoryGeneralView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get query parameters from the URL, default to None if not provided
        product_variant_id = request.query_params.get('product_variant_id') or request.query_params.get('product_variant')
        warehouse_id = request.query_params.get('warehouse')
        product_name = request.query_params.get('product')
        brand_name = request.query_params.get('brand')
        category_name = request.query_params.get('category')

        # Start with all stocks, use select_related for optimization
        stocks = ProductWarehouseStock.objects.select_related(
            'product_variant__product__category',
            'product_variant__product__brand',
            'warehouse'
        ).all()

        # Apply filters if query params are provided
        if product_variant_id:
            stocks = stocks.filter(product_variant__id=product_variant_id)
        if warehouse_id:
            stocks = stocks.filter(warehouse__id=warehouse_id)
        if product_name:
            stocks = stocks.filter(product_variant__product__name__icontains=product_name)
        if brand_name:
            stocks = stocks.filter(product_variant__product__brand__name__icontains=brand_name)
        if category_name:
            stocks = stocks.filter(product_variant__product__category__name__icontains=category_name)
        
        data = []
        for stock in stocks:
            product = stock.product_variant.product
            data.append({
                'id': stock.product_variant.id,  # ID del producto variant
                'product_variant_id': stock.product_variant.id,  # Para consistencia con frontend
                'name': stock.product_variant.name,
                'sku': stock.product_variant.sku,
                'brand': product.brand.name if product.brand else None,
                'category': product.category.name if product.category else None,
                'warehouse': stock.warehouse.id,
                'warehouse_name': stock.warehouse.name,  # Añadir nombre del almacén
                'stock': stock.quantity,
                'status': product.status,
                'minimum_stock': product.minimum_stock,
                'maximum_stock': product.maximum_stock
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
from django.http import JsonResponse

def user_menu_options(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Usuario no autenticado'}, status=401)
    
    # Aquí iría la lógica para obtener opciones de menú
    options = [
        {'name': 'Productos', 'url': '/products'},
        {'name': 'Almacenes', 'url': '/warehouses'},
        {'name': 'Inventario', 'url': '/inventory'},
        {'name': 'Movimientos de Inventario', 'url': '/movements'},  # NUEVO!
    ]
    
    return JsonResponse({'menu_options': options})

# === NUEVAS VISTAS DE MOVIMIENTOS DE INVENTARIO - IMPLEMENTACIÓN LIMPIA ===

from .models import InventoryMovement, InventoryMovementDetail
from .serializers import InventoryMovementSerializer, InventoryMovementDetailSerializer

class InventoryMovementViewSet(viewsets.ModelViewSet):
    """
    ViewSet para movimientos de inventario con sistema de autorización
    """
    queryset = InventoryMovement.objects.select_related('warehouse', 'user', 'authorized_by', 'cancelled_by').prefetch_related('details__product_variant__product').order_by('-created_at')
    serializer_class = InventoryMovementSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        """Incluir el request en el contexto del serializer"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        queryset = super().get_queryset()
        product_id = self.request.query_params.get('product')
        variant_id = self.request.query_params.get('variant')
        sku = self.request.query_params.get('sku')
        name = self.request.query_params.get('name')

        # Filtrar por producto (por detalles)
        if product_id:
            queryset = queryset.filter(details__product_variant__product_id=product_id)
        if variant_id:
            queryset = queryset.filter(details__product_variant_id=variant_id)
        if sku:
            queryset = queryset.filter(details__product_variant__sku__icontains=sku)
        if name:
            queryset = queryset.filter(details__product_variant__name__icontains=name)
        return queryset.distinct()

    def perform_create(self, serializer):
        """Asignar el usuario actual al crear un movimiento"""
        serializer.save(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """
        Crear un movimiento de inventario con sus detalles
        """
        import logging
        from django.db import transaction
        
        logger = logging.getLogger(__name__)
        
        try:
            # Obtener los datos del request
            data = getattr(request, 'data', request.POST)
            logger.info(f"📦 InventoryMovement CREATE - Data recibida: {data}")
            
            # Si los datos vienen como string, convertir a dict
            if isinstance(data, str):
                import json
                data = json.loads(data)
            
            # Hacer una copia mutable de los datos
            if hasattr(data, 'copy'):
                data = data.copy()
            else:
                data = dict(data)
            
            # Extraer los detalles del request
            details_data = data.pop('details', [])
            logger.info(f"📦 Detalles extraídos: {details_data}")
            
            # Usar transacción para asegurar atomicidad
            with transaction.atomic():
                # Crear el movimiento principal
                serializer = self.get_serializer(data=data)
                if not serializer.is_valid():
                    logger.error(f"📦 Error validando movimiento: {serializer.errors}")
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
                movement = serializer.save(user=request.user)
                logger.info(f"📦 Movimiento creado con ID: {movement.id}")
                
                # Crear los detalles
                created_details = []
                for i, detail_data in enumerate(details_data):
                    logger.info(f"📦 Procesando detalle {i}: {detail_data}")
                    
                    detail_data['movement'] = movement.id
                    detail_serializer = InventoryMovementDetailSerializer(data=detail_data)
                    
                    if detail_serializer.is_valid():
                        detail = detail_serializer.save(movement=movement)

                        # Actualizar el stock en ProductWarehouseStock al crear el detalle
                        try:
                            pv = ProductVariant.objects.get(id=detail.product_variant_id)
                            warehouse = Warehouse.objects.get(id=movement.warehouse_id)
                            stock, _ = ProductWarehouseStock.objects.get_or_create(product_variant=pv, warehouse=warehouse)

                            qty = float(detail.quantity)
                            mt = movement.movement_type.lower()
                            if mt in ['in', 'entrada', 'ingreso', 'compra', 'ajuste+', 'ajuste positivo']:
                                stock.quantity += qty
                            elif mt in ['out', 'salida', 'egreso', 'venta', 'ajuste-', 'ajuste negativo']:
                                stock.quantity -= qty
                            else:
                                # Si el tipo no es reconocido, no ajustar stock aquí
                                logger.warning(f"Tipo de movimiento no soportado para stock: {movement.movement_type}")
                                raise Exception(f'Unsupported movement type: {movement.movement_type}')
                            stock.save()
                        except Exception as e:
                            logger.error(f"Error actualizando stock para detalle {i}: {str(e)}")
                        
                        created_details.append(detail)
                        logger.info(f"📦 Detalle creado: {detail.id}")
                    else:
                        logger.error(f"📦 Error validando detalle {i}: {detail_serializer.errors}")
                        # La transacción se deshará automáticamente
                        return Response({
                            'error': 'Error en los detalles del movimiento',
                            'detail_errors': detail_serializer.errors,
                            'detail_index': i
                        }, status=status.HTTP_400_BAD_REQUEST)
                
                logger.info(f"📦 Total detalles creados: {len(created_details)}")
                
                # Retornar el movimiento completo con detalles
                headers = self.get_success_headers(serializer.data)
                movement_data = self.get_serializer(movement).data
                
                return Response(
                    movement_data, 
                    status=status.HTTP_201_CREATED, 
                    headers=headers
                )
                
        except Exception as e:
            logger.error(f"📦 Error general creando movimiento: {e}")
            import traceback
            traceback.print_exc()
            return Response({
                'error': 'Error interno del servidor',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def update(self, request, *args, **kwargs):
        movement = self.get_object()
        
        # Solo permitir edición si no está autorizado
        if movement.authorized:
            return Response(
                {'error': 'No se puede editar un movimiento ya autorizado'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(movement, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        movement = serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def authorize(self, request, pk=None):
        """Autorizar un movimiento de inventario"""
        import logging
        from django.utils import timezone
        
        logger = logging.getLogger(__name__)
        
        try:
            movement = self.get_object()
            
            # Validar que el usuario actual no sea el creador
            if movement.user == request.user:
                return Response(
                    {'error': 'No puedes autorizar un movimiento que tú mismo creaste'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Validar que no esté ya autorizado
            if movement.authorized:
                return Response(
                    {'error': 'Este movimiento ya está autorizado'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validar que no esté cancelado
            if movement.is_cancelled:
                return Response(
                    {'error': 'No se puede autorizar un movimiento cancelado'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Autorizar el movimiento
            movement.authorized = True
            movement.authorized_by = request.user
            movement.authorized_at = timezone.now()
            movement.save()
            
            logger.info(f"Movimiento {movement.id} autorizado por usuario {request.user.id}")
            
            return Response({
                'message': 'Movimiento autorizado exitosamente',
                'authorized_by': request.user.email,
                'authorized_at': movement.authorized_at
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error autorizando movimiento: {str(e)}")
            return Response(
                {'error': f'Error autorizando movimiento: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def cancel_movement(self, request, pk=None):
        """Cancelar un movimiento autorizado"""
        import logging
        
        logger = logging.getLogger(__name__)
        
        try:
            movement = self.get_object()
            cancellation_reason = request.data.get('reason', '')
            
            if not cancellation_reason:
                return Response(
                    {'error': 'Se requiere una razón para cancelar el movimiento'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validar que esté autorizado
            if not movement.authorized:
                return Response(
                    {'error': 'Solo se pueden cancelar movimientos autorizados'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validar que no esté ya cancelado
            if movement.is_cancelled:
                return Response(
                    {'error': 'Este movimiento ya está cancelado'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Cancelar usando el método del modelo
            reverse_movement = movement.cancel_movement(request.user, cancellation_reason)
            
            logger.info(f"Movimiento {movement.id} cancelado por usuario {request.user.id}")
            
            return Response({
                'message': 'Movimiento cancelado exitosamente',
                'cancelled_by': request.user.email,
                'cancelled_at': movement.cancelled_at,
                'cancellation_reason': cancellation_reason,
                'reverse_movement_id': reverse_movement.id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error cancelando movimiento: {str(e)}")
            return Response(
                {'error': f'Error cancelando movimiento: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        """Eliminar un movimiento (solo si no está autorizado)"""
        import logging
        
        logger = logging.getLogger(__name__)
        
        try:
            movement = self.get_object()
            
            # Validar que no esté autorizado
            if movement.authorized:
                return Response(
                    {'error': 'No se puede eliminar un movimiento autorizado. Debe cancelarlo en su lugar.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Validar que sea el creador o tenga permisos
            if movement.user != request.user and not request.user.is_staff:
                return Response(
                    {'error': 'Solo el creador del movimiento o un administrador puede eliminarlo'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            return super().destroy(request, *args, **kwargs)
            
        except Exception as e:
            logger.error(f"Error eliminando movimiento: {str(e)}")
            return Response(
                {'error': f'Error eliminando movimiento: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class InventoryMovementDetailViewSet(viewsets.ModelViewSet):
    """
    ViewSet para detalles de movimientos de inventario
    """
    queryset = InventoryMovementDetail.objects.select_related('movement', 'product_variant').all()
    serializer_class = InventoryMovementDetailSerializer
    permission_classes = [IsAuthenticated]

# === VIEWSET PARA PAGOS DE CLIENTES ===
from .customer_payment_serializer import CustomerPaymentSerializer

class CustomerPaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet para pagos de clientes (abonos a cuenta)
    """
    queryset = CustomerPayment.objects.select_related('customer', 'created_by').order_by('-payment_date')
    serializer_class = CustomerPaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        """Asignar el usuario actual al crear un pago"""
        serializer.save(created_by=self.request.user)
    
    def get_queryset(self):
        """Filtrar pagos por cliente si se especifica"""
        queryset = super().get_queryset()
        customer_id = self.request.query_params.get('customer_id', None)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        return queryset


# === VIEWSET PARA PAGOS DE PROVEEDORES ===
from .supplier_payment_serializer import SupplierPaymentSerializer

class SupplierPaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet para pagos a proveedores (abonos a cuenta)
    """
    queryset = SupplierPayment.objects.select_related('supplier', 'created_by').order_by('-payment_date')
    serializer_class = SupplierPaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        """Asignar el usuario actual al crear un pago"""
        serializer.save(created_by=self.request.user)
    
    def get_queryset(self):
        """Filtrar pagos por proveedor si se especifica"""
        queryset = super().get_queryset()
        supplier_id = self.request.query_params.get('supplier_id', None)
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)
        return queryset


# === VISTAS PARA DASHBOARD ===
from django.db.models import Sum, Count, F, Case, When, IntegerField, Q
from django.utils import timezone
from datetime import datetime, timedelta

class DashboardSummaryAPIView(APIView):
    """
    Vista principal para el resumen del dashboard
    Devuelve alertas críticas, operaciones del día y productos críticos
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        today = timezone.now().date()
        
        # 1. ALERTAS CRÍTICAS
        # Productos sin stock
        zero_stock_query = ProductWarehouseStock.objects.filter(
            quantity=0
        ).select_related(
            'product_variant__product'
        )[:10]
        
        zero_stock_products = []
        for stock in zero_stock_query:
            if stock.product_variant and stock.product_variant.product:
                zero_stock_products.append({
                    'product_variant__product__id': stock.product_variant.product.id,
                    'product_variant__product__name': stock.product_variant.product.name,
                    'product_variant__product__sku': stock.product_variant.product.sku or '',
                    'product_variant__sku': stock.product_variant.sku,
                    'stock_quantity': float(stock.quantity),
                    'minimum_stock': float(stock.min_stock)
                })
        
        # Productos con stock bajo
        low_stock_query = ProductWarehouseStock.objects.filter(
            quantity__gt=0,
            quantity__lte=F('min_stock')
        ).select_related(
            'product_variant__product'
        )[:10]
        
        low_stock_products = []
        for stock in low_stock_query:
            if stock.product_variant and stock.product_variant.product:
                low_stock_products.append({
                    'product_variant__product__id': stock.product_variant.product.id,
                    'product_variant__product__name': stock.product_variant.product.name,
                    'product_variant__product__sku': stock.product_variant.product.sku or '',
                    'product_variant__sku': stock.product_variant.sku,
                    'stock_quantity': float(stock.quantity),
                    'minimum_stock': float(stock.min_stock)
                })
        
        # Órdenes de compra pendientes
        pending_orders = PurchaseOrder.objects.filter(
            status__in=['PENDING', 'PARTIALLY_RECEIVED']
        ).count()
        
        # Productos inactivos
        inactive_products = Product.objects.filter(is_active=False).count()
        
        # 2. OPERACIONES DEL DÍA
        # Órdenes de compra de hoy
        purchase_orders_today = PurchaseOrder.objects.filter(created_at__date=today)
        po_created = purchase_orders_today.count()
        po_received = purchase_orders_today.filter(status='RECEIVED').count()
        po_pending = PurchaseOrder.objects.filter(status='PENDING').count()
        
        # Pedidos de venta de hoy
        sales_orders_today = SalesOrder.objects.filter(created_at__date=today)
        so_new = sales_orders_today.count()
        so_processing = SalesOrder.objects.filter(status='PROCESSING').count()
        so_dispatched = sales_orders_today.filter(status='DISPATCHED').count()
        
        # Movimientos de inventario de hoy
        movements_today = InventoryMovement.objects.filter(created_at__date=today)
        entries = movements_today.filter(type='IN').count()
        exits = movements_today.filter(type='OUT').count()
        adjustments = movements_today.filter(type='ADJUSTMENT').count()
        transfers = movements_today.filter(type='TRANSFER').count()
        
        # 3. ÚLTIMOS MOVIMIENTOS
        latest_movements = InventoryMovement.objects.select_related(
            'warehouse', 'created_by'
        ).prefetch_related(
            'details__product_variant__product'
        ).order_by('-created_at')[:5]
        
        movements_data = []
        for movement in latest_movements:
            product_names = []
            total_quantity = 0
            for detail in movement.details.all()[:3]:  # Solo los primeros 3 productos
                if detail.product_variant and detail.product_variant.product:
                    product_names.append(detail.product_variant.product.name)
                total_quantity += detail.quantity or 0
            
            # Mapear tipos de movimiento
            type_mapping = {
                'IN': 'Entrada',
                'OUT': 'Salida', 
                'ADJUSTMENT': 'Ajuste',
                'TRANSFER': 'Transferencia'
            }
            
            movements_data.append({
                'id': movement.id,
                'date': movement.created_at.strftime('%Y-%m-%d'),
                'product': ', '.join(product_names) if product_names else 'Sin productos',
                'type': type_mapping.get(movement.type, movement.type),
                'quantity': total_quantity if movement.type == 'IN' else -total_quantity if movement.type == 'OUT' else total_quantity,
                'user': movement.created_by.username if movement.created_by else 'Sistema'
            })
        
        # Contar totales para alertas
        zero_stock_total = ProductWarehouseStock.objects.filter(stock_quantity=0).values('product_variant__product').distinct().count()
        low_stock_total = ProductWarehouseStock.objects.filter(stock_quantity__gt=0, stock_quantity__lte=F('minimum_stock')).values('product_variant__product').distinct().count()
        
        # Estructurar respuesta
        data = {
            'alerts': {
                'zeroStock': {
                    'count': zero_stock_total,
                    'products': [
                        {
                            'id': p['product_variant__product__id'],
                            'name': p['product_variant__product__name'],
                            'sku': p['product_variant__product__sku'] or p['product_variant__sku'],
                            'current_stock': p['stock_quantity'],
                            'minimum_stock': p['minimum_stock']
                        } for p in zero_stock_products
                    ]
                },
                'lowStock': {
                    'count': low_stock_total,
                    'products': [
                        {
                            'id': p['product_variant__product__id'],
                            'name': p['product_variant__product__name'],
                            'sku': p['product_variant__product__sku'] or p['product_variant__sku'],
                            'current_stock': p['stock_quantity'],
                            'minimum_stock': p['minimum_stock']
                        } for p in low_stock_products
                    ]
                },
                'pendingOrders': {'count': pending_orders, 'orders': []},
                'inactiveProducts': {'count': inactive_products, 'products': []}
            },
            'todayOperations': {
                'purchaseOrders': {
                    'created': po_created,
                    'received': po_received,
                    'pending': po_pending
                },
                'salesOrders': {
                    'new': so_new,
                    'processing': so_processing,
                    'dispatched': so_dispatched
                },
                'movements': {
                    'entries': entries,
                    'exits': exits,
                    'adjustments': adjustments,
                    'transfers': transfers
                }
            },
            'recentData': {
                'latestMovements': movements_data,
                'activePurchaseOrders': [],
                'criticalProducts': []
            }
        }
        
        # Si no hay datos del día actual, usar datos de los últimos 7 días para mostrar algo útil
        if (po_created == 0 and so_new == 0 and entries == 0):
            week_ago = today - timedelta(days=7)
            
            # Datos de la semana pasada para referencia
            week_po = PurchaseOrder.objects.filter(created_at__date__gte=week_ago).count()
            week_so = SalesOrder.objects.filter(created_at__date__gte=week_ago).count()
            week_movements = InventoryMovement.objects.filter(created_at__date__gte=week_ago).count()
            
            # Agregar información adicional si no hay actividad hoy
            data['weeklyContext'] = {
                'purchaseOrders': week_po,
                'salesOrders': week_so,
                'movements': week_movements,
                'note': 'No hay actividad hoy. Datos de los últimos 7 días.'
            }
        
        return Response(data)


class InitializeTestDataAPIView(APIView):
    """Vista para inicializar datos de prueba si no existen"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            from django.contrib.auth.models import User
            
            # Crear marcas y categorías básicas primero
            categories_data = [
                {'name': 'Electrónicos', 'description': 'Productos electrónicos'},
                {'name': 'Computación', 'description': 'Productos de computación'},
                {'name': 'Accesorios', 'description': 'Accesorios y complementos'},
                {'name': 'Hogar', 'description': 'Productos para el hogar'},
            ]
            
            brands_data = [
                {'name': 'Samsung', 'description': 'Marca Samsung'},
                {'name': 'Apple', 'description': 'Marca Apple'},
                {'name': 'Sony', 'description': 'Marca Sony'},
                {'name': 'LG', 'description': 'Marca LG'},
                {'name': 'Genérica', 'description': 'Marca genérica'},
            ]
            
            # Crear categorías
            for cat_data in categories_data:
                Category.objects.get_or_create(
                    name=cat_data['name'],
                    defaults={'description': cat_data['description']}
                )
            
            # Crear marcas
            for brand_data in brands_data:
                Brand.objects.get_or_create(
                    name=brand_data['name'],
                    defaults={'description': brand_data['description']}
                )
            
            # Crear algunos productos de prueba si no existen
            if Product.objects.count() == 0:
                # Obtener categoría y marca por defecto
                category = Category.objects.get(name='Electrónicos')
                brand = Brand.objects.get(name='Samsung')
                
                # Crear productos
                products_data = [
                    {'name': 'Smartphone Galaxy S21', 'sku': 'SGS21001', 'description': 'Teléfono inteligente'},
                    {'name': 'Tablet Galaxy Tab', 'sku': 'SGT001', 'description': 'Tablet Android'},
                    {'name': 'Auriculares Bluetooth', 'sku': 'AUR001', 'description': 'Auriculares inalámbricos'}
                ]
                
                for prod_data in products_data:
                    product, created = Product.objects.get_or_create(
                        sku=prod_data['sku'],
                        defaults={
                            'name': prod_data['name'],
                            'description': prod_data['description'],
                            'category': category,
                            'brand': brand,
                            'is_active': True
                        }
                    )
                    
                    if created:
                        # Crear variante principal
                        variant, _ = ProductVariant.objects.get_or_create(
                            product=product,
                            sku=f"{product.sku}-STD",
                            defaults={'name': 'Estándar', 'is_main': True}
                        )
                        
                        # Crear stock inicial (algunos con stock bajo o cero)
                        if Warehouse.objects.exists():
                            warehouse = Warehouse.objects.first()
                            stock_qty = 0 if 'Galaxy S21' in product.name else (2 if 'Tab' in product.name else 50)
                            min_stock = 10 if 'Galaxy S21' in product.name else (8 if 'Tab' in product.name else 15)
                            
                            ProductWarehouseStock.objects.get_or_create(
                                product_variant=variant,
                                warehouse=warehouse,
                                defaults={
                                    'stock_quantity': stock_qty,
                                    'minimum_stock': min_stock
                                }
                            )
            
            # Crear algunos movimientos de prueba si no existen
            if InventoryMovement.objects.count() == 0 and Warehouse.objects.exists():
                warehouse = Warehouse.objects.first()
                user = request.user
                
                # Crear movimientos de entrada
                movement = InventoryMovement.objects.create(
                    warehouse=warehouse,
                    type='IN',
                    notes='Movimiento de prueba - Entrada inicial',
                    created_by=user
                )
                
                if ProductVariant.objects.exists():
                    variant = ProductVariant.objects.first()
                    InventoryMovementDetail.objects.create(
                        movement=movement,
                        product_variant=variant,
                        quantity=100,
                        notes='Stock inicial'
                    )
            
            return Response({'message': 'Datos de prueba inicializados correctamente'})
            
        except Exception as e:
            return Response({'error': str(e)}, status=400)


class ProductsZeroStockAPIView(APIView):
    """Vista para productos sin stock"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        products = ProductWarehouseStock.objects.filter(
            stock_quantity=0
        ).select_related(
            'product_variant__product__category',
            'product_variant__product__brand',
            'warehouse'
        ).values(
            'product_variant__product__id',
            'product_variant__product__name',
            'product_variant__product__sku',
            'product_variant__sku',
            'product_variant__product__category__name',
            'product_variant__product__brand__name',
            'warehouse__name',
            'stock_quantity',
            'minimum_stock',
            'last_updated'
        ).distinct()
        
        data = [
            {
                'id': p['product_variant__product__id'],
                'name': p['product_variant__product__name'],
                'sku': p['product_variant__product__sku'] or p['product_variant__sku'],
                'category': p['product_variant__product__category__name'] or 'Sin categoría',
                'brand': p['product_variant__product__brand__name'] or 'Sin marca',
                'warehouse': p['warehouse__name'],
                'current_stock': p['stock_quantity'],
                'minimum_stock': p['minimum_stock'],
                'last_updated': p['last_updated']
            } for p in products
        ]
        
        return Response(data)


class ProductsLowStockAPIView(APIView):
    """Vista para productos con stock bajo"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        products = ProductWarehouseStock.objects.filter(
            stock_quantity__gt=0,
            stock_quantity__lte=F('minimum_stock')
        ).select_related(
            'product_variant__product__category',
            'product_variant__product__brand',
            'warehouse'
        ).values(
            'product_variant__product__id',
            'product_variant__product__name',
            'product_variant__product__sku',
            'product_variant__sku',
            'product_variant__product__category__name',
            'product_variant__product__brand__name',
            'warehouse__name',
            'stock_quantity',
            'minimum_stock',
            'last_updated'
        ).distinct()
        
        data = [
            {
                'id': p['product_variant__product__id'],
                'name': p['product_variant__product__name'],
                'sku': p['product_variant__product__sku'] or p['product_variant__sku'],
                'category': p['product_variant__product__category__name'] or 'Sin categoría',
                'brand': p['product_variant__product__brand__name'] or 'Sin marca',
                'warehouse': p['warehouse__name'],
                'current_stock': p['stock_quantity'],
                'minimum_stock': p['minimum_stock'],
                'last_updated': p['last_updated']
            } for p in products
        ]
        
        return Response(data)


class PendingPurchaseOrdersAPIView(APIView):
    """Vista para órdenes de compra pendientes"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        orders = PurchaseOrder.objects.filter(
            status__in=['PENDING', 'PARTIALLY_RECEIVED']
        ).select_related(
            'supplier', 'created_by'
        ).values(
            'id',
            'order_number',
            'supplier__name',
            'total_amount',
            'status',
            'expected_date',
            'created_at',
            'created_by__username'
        ).order_by('-created_at')
        
        data = [
            {
                'id': o['id'],
                'order_number': o['order_number'],
                'supplier': o['supplier__name'],
                'total_amount': float(o['total_amount']) if o['total_amount'] else 0,
                'status': o['status'],
                'expected_date': o['expected_date'],
                'created_at': o['created_at'],
                'created_by': o['created_by__username']
            } for o in orders
        ]
        
        return Response(data)


class DebugFiltersAPIView(APIView):
    """Vista de debug para verificar marcas y categorías"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from .models import Brand, Category
        
        brands = Brand.objects.all()
        categories = Category.objects.all()
        
        data = {
            'brands_count': brands.count(),
            'categories_count': categories.count(),
            'brands': [{'id': b.id, 'name': b.name} for b in brands[:10]],
            'categories': [{'id': c.id, 'name': c.name} for c in categories[:10]],
            'debug_info': {
                'timestamp': timezone.now(),
                'user': request.user.username,
                'api_available': True
            }
        }
        
        return Response(data)
from rest_framework import generics
from .models import ConsultaTienda
from .serializers import ConsultaTiendaSerializer

class ConsultaTiendaListView(generics.ListAPIView):
    queryset = ConsultaTienda.objects.all()
    serializer_class = ConsultaTiendaSerializer
