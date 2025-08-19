import csv
from decimal import Decimal, InvalidOperation
from io import StringIO
from django.db import transaction

from .models import (
    AuditLog, User, Business, Category, Brand, Unit, Product, ProductVariant, 
    Warehouse, ProductWarehouseStock, Supplier, SupplierProduct, PurchaseOrder, 
    PurchaseOrderItem, PurchaseOrderReceipt, PurchaseOrderReceiptItem,
    InventoryMovement, InventoryMovementDetail, ExchangeRate, CustomerType, 
    Customer, SalesOrder, SalesOrderItem, Quotation, QuotationItem,
    Role, MenuOption
)
from .serializers import (
    AuditLogSerializer, UserSerializer, BusinessSerializer, CategorySerializer, 
    BrandSerializer, UnitSerializer, ProductSerializer, ProductVariantSerializer,
    WarehouseSerializer, ProductWarehouseStockSerializer, SupplierSerializer, 
    SupplierProductSerializer, PurchaseOrderSerializer, PurchaseOrderItemSerializer, 
    PurchaseOrderReceiptSerializer, PurchaseOrderReceiptItemSerializer, 
    InventoryMovementSerializer, InventoryMovementDetailSerializer, ExchangeRateSerializer, 
    CustomerTypeSerializer, CustomerSerializer, SalesOrderSerializer, SalesOrderItemSerializer,
    QuotationSerializer, QuotationItemSerializer, RoleSerializer, MenuOptionSerializer
)

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend

# Permiso para importadores y vistas de edición
class IsStaffOrReadOnly(IsAuthenticated):
    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return super().has_permission(request, view)
        return super().has_permission(request, view) and (request.user.is_staff or request.user.is_superuser)

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer

