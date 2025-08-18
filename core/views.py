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
    Role, MenuOption, InventoryMovement, InventoryMovementDetail, CustomerPayment
)

from .serializers import (
    BusinessSerializer, CategorySerializer, BrandSerializer, UnitSerializer, ProductSerializer, ProductVariantSerializer,
    WarehouseSerializer, ProductWarehouseStockSerializer, SupplierSerializer, SupplierProductSerializer,
    PurchaseOrderSerializer, PurchaseOrderItemSerializer, PurchaseOrderReceiptSerializer, PurchaseOrderReceiptItemSerializer,
    ExchangeRateSerializer, CustomerTypeSerializer, CustomerSerializer, SalesOrderSerializer, SalesOrderItemSerializer,
    QuotationSerializer, QuotationItemSerializer, RoleSerializer, MenuOptionSerializer,
    InventoryMovementSerializer, InventoryMovementDetailSerializer
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

from rest_framework.pagination import PageNumberPagination
from django.db.models import Q

class CustomPageNumberPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category', 'brand').all()
    serializer_class = ProductSerializer
    pagination_class = CustomPageNumberPagination
    
    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', None)
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(sku__icontains=search) |
                Q(code__icontains=search) |
                Q(brand__name__icontains=search)
            ).distinct()
        
        return queryset.order_by('name')

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
