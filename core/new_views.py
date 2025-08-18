from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import CustomerProductDiscount, PurchaseOrderPayment, Sale, SalePayment, Product
from .new_serializers import (
    CustomerProductDiscountSerializer, 
    PurchaseOrderPaymentSerializer,
    SaleSerializer,
    SalePaymentSerializer
)


class CustomerProductDiscountViewSet(viewsets.ModelViewSet):
    queryset = CustomerProductDiscount.objects.all()
    serializer_class = CustomerProductDiscountSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        customer_id = self.request.query_params.get('customer_id')
        product_id = self.request.query_params.get('product_id')
        
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        if product_id:
            queryset = queryset.filter(product_id=product_id)
            
        return queryset.select_related('customer', 'product')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def by_product(self, request):
        """Obtener descuentos por producto específico"""
        product_id = request.query_params.get('product_id')
        if not product_id:
            return Response({'error': 'product_id es requerido'}, status=400)
            
        discounts = self.get_queryset().filter(
            product_id=product_id, 
            is_active=True
        )
        serializer = self.get_serializer(discounts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_customer(self, request):
        """Obtener descuentos por cliente específico"""
        customer_id = request.query_params.get('customer_id')
        if not customer_id:
            return Response({'error': 'customer_id es requerido'}, status=400)
            
        discounts = self.get_queryset().filter(
            customer_id=customer_id, 
            is_active=True
        )
        serializer = self.get_serializer(discounts, many=True)
        return Response(serializer.data)


class PurchaseOrderPaymentViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderPayment.objects.all()
    serializer_class = PurchaseOrderPaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        
    def get_queryset(self):
        queryset = super().get_queryset()
        purchase_order_id = self.request.query_params.get('purchase_order_id')
        
        if purchase_order_id:
            queryset = queryset.filter(purchase_order_id=purchase_order_id)
            
        return queryset.select_related('purchase_order', 'created_by')
        
    @action(detail=False, methods=['get'])
    def by_purchase_order(self, request):
        """Obtener pagos de una orden de compra específica"""
        po_id = request.query_params.get('purchase_order_id')
        if not po_id:
            return Response({'error': 'purchase_order_id es requerido'}, status=400)
            
        payments = self.get_queryset().filter(purchase_order_id=po_id)
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def payment_summary(self, request):
        """Resumen de pagos por orden"""
        po_id = request.query_params.get('purchase_order_id')
        if not po_id:
            return Response({'error': 'purchase_order_id es requerido'}, status=400)
            
        payments = self.get_queryset().filter(purchase_order_id=po_id)
        total_paid = sum(payment.amount for payment in payments)
        
        return Response({
            'purchase_order_id': po_id,
            'total_payments': payments.count(),
            'total_paid_amount': total_paid,
            'payments': self.get_serializer(payments, many=True).data
        })


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        
    def get_queryset(self):
        queryset = super().get_queryset()
        customer_id = self.request.query_params.get('customer_id')
        status_filter = self.request.query_params.get('status')
        
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        return queryset.select_related('customer', 'created_by')
    
    @action(detail=False, methods=['get'])
    def by_customer(self, request):
        """Obtener ventas por cliente"""
        customer_id = request.query_params.get('customer_id')
        if not customer_id:
            return Response({'error': 'customer_id es requerido'}, status=400)
            
        sales = self.get_queryset().filter(customer_id=customer_id)
        serializer = self.get_serializer(sales, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending_payments(self, request):
        """Ventas con pagos pendientes"""
        sales = self.get_queryset().filter(is_paid=False)
        serializer = self.get_serializer(sales, many=True)
        return Response(serializer.data)


class SalePaymentViewSet(viewsets.ModelViewSet):
    queryset = SalePayment.objects.all()
    serializer_class = SalePaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        payment = serializer.save(created_by=self.request.user)
        
        # Actualizar el saldo de la venta
        sale = payment.sale
        sale.paid_amount = sum(p.amount for p in sale.payments.all())
        sale.save()
        
    def get_queryset(self):
        queryset = super().get_queryset()
        sale_id = self.request.query_params.get('sale_id')
        
        if sale_id:
            queryset = queryset.filter(sale_id=sale_id)
            
        return queryset.select_related('sale', 'created_by')
        
    @action(detail=False, methods=['get'])
    def by_sale(self, request):
        """Obtener pagos de una venta específica"""
        sale_id = request.query_params.get('sale_id')
        if not sale_id:
            return Response({'error': 'sale_id es requerido'}, status=400)
            
        payments = self.get_queryset().filter(sale_id=sale_id)
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)


# Agregar funcionalidad al ProductViewSet existente
from rest_framework.decorators import action
from rest_framework.response import Response

class EnhancedProductMixin:
    """Mixin para agregar funcionalidades al ProductViewSet existente"""
    
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
