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
    
    def create(self, request, *args, **kwargs):
        """
        Crear un nuevo usuario
        """
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
    
    def update(self, request, *args, **kwargs):
        """
        Actualizar usuario existente
        """
        user = self.get_object()
        data = request.data.copy()
        
        # Actualizar campos permitidos
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'email' in data:
            # Verificar que el email no exista en otro usuario
            if User.objects.filter(email=data['email']).exclude(id=user.id).exists():
                return Response(
                    {'error': 'Ya existe otro usuario con este email.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.email = data['email']
        if 'is_active' in data:
            user.is_active = data['is_active']
        if 'is_staff' in data:
            user.is_staff = data['is_staff']
        
        try:
            user.save()
            serializer = self.get_serializer(user)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': f'Error al actualizar usuario: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
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
    
    @action(detail=True, methods=['get'])
    def discounts(self, request, pk=None):
        """Obtener descuentos del producto"""
        from .models import CustomerProductDiscount
        from .new_serializers import CustomerProductDiscountSerializer
        
        product = self.get_object()
        discounts = CustomerProductDiscount.objects.filter(
            product=product, 
            is_active=True
        ).select_related('customer')
        
        serializer = CustomerProductDiscountSerializer(discounts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def with_corrugado(self, request):
        """Productos que tienen cantidad de corrugado"""
        products = self.get_queryset().filter(cantidad_corrugado__gt=0)
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def ofertas(self, request):
        """Productos en oferta o remate"""
        products = self.get_queryset().filter(status__in=['OFERTA', 'REMATE'])
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

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
    # Temporarily disable serializer to avoid corruption issues
    # serializer_class = InventoryMovementSerializer
    
    def get_serializer_class(self):
        # Return a basic serializer to avoid import issues
        from rest_framework import serializers
        from core.models import InventoryMovement
        
        class BasicInventoryMovementSerializer(serializers.ModelSerializer):
            class Meta:
                model = InventoryMovement
                fields = '__all__'
        
        return BasicInventoryMovementSerializer

    def list(self, request, *args, **kwargs):
        """Custom list method to avoid serializer issues"""
        from rest_framework.response import Response
        from django.db import models
        
        queryset = self.get_queryset()
        movements_data = []
        
        for movement in queryset:
            # Build the response data manually
            movement_data = {
                'id': movement.id,
                'movement_type': movement.movement_type,
                'reference_document': movement.reference_document or '',
                'notes': movement.notes or '',
                'created_at': movement.created_at.isoformat() if movement.created_at else None,
                'updated_at': movement.updated_at.isoformat() if movement.updated_at else None,
                'authorized': movement.authorized,
                'authorized_at': movement.authorized_at.isoformat() if movement.authorized_at else None,
                
                # Warehouse info
                'warehouse': {
                    'id': movement.warehouse.id,
                    'name': movement.warehouse.name,
                } if movement.warehouse else None,
                
                # User info
                'user': {
                    'id': movement.user.id,
                    'email': movement.user.email,
                } if movement.user else None,
                
                # Authorized by user info
                'authorized_by': {
                    'id': movement.authorized_by.id,
                    'email': movement.authorized_by.email,
                } if movement.authorized_by else None,
                
                # Details
                'details': [],
                'total_quantity': 0,
            }
            
            # Add details
            total_quantity = 0
            for detail in movement.details.all():
                detail_data = {
                    'id': detail.id,
                    'quantity': float(detail.quantity) if detail.quantity else 0,
                    'price': str(detail.price) if detail.price else '0.00',
                    'total': str(detail.total) if detail.total else '0.00',
                    'lote': detail.lote or '',
                    'expiration_date': detail.expiration_date.isoformat() if detail.expiration_date else None,
                }
                
                # Add product variant info
                if detail.product_variant:
                    pv = detail.product_variant
                    detail_data['product_variant'] = {
                        'id': pv.id,
                        'name': pv.name,
                        'sku': getattr(pv, 'sku', ''),
                        'barcode': getattr(pv, 'barcode', ''),
                    }
                
                movement_data['details'].append(detail_data)
                total_quantity += float(detail.quantity) if detail.quantity else 0
            
            movement_data['total_quantity'] = total_quantity
            movements_data.append(movement_data)
        
        return Response(movements_data)

    def create(self, request, *args, **kwargs):
        from rest_framework import status
        from django.db import transaction
        from core.serializers import InventoryMovementSerializer
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
        
        # Crear un nuevo serializer para la respuesta
        response_serializer = InventoryMovementSerializer(movement)
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
                        'price': float(stock.product_variant.sale_price),  # CORREGIDO: sale_price
                        'min_stock': float(stock.product_variant.low_stock_threshold),  # CORREGIDO: low_stock_threshold
                        'product_name': stock.product_variant.product.name,
                    },
                    'warehouse': {
                        'id': stock.warehouse.id,
                        'name': stock.warehouse.name,
                        'location': stock.warehouse.address,  # CORREGIDO: usar address en lugar de location
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


# --- Importador de Movimientos de Inventario ---
import csv
from io import StringIO
from decimal import Decimal, InvalidOperation
from django.db import transaction
from rest_framework.parsers import MultiPartParser, FormParser

class InventoryMovementImportValidateView(APIView):
    """Validar archivo CSV para importación de movimientos"""
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No se proporcionó archivo.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validar formato CSV
        try:
            content = file.read().decode('utf-8')
            csv_data = StringIO(content)
            reader = csv.DictReader(csv_data)
            
            # Verificar columnas requeridas
            required_columns = ['nombre', 'cantidad', 'precio']
            if not all(col in reader.fieldnames for col in required_columns):
                return Response({
                    'error': f'El archivo debe contener las columnas: {", ".join(required_columns)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({'error': f'Error leyendo archivo: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Procesar y validar datos
        csv_data.seek(0)
        reader = csv.DictReader(csv_data)
        
        productos_encontrados = []
        productos_no_encontrados = []
        total_calculado = Decimal('0.00')
        
        for fila_num, row in enumerate(reader, 1):
            nombre = row.get('nombre', '').strip()
            cantidad_str = row.get('cantidad', '').strip()
            precio_str = row.get('precio', '').strip()
            
            if not nombre:
                productos_no_encontrados.append({
                    'fila': fila_num,
                    'nombre': nombre,
                    'error': 'Nombre vacío'
                })
                continue
            
            # Validar cantidad
            try:
                cantidad = int(cantidad_str)
                if cantidad <= 0:
                    raise ValueError("Cantidad debe ser mayor a 0")
            except ValueError:
                productos_no_encontrados.append({
                    'fila': fila_num,
                    'nombre': nombre,
                    'error': f'Cantidad inválida: {cantidad_str}'
                })
                continue
            
            # Validar precio
            try:
                precio_limpio = precio_str.replace('$', '').replace(' ', '').replace(',', '.')
                precio = Decimal(precio_limpio)
                if precio < 0:
                    raise ValueError("Precio no puede ser negativo")
            except (InvalidOperation, ValueError):
                productos_no_encontrados.append({
                    'fila': fila_num,
                    'nombre': nombre,
                    'error': f'Precio inválido: {precio_str}'
                })
                continue
            
            # Buscar producto en la base de datos
            producto = self._buscar_producto(nombre)
            
            if producto:
                # Obtener variante principal
                variante = ProductVariant.objects.filter(product=producto).first()
                if variante:
                    subtotal = Decimal(str(cantidad)) * precio
                    total_calculado += subtotal
                    
                    productos_encontrados.append({
                        'fila': fila_num,
                        'nombre': nombre,
                        'producto_encontrado': producto.name,
                        'sku': producto.sku,
                        'cantidad': cantidad,
                        'precio': float(precio),
                        'subtotal': float(subtotal),
                        'variante_id': variante.id
                    })
                else:
                    productos_no_encontrados.append({
                        'fila': fila_num,
                        'nombre': nombre,
                        'error': 'Producto sin variantes'
                    })
            else:
                productos_no_encontrados.append({
                    'fila': fila_num,
                    'nombre': nombre,
                    'error': 'Producto no encontrado en la base de datos'
                })
        
        return Response({
            'productos_encontrados': productos_encontrados,
            'productos_no_encontrados': productos_no_encontrados,
            'resumen': {
                'total_filas': fila_num,
                'encontrados': len(productos_encontrados),
                'no_encontrados': len(productos_no_encontrados),
                'total_calculado': float(total_calculado)
            }
        }, status=status.HTTP_200_OK)
    
    def _buscar_producto(self, nombre_csv):
        """Buscar producto en la base de datos por nombre"""
        try:
            # Buscar exacto primero
            producto = Product.objects.filter(name__iexact=nombre_csv).first()
            if producto:
                return producto
            
            # Buscar que contenga el nombre
            producto = Product.objects.filter(name__icontains=nombre_csv).first()
            if producto:
                return producto
            
            # Buscar por palabras clave principales
            palabras = nombre_csv.split()[:3]
            for palabra in palabras:
                if len(palabra) > 3:
                    producto = Product.objects.filter(name__icontains=palabra).first()
                    if producto:
                        return producto
            
            return None
        except Exception:
            return None


class InventoryMovementImportConfirmView(APIView):
    """Confirmar y crear movimiento de inventario desde datos validados"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Datos de la cabecera del movimiento
        warehouse_id = request.data.get('warehouse_id')
        movement_type = request.data.get('movement_type')
        notes = request.data.get('notes', '')
        productos_confirmados = request.data.get('productos_confirmados', [])
        
        # Validaciones
        if not warehouse_id or not movement_type:
            return Response({
                'error': 'warehouse_id y movement_type son requeridos'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not productos_confirmados:
            return Response({
                'error': 'No hay productos para importar'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            warehouse = Warehouse.objects.get(id=warehouse_id)
        except Warehouse.DoesNotExist:
            return Response({'error': 'Almacén no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        # Crear movimiento en transacción
        try:
            with transaction.atomic():
                # Crear movimiento principal
                movimiento = InventoryMovement.objects.create(
                    warehouse=warehouse,
                    user=request.user,
                    movement_type=movement_type,
                    notes=notes
                )
                
                detalles_creados = []
                total_movimiento = Decimal('0.00')
                
                # Crear detalles
                for item in productos_confirmados:
                    try:
                        variante = ProductVariant.objects.get(id=item['variante_id'])
                        cantidad = Decimal(str(item['cantidad']))
                        precio = Decimal(str(item['precio']))
                        subtotal = cantidad * precio
                        
                        detalle = InventoryMovementDetail.objects.create(
                            movement=movimiento,
                            product_variant=variante,
                            quantity=float(cantidad),
                            price=precio,
                            total=subtotal
                        )
                        
                        detalles_creados.append({
                            'id': detalle.id,
                            'producto': variante.product.name,
                            'cantidad': float(cantidad),
                            'precio': float(precio),
                            'subtotal': float(subtotal)
                        })
                        
                        total_movimiento += subtotal
                        
                    except ProductVariant.DoesNotExist:
                        raise Exception(f"Variante {item['variante_id']} no encontrada")
                    except Exception as e:
                        raise Exception(f"Error creando detalle: {str(e)}")
                
                return Response({
                    'success': True,
                    'movimiento': {
                        'id': movimiento.id,
                        'warehouse': warehouse.name,
                        'movement_type': movement_type,
                        'notes': notes,
                        'created_at': movimiento.created_at,
                        'total': float(total_movimiento)
                    },
                    'detalles': detalles_creados,
                    'resumen': {
                        'productos_importados': len(detalles_creados),
                        'total_movimiento': float(total_movimiento)
                    }
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({
                'error': f'Error creando movimiento: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InventoryMovementListView(APIView):
    """Listar movimientos de inventario con paginación"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Paginación
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            offset = (page - 1) * page_size
            
            # Filtros opcionales
            warehouse_id = request.query_params.get('warehouse')
            movement_type = request.query_params.get('movement_type')
            
            # Query base
            queryset = InventoryMovement.objects.select_related('warehouse', 'user').order_by('-created_at')
            
            # Aplicar filtros
            if warehouse_id:
                queryset = queryset.filter(warehouse_id=warehouse_id)
            if movement_type:
                queryset = queryset.filter(movement_type__icontains=movement_type)
            
            # Contar total
            total = queryset.count()
            
            # Aplicar paginación
            movimientos = queryset[offset:offset + page_size]
            
            # Serializar datos
            data = []
            for mov in movimientos:
                # Calcular total del movimiento
                total_mov = sum(
                    float(detail.total) for detail in 
                    mov.details.all()
                )
                
                data.append({
                    'id': mov.id,
                    'warehouse': {
                        'id': mov.warehouse.id,
                        'name': mov.warehouse.name
                    },
                    'user': mov.user.email if mov.user else 'N/A',
                    'movement_type': mov.movement_type,
                    'notes': mov.notes,
                    'created_at': mov.created_at,
                    'authorized': mov.authorized,
                    'authorized_by': mov.authorized_by.email if mov.authorized_by else None,
                    'authorized_at': mov.authorized_at,
                    'total': total_mov,
                    'details_count': mov.details.count()
                })
            
            return Response({
                'results': data,
                'pagination': {
                    'total': total,
                    'page': page,
                    'page_size': page_size,
                    'total_pages': (total + page_size - 1) // page_size
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Error obteniendo movimientos: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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


# --- Cancelación de Movimientos con Movimientos Inversos ---
class CancelMovementView(APIView):
    permission_classes = [IsStaffOrReadOnly]
    
    def post(self, request, movement_id):
        """Cancelar un movimiento de inventario creando un movimiento inverso"""
        try:
            reason = request.data.get('reason', '').strip()
            
            if not reason:
                return Response({
                    'error': 'El motivo de cancelación es obligatorio'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Obtener el movimiento
            try:
                movement = InventoryMovement.objects.get(id=movement_id)
            except InventoryMovement.DoesNotExist:
                return Response({
                    'error': 'Movimiento no encontrado'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Verificar si puede ser cancelado
            if not movement.can_be_cancelled():
                return Response({
                    'error': 'Este movimiento no puede ser cancelado'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Cancelar y crear movimiento inverso
            with transaction.atomic():
                reverse_movement = movement.cancel_movement(request.user, reason)
                
                # Autorizar automáticamente el movimiento inverso para actualizar stock
                movement_auth_view = AuthorizeInventoryMovementView()
                auth_request = type('obj', (object,), {
                    'data': {'movement_id': reverse_movement.id},
                    'user': request.user
                })()
                movement_auth_view.post(auth_request)
            
            return Response({
                'status': 'success',
                'message': 'Movimiento cancelado exitosamente',
                'data': {
                    'cancelled_movement_id': movement.id,
                    'reverse_movement_id': reverse_movement.id,
                    'reason': reason,
                    'cancelled_at': movement.cancelled_at.isoformat()
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Error interno: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