# === VIEWSETS PRINCIPALES ===

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def create(self, request, *args, **kwargs):
        """Crear un nuevo usuario"""
        data = request.data.copy()
        
        # Validar campos requeridos
        required_fields = ['email', 'first_name', 'last_name']
        for field in required_fields:
            if not data.get(field):
                return Response(
                    {'error': f'El campo {field} es requerido.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Verificar que el email no exista
        if User.objects.filter(email=data['email']).exists():
            return Response(
                {'error': 'Ya existe un usuario con este email.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Crear el usuario
            user = User.objects.create_user(
                email=data['email'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                is_active=data.get('is_active', True),
                is_staff=data.get('is_staff', False)
            )
            
            # Establecer contraseña por defecto
            user.set_password('123456')  # Contraseña temporal
            user.save()
            
            serializer = self.get_serializer(user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Error al crear usuario: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reset_password(self, request, pk=None):
        """Endpoint para restablecer la contraseña de un usuario"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'No tienes permisos para restablecer contraseñas.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        new_password = request.data.get('new_password')
        
        if not new_password:
            return Response(
                {'error': 'La nueva contraseña es requerida.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_password) < 6:
            return Response(
                {'error': 'La contraseña debe tener al menos 6 caracteres.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Establecer la nueva contraseña
            user.set_password(new_password)
            user.save()
            
            # Crear log de auditoría
            AuditLog.objects.create(
                user=request.user,
                action='RESET_PASSWORD',
                model='User',
                object_id=user.id,
                description=f'Contraseña restablecida para usuario: {user.email}'
            )
            
            return Response({
                'message': f'Contraseña restablecida exitosamente para {user.email}.',
                'user_id': user.id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error al restablecer contraseña: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
    
    @action(detail=False, methods=['get'])
    def by_status(self, request):
        """Filtrar productos por status"""
        status_param = request.query_params.get('status')
        if status_param:
            products = self.get_queryset().filter(status=status_param)
            serializer = self.get_serializer(products, many=True)
            return Response(serializer.data)
        return Response({'error': 'status es requerido'}, status=400)

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
    queryset = PurchaseOrder.objects.select_related('supplier', 'business').prefetch_related('purchaseorderitem_set__product_variant__product').all()
    serializer_class = PurchaseOrderSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    @action(detail=False, methods=['get'])
    def by_status(self, request):
        """Filtrar órdenes por status"""
        status_param = request.query_params.get('status')
        if status_param:
            orders = self.get_queryset().filter(status=status_param)
            serializer = self.get_serializer(orders, many=True)
            return Response(serializer.data)
        return Response({'error': 'status es requerido'}, status=400)

class PurchaseOrderItemViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderItem.objects.select_related('purchase_order', 'product_variant__product').all()
    serializer_class = PurchaseOrderItemSerializer

class PurchaseOrderReceiptViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderReceipt.objects.all()
    serializer_class = PurchaseOrderReceiptSerializer

class PurchaseOrderReceiptItemViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderReceiptItem.objects.all()
    serializer_class = PurchaseOrderReceiptItemSerializer

class InventoryMovementViewSet(viewsets.ModelViewSet):
    queryset = InventoryMovement.objects.all()
    serializer_class = InventoryMovementSerializer

class InventoryMovementDetailViewSet(viewsets.ModelViewSet):
    queryset = InventoryMovementDetail.objects.all()
    serializer_class = InventoryMovementDetailSerializer
    permission_classes = [IsAuthenticated]

class ExchangeRateViewSet(viewsets.ModelViewSet):
    queryset = ExchangeRate.objects.all()
    serializer_class = ExchangeRateSerializer

class CustomerTypeViewSet(viewsets.ModelViewSet):
    queryset = CustomerType.objects.all()
    serializer_class = CustomerTypeSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

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

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.select_related('business').all()
    serializer_class = RoleSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['business']
    permission_classes = [IsStaffOrReadOnly]

class MenuOptionViewSet(viewsets.ModelViewSet):
    queryset = MenuOption.objects.select_related('business').prefetch_related('roles').all()
    serializer_class = MenuOptionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['business']
    permission_classes = [IsStaffOrReadOnly]

# === VISTAS API ADICIONALES ===

class MenuOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        business_id = request.query_params.get('business_id') or getattr(user, 'business_id', None)
        if hasattr(user, 'role') and user.role and business_id:
            options = MenuOption.objects.filter(
                roles=user.role, business_id=business_id
            ).values_list('name', flat=True)
        else:
            options = []
        return Response({'menu_options': list(options)})

class CurrentInventoryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Obtiene el inventario actual de todos los productos en todos los almacenes"""
        try:
            # Obtener todos los stocks con información relacionada
            stocks = ProductWarehouseStock.objects.select_related(
                'product_variant', 
                'product_variant__product',
                'warehouse'
            ).filter(
                product_variant__is_active=True,
                warehouse__is_active=True
            ).order_by('warehouse__name', 'product_variant__name')
            
            inventory_data = []
            for stock in stocks:
                inventory_data.append({
                    'warehouse': stock.warehouse.name,
                    'product': stock.product_variant.product.name,
                    'variant': stock.product_variant.name,
                    'sku': stock.product_variant.sku,
                    'quantity': float(stock.quantity),
                    'minimum_stock': float(stock.minimum_stock) if stock.minimum_stock else 0,
                    'maximum_stock': float(stock.maximum_stock) if stock.maximum_stock else 0,
                })
            
            return Response(inventory_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error al obtener inventario: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class WarehouseListView(APIView):
    """Listar almacenes para formularios"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            warehouses = Warehouse.objects.all().values('id', 'name', 'location')
            return Response(list(warehouses), status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': f'Error obteniendo almacenes: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# === ENDPOINTS PARA ROLES Y OPCIONES DE MENÚ ===

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_menu_options(request):
    """Obtiene las opciones de menú del usuario autenticado"""
    try:
        user = request.user
        if hasattr(user, 'userprofile') and user.userprofile.role:
            role = user.userprofile.role
            options = MenuOption.objects.filter(roles=role).values('name', 'url', 'icon')
            return Response({'menu_options': list(options)}, status=status.HTTP_200_OK)
        else:
            return Response({'menu_options': []}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': f'Error al obtener opciones de menú: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
