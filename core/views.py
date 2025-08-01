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
# --- Endpoint para autorizar movimientos de almacén ---
from django.utils import timezone
from .models import InventoryMovement, ProductWarehouseStock

class AuthorizeInventoryMovementView(APIView):
    permission_classes = [IsStaffOrReadOnly]

    def post(self, request):
        movement_id = request.data.get('movement_id')
        if not movement_id:
            return Response({'error': 'Falta movement_id.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            movement = InventoryMovement.objects.select_related('warehouse').get(id=movement_id)
        except InventoryMovement.DoesNotExist:
            return Response({'error': 'Movimiento no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if movement.authorized:
            return Response({'error': 'El movimiento ya está autorizado.'}, status=status.HTTP_400_BAD_REQUEST)
        from .models import InventoryMovementDetail, ProductWarehouseStock
        with transaction.atomic():
            # Actualizar inventario para cada detalle
            detalles = InventoryMovementDetail.objects.filter(movement=movement)
            stock_actualizado = []
            for detalle in detalles:
                stock, _ = ProductWarehouseStock.objects.get_or_create(
                    product_variant=detalle.product_variant,
                    warehouse=movement.warehouse
                )
                if movement.movement_type.lower() in ['entrada', 'ingreso', 'compra', 'ajuste+', 'ajuste positivo']:
                    stock.quantity += float(detalle.quantity)
                elif movement.movement_type.lower() in ['salida', 'egreso', 'venta', 'ajuste-', 'ajuste negativo']:
                    stock.quantity -= float(detalle.quantity)
                else:
                    return Response({'error': 'Tipo de movimiento no soportado.'}, status=status.HTTP_400_BAD_REQUEST)
                stock.save()
                stock_actualizado.append({
                    'product_variant': detalle.product_variant.id,
                    'new_stock': stock.quantity
                })
            # Autorizar movimiento
            movement.authorized = True
            movement.authorized_by = request.user
            movement.authorized_at = timezone.now()
            movement.save()
        return Response({
            'success': True,
            'movement_id': movement.id,
            'stocks': stock_actualizado,
            'authorized_by': request.user.email,
            'authorized_at': movement.authorized_at
        }, status=status.HTTP_200_OK)


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
                category, _ = Category.objects.get_or_create(name=category_name, business_id=business_id)
                brand, _ = Brand.objects.get_or_create(name=brand_name, business_id=business_id)
                base_unit, _ = Unit.objects.get_or_create(name=base_unit_name)
                product = Product(sku=sku, name=name, category=category, brand=brand, business_id=business_id,
                                  base_unit=base_unit, description=description, minimum_stock=minimum_stock,
                                  maximum_stock=maximum_stock, image_url=image_url)
                product.save()
                created.append({'sku': sku, 'name': name})
        return Response({
            'created': created,
            'errors': errors,
            'duplicates': duplicates,
            'total': len(created),
            'total_errors': len(errors),
            'total_duplicates': len(duplicates)
        }, status=status.HTTP_201_CREATED)

# --- Importador de Marcas ---
# CSV: name,code,country,description
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
        with transaction.atomic():
            for row in reader:
                name = row.get('name')
                code = row.get('code')
                country = row.get('country', '')
                description = row.get('description', '')
                if not (name and code):
                    errors.append({'code': code, 'error': 'Faltan campos requeridos.'})
                    continue
                if Brand.objects.filter(code=code, business_id=business_id).exists():
                    duplicates.append({'code': code, 'error': 'Código duplicado.'})
                    continue
                brand = Brand(name=name, code=code, country=country, description=description, business_id=business_id)
                brand.save()
                created.append({'code': code, 'name': name})
        return Response({
            'created': created,
            'errors': errors,
            'duplicates': duplicates,
            'total': len(created),
            'total_errors': len(errors),
            'total_duplicates': len(duplicates)
        }, status=status.HTTP_201_CREATED)

# --- Importador de Categorías ---
# CSV: name,code,description,parent
class CategoryImportView(APIView):
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
                name = row.get('name')
                code = row.get('code')
                description = row.get('description', '')
                parent_name = row.get('parent')
                if not (name and code):
                    errors.append({'code': code, 'error': 'Faltan campos requeridos.'})
                    continue
                if Category.objects.filter(code=code, business_id=business_id).exists():
                    duplicates.append({'code': code, 'error': 'Código duplicado.'})
                    continue
                parent = None
                if parent_name:
                    parent = Category.objects.filter(name=parent_name, business_id=business_id).first()
                category = Category(name=name, code=code, description=description, parent=parent, business_id=business_id)
                category.save()
                created.append({'code': code, 'name': name})
        return Response({
            'created': created,
            'errors': errors,
            'duplicates': duplicates,
            'total': len(created),
            'total_errors': len(errors),
            'total_duplicates': len(duplicates)
        }, status=status.HTTP_201_CREATED)

# --- Importador de Pedidos (SalesOrder) ---
# CSV: customer,email,order_date,status,total_amount,notes
class SalesOrderImportView(APIView):
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
                customer_name = row.get('customer')
                email = row.get('email')
                order_date = row.get('order_date')
                status_val = row.get('status')
                total_amount = row.get('total_amount')
                notes = row.get('notes', '')
                if not (customer_name and email and order_date and status_val and total_amount):
                    errors.append({'customer': customer_name, 'error': 'Faltan campos requeridos.'})
                    continue
                customer = Customer.objects.filter(name=customer_name, email=email, business_id=business_id).first()
                if not customer:
                    errors.append({'customer': customer_name, 'error': 'Cliente no encontrado.'})
                    continue
                # No hay campo único para duplicados, se permite crear
                order = SalesOrder(business_id=business_id, customer=customer, order_date=order_date,
                                  status=status_val, total_amount=total_amount, notes=notes)
                order.save()
                created.append({'customer': customer_name, 'order_date': order_date})
        return Response({
            'created': created,
            'errors': errors,
            'duplicates': duplicates,
            'total': len(created),
            'total_errors': len(errors),
            'total_duplicates': len(duplicates)
        }, status=status.HTTP_201_CREATED)

# --- Importador de Órdenes de Compra (PurchaseOrder) ---
# CSV: supplier,order_date,status,total_amount,notes
class PurchaseOrderImportView(APIView):
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
                supplier_name = row.get('supplier')
                order_date = row.get('order_date')
                status_val = row.get('status')
                total_amount = row.get('total_amount')
                notes = row.get('notes', '')
                if not (supplier_name and order_date and status_val and total_amount):
                    errors.append({'supplier': supplier_name, 'error': 'Faltan campos requeridos.'})
                    continue
                supplier = Supplier.objects.filter(name=supplier_name, business_id=business_id).first()
                if not supplier:
                    errors.append({'supplier': supplier_name, 'error': 'Proveedor no encontrado.'})
                    continue
                order = PurchaseOrder(business_id=business_id, supplier=supplier, order_date=order_date,
                                      status=status_val, total_amount=total_amount, notes=notes)
                order.save()
                created.append({'supplier': supplier_name, 'order_date': order_date})
        return Response({
            'created': created,
            'errors': errors,
            'duplicates': duplicates,
            'total': len(created),
            'total_errors': len(errors),
            'total_duplicates': len(duplicates)
        }, status=status.HTTP_201_CREATED)

# --- Importador de Cotizaciones (Quotation) ---
# CSV: customer,email,quote_date,status,total_amount,notes
class QuotationImportView(APIView):
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
                customer_name = row.get('customer')
                email = row.get('email')
                quote_date = row.get('quote_date')
                status_val = row.get('status')
                total_amount = row.get('total_amount')
                notes = row.get('notes', '')
                if not (customer_name and email and quote_date and status_val and total_amount):
                    errors.append({'customer': customer_name, 'error': 'Faltan campos requeridos.'})
                    continue
                customer = Customer.objects.filter(name=customer_name, email=email, business_id=business_id).first()
                if not customer:
                    errors.append({'customer': customer_name, 'error': 'Cliente no encontrado.'})
                    continue
                quotation = Quotation(business_id=business_id, customer=customer, quote_date=quote_date,
                                     status=status_val, total_amount=total_amount, notes=notes)
                quotation.save()
                created.append({'customer': customer_name, 'quote_date': quote_date})
        return Response({
            'created': created,
            'errors': errors,
            'duplicates': duplicates,
            'total': len(created),
            'total_errors': len(errors),
            'total_duplicates': len(duplicates)
        }, status=status.HTTP_201_CREATED)

# --- Importador de Movimientos de Almacén (InventoryMovement) ---
# CSV: product_variant,warehouse,movement_type,quantity,price,total,reference_document,notes,lote,expiration_date,aux1
class InventoryMovementImportView(APIView):
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
        created, errors = [], []
        with transaction.atomic():
            for row in reader:
                pv_sku = row.get('product_variant')
                warehouse_name = row.get('warehouse')
                movement_type = row.get('movement_type')
                quantity = row.get('quantity')
                price = row.get('price')
                total = row.get('total')
                reference_document = row.get('reference_document', '')
                notes = row.get('notes', '')
                lote = row.get('lote', '')
                expiration_date = row.get('expiration_date', None)
                aux1 = row.get('aux1', '')
                if not (pv_sku and warehouse_name and movement_type and quantity and price and total):
                    errors.append({'product_variant': pv_sku, 'error': 'Faltan campos requeridos.'})
                    continue
                pv = ProductVariant.objects.filter(sku=pv_sku).first()
                warehouse = Warehouse.objects.filter(name=warehouse_name).first()
                if not pv or not warehouse:
                    errors.append({'product_variant': pv_sku, 'error': 'Producto o almacén no encontrado.'})
                    continue
                # El movimiento se crea como NO autorizado y NO afecta inventario
                movement = InventoryMovement(
                    product_variant=pv,
                    warehouse=warehouse,
                    movement_type=movement_type,
                    quantity=quantity,
                    price=price,
                    total=total,
                    reference_document=reference_document,
                    notes=notes,
                    lote=lote,
                    expiration_date=expiration_date,
                    aux1=aux1,
                    authorized=False,
                    user=request.user if request.user.is_authenticated else None
                )
                movement.save()
                created.append({'product_variant': pv_sku, 'warehouse': warehouse_name, 'authorized': False})
        return Response({
            'created': created,
            'errors': errors,
            'total': len(created),
            'total_errors': len(errors),
            'detalle': 'Los movimientos se crean como NO autorizados y no afectan inventario hasta ser autorizados.'
        }, status=status.HTTP_201_CREATED)

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

# Permiso para importadores y vistas de edición
class IsStaffOrReadOnly(IsAuthenticated):
    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return super().has_permission(request, view)
        return super().has_permission(request, view) and (request.user.is_staff or request.user.is_superuser)

from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from django.db import transaction
import csv
from .models import Category, Brand, Product

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
                if not (sku and name and category_name and brand_name):
                    errors.append({'sku': sku, 'error': 'Faltan campos requeridos.'})
                    continue
                if Product.objects.filter(sku=sku).exists():
                    duplicates.append({'sku': sku, 'error': 'SKU duplicado.'})
                    continue
                category, _ = Category.objects.get_or_create(name=category_name, business_id=business_id)
                brand, _ = Brand.objects.get_or_create(name=brand_name, business_id=business_id)
                product = Product(sku=sku, name=name, category=category, brand=brand, business_id=business_id)
                product.save()
                created.append({'sku': sku, 'name': name})
        return Response({
            'created': created,
            'errors': errors,
            'duplicates': duplicates,
            'total': len(created),
            'total_errors': len(errors),
            'total_duplicates': len(duplicates)
        }, status=status.HTTP_201_CREATED)
from rest_framework import viewsets
from .models import (
    User, Business, Category, Brand, Unit, Product, ProductVariant, Warehouse, ProductWarehouseStock,
    Supplier, SupplierProduct, PurchaseOrder, PurchaseOrderItem, PurchaseOrderReceipt, PurchaseOrderReceiptItem,
    InventoryMovement, ExchangeRate, CustomerType, Customer, SalesOrder, SalesOrderItem, Quotation, QuotationItem,
    Role, MenuOption
)
from .serializers import (
    UserSerializer, BusinessSerializer, CategorySerializer, BrandSerializer, UnitSerializer, ProductSerializer, ProductVariantSerializer,
    WarehouseSerializer, ProductWarehouseStockSerializer, SupplierSerializer, SupplierProductSerializer, PurchaseOrderSerializer,
    PurchaseOrderItemSerializer, PurchaseOrderReceiptSerializer, PurchaseOrderReceiptItemSerializer, InventoryMovementSerializer,
    ExchangeRateSerializer, CustomerTypeSerializer, CustomerSerializer, SalesOrderSerializer, SalesOrderItemSerializer,
    QuotationSerializer, QuotationItemSerializer, RoleSerializer, MenuOptionSerializer
)

from django_filters.rest_framework import DjangoFilterBackend

from rest_framework.permissions import IsAuthenticated, IsAdminUser

class IsStaffOrReadOnly(IsAuthenticated):
    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return super().has_permission(request, view)
        return super().has_permission(request, view) and (request.user.is_staff or request.user.is_superuser)

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
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reset_password(self, request, pk=None):
        """
        Endpoint para restablecer la contraseña de un usuario.
        Solo usuarios staff pueden restablecer contraseñas.
        """
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
                details=f'Contraseña restablecida para usuario: {user.username}'
            )
            
            return Response({
                'message': f'Contraseña restablecida exitosamente para {user.username}.',
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

class InventoryMovementViewSet(viewsets.ModelViewSet):
    queryset = InventoryMovement.objects.all()
    serializer_class = InventoryMovementSerializer

    def create(self, request, *args, **kwargs):
        from rest_framework import status
        from django.db import transaction
        data = request.data.copy()
        details_data = data.pop('details', [])
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        detail_errors = []
        try:
            with transaction.atomic():
                movement = serializer.save(user=request.user if request.user.is_authenticated else None)
                for idx, detail in enumerate(details_data):
                    try:
                        detail_obj = InventoryMovementDetail.objects.create(
                            movement=movement,
                            product_variant_id=detail.get('product_variant'),
                            quantity=detail.get('quantity', 0),
                            price=detail.get('price', 0),
                            total=detail.get('total', 0),
                            lote=detail.get('lote', ''),
                            expiration_date=detail.get('expiration_date', None)
                        )
                        # Actualizar el stock en ProductWarehouseStock
                        from .models import ProductWarehouseStock, ProductVariant, Warehouse
                        pv_id = detail.get('product_variant')
                        warehouse_id = movement.warehouse_id
                        pv = ProductVariant.objects.get(id=pv_id)
                        warehouse = Warehouse.objects.get(id=warehouse_id)
                        stock, _ = ProductWarehouseStock.objects.get_or_create(product_variant=pv, warehouse=warehouse)
                        qty = float(detail.get('quantity', 0))
                        if movement.movement_type.lower() in ['entrada', 'ingreso', 'compra', 'ajuste+', 'ajuste positivo']:
                            stock.quantity += qty
                        elif movement.movement_type.lower() in ['salida', 'egreso', 'venta', 'ajuste-', 'ajuste negativo']:
                            stock.quantity -= qty
                        else:
                            raise Exception('Tipo de movimiento no soportado para stock.')
                        stock.save()
                    except Exception as e:
                        detail_errors.append({
                            'index': idx,
                            'product_variant': detail.get('product_variant'),
                            'error': str(e)
                        })
                if detail_errors:
                    raise Exception(detail_errors)
                movement.refresh_from_db()
        except Exception as e:
            # Si hubo errores, devolverlos y rollback
            return Response({'error': 'Error al crear detalles o actualizar stock', 'detail_errors': detail_errors if detail_errors else str(e)}, status=status.HTTP_400_BAD_REQUEST)
        response_serializer = self.get_serializer(movement)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=201, headers=headers)

    def update(self, request, *args, **kwargs):
        """Actualizar un movimiento de inventario no autorizado"""
        try:
            movement = self.get_object()
            
            # Solo permitir edición si no está autorizado
            if movement.authorized:
                return Response(
                    {'error': 'No se puede editar un movimiento ya autorizado'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Revertir el stock anterior antes de actualizar
            if movement.authorized:  # Solo si ya estaba procesado
                for detail in movement.details.all():
                    try:
                        pv = detail.product_variant
                        warehouse = movement.warehouse
                        stock, _ = ProductWarehouseStock.objects.get_or_create(product_variant=pv, warehouse=warehouse)
                        qty = float(detail.quantity)
                        # Revertir la operación anterior
                        if movement.movement_type.lower() in ['entrada', 'ingreso', 'compra', 'ajuste+', 'ajuste positivo']:
                            stock.quantity -= qty
                        elif movement.movement_type.lower() in ['salida', 'egreso', 'venta', 'ajuste-', 'ajuste negativo']:
                            stock.quantity += qty
                        stock.save()
                    except Exception as e:
                        continue
            
            # Eliminar detalles existentes
            movement.details.all().delete()
            
            # Actualizar campos del movimiento
            movement.warehouse_id = request.data.get('warehouse_id')
            movement.movement_type = request.data.get('movement_type')
            movement.reference_document = request.data.get('reference_document', '')
            movement.notes = request.data.get('notes', '')
            movement.save()
            
            # Crear nuevos detalles
            details = request.data.get('details', [])
            detail_errors = []
            
            for idx, detail in enumerate(details):
                try:
                    detail_obj = InventoryMovementDetail.objects.create(
                        movement=movement,
                        product_variant_id=detail.get('product_variant'),
                        quantity=detail.get('quantity'),
                        price=detail.get('price'),
                        total=detail.get('total'),
                        lote=detail.get('lote', ''),
                        expiration_date=detail.get('expiration_date') if detail.get('expiration_date') else None
                    )
                except Exception as e:
                    detail_errors.append({
                        'index': idx,
                        'product_variant': detail.get('product_variant'),
                        'error': str(e)
                    })
            
            if detail_errors:
                return Response({
                    'error': 'Error al actualizar detalles', 
                    'detail_errors': detail_errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            movement.refresh_from_db()
            response_serializer = self.get_serializer(movement)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Error al actualizar movimiento: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    # Acción personalizada para obtener los detalles de un movimiento
    from rest_framework.decorators import action
    from rest_framework.response import Response
    @action(detail=True, methods=['get'], url_path='details')
    def details(self, request, pk=None):
        from .models import InventoryMovementDetail
        from .serializers import InventoryMovementDetailSerializer
        details = InventoryMovementDetail.objects.filter(movement_id=pk)
        serializer = InventoryMovementDetailSerializer(details, many=True)
        return Response(serializer.data)

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


class MenuOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        business_id = request.query_params.get('business_id') or user.business_id
        if user.role and business_id:
            options = MenuOption.objects.filter(
                roles=user.role, business_id=business_id
            ).values_list('name', flat=True)
        else:
            options = []
        return Response({'menu_options': list(options)})

# ViewSet para detalles de movimientos de inventario
from rest_framework import viewsets
from .models import InventoryMovementDetail
from .serializers import InventoryMovementDetailSerializer

class InventoryMovementDetailViewSet(viewsets.ModelViewSet):
    queryset = InventoryMovementDetail.objects.all()
    serializer_class = InventoryMovementDetailSerializer
    permission_classes = [IsAuthenticated]


# --- Vista para obtener el inventario actual ---
class CurrentInventoryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Obtiene el inventario actual de todos los productos en todos los almacenes
        """
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
                    'id': stock.id,
                    'product_variant': {
                        'id': stock.product_variant.id,
                        'name': stock.product_variant.name,
                        'sku': stock.product_variant.sku,
                        'price': float(stock.product_variant.price),
                        'min_stock': float(stock.product_variant.min_stock),
                        'product_name': stock.product_variant.product.name,
                    },
                    'warehouse': {
                        'id': stock.warehouse.id,
                        'name': stock.warehouse.name,
                        'location': stock.warehouse.location,
                    },
                    'quantity': float(stock.quantity),
                    'min_stock': float(stock.min_stock),
                    'location': stock.location,
                    'last_updated': stock.updated_at,
                    'created_at': stock.created_at,
                })
            
            return Response(inventory_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error al obtener inventario: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# --- Endpoints para Roles y Opciones de Menú ---
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from .models import Role, MenuOption, User
from .serializers import RoleSerializer, MenuOptionSerializer, UserMenuOptionsSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_menu_options(request):
    """Obtiene las opciones de menú del usuario autenticado"""
    try:
        user = request.user
        serializer = UserMenuOptionsSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': f'Error al obtener opciones de menú: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class RoleViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar roles (solo administradores)"""
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsStaffOrReadOnly]

class MenuOptionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para obtener opciones de menú (solo lectura)"""
    queryset = MenuOption.objects.all()
    serializer_class = MenuOptionSerializer
    permission_classes = [IsAuthenticated]
