from django.urls import path, include
from django.http import JsonResponse
from .views_welcome import welcome
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework import routers
from .views import CustomTokenObtainPairView
from .views import (
    PCProductSearchView,
    PCProductDetailView,
    PCProductVariantsView,
    PCProductKardexView,
    PCProductStockView,
    PCProductSuppliersView,
    PCProductOrdersView,
    PCProductAuditLogView,
)

from .views import (
    ProductKardexView,
    UserViewSet, BusinessViewSet, CategoryViewSet, BrandViewSet, UnitViewSet, ProductViewSet, ProductVariantViewSet,
    WarehouseViewSet, ProductWarehouseStockViewSet, SupplierViewSet, SupplierProductViewSet, PurchaseOrderViewSet,
    PurchaseOrderItemViewSet, PurchaseOrderReceiptViewSet, PurchaseOrderReceiptItemViewSet,
    ExchangeRateViewSet, CustomerTypeViewSet, CustomerViewSet, SalesOrderViewSet, SalesOrderItemViewSet,
    QuotationViewSet, QuotationItemViewSet, RoleViewSet, MenuOptionViewSet,
    ProductImportView, BrandImportView,
    AuditLogViewSet, CurrentInventoryView, user_menu_options,
    WarehouseListView, InventoryMovementViewSet, InventoryMovementDetailViewSet, CustomerPaymentViewSet, SupplierPaymentViewSet,
    UserProfileView
)


router = routers.DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'businesses', BusinessViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'brands', BrandViewSet)
router.register(r'units', UnitViewSet)
router.register(r'products', ProductViewSet)
router.register(r'product-variants', ProductVariantViewSet)
router.register(r'warehouses', WarehouseViewSet)
router.register(r'product-warehouse-stocks', ProductWarehouseStockViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'supplier-products', SupplierProductViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet)
router.register(r'purchase-order-items', PurchaseOrderItemViewSet)
router.register(r'purchase-order-receipts', PurchaseOrderReceiptViewSet)
router.register(r'purchase-order-receipt-items', PurchaseOrderReceiptItemViewSet)
router.register(r'inventory-movements', InventoryMovementViewSet) # NUEVO - IMPLEMENTACIÓN LIMPIA
router.register(r'exchange-rates', ExchangeRateViewSet)
router.register(r'customer-types', CustomerTypeViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'sales-orders', SalesOrderViewSet)
router.register(r'sales-order-items', SalesOrderItemViewSet)
router.register(r'quotations', QuotationViewSet)
router.register(r'quotation-items', QuotationItemViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'audit-logs', AuditLogViewSet)
router.register(r'menu-options', MenuOptionViewSet)

# NUEVO - IMPLEMENTACIÓN LIMPIA
router.register(r'inventory-movement-details', InventoryMovementDetailViewSet)

# Registrar los nuevos ViewSets
from .new_views import (
    CustomerProductDiscountViewSet, 
    PurchaseOrderPaymentViewSet,
    SaleViewSet,
    SalePaymentViewSet
)
router.register(r'customer-product-discounts', CustomerProductDiscountViewSet)
router.register(r'purchase-order-payments', PurchaseOrderPaymentViewSet)
router.register(r'sales', SaleViewSet)
router.register(r'sale-payments', SalePaymentViewSet)
router.register(r'customer-payments', CustomerPaymentViewSet)
router.register(r'supplier-payments', SupplierPaymentViewSet)

urlpatterns = [
    # Endpoints nuevos para Product Center
    path('pc/products/search/', PCProductSearchView.as_view(), name='pc_product_search'),
    path('pc/products/<int:pk>/', PCProductDetailView.as_view(), name='pc_product_detail'),
    path('pc/products/<int:pk>/variants/', PCProductVariantsView.as_view(), name='pc_product_variants'),
    path('pc/products/<int:pk>/kardex/', PCProductKardexView.as_view(), name='pc_product_kardex'),
    path('pc/products/<int:pk>/stock/', PCProductStockView.as_view(), name='pc_product_stock'),
    path('pc/products/<int:pk>/suppliers/', PCProductSuppliersView.as_view(), name='pc_product_suppliers'),
    path('pc/products/<int:pk>/orders/', PCProductOrdersView.as_view(), name='pc_product_orders'),
    path('pc/products/<int:pk>/auditlog/', PCProductAuditLogView.as_view(), name='pc_product_auditlog'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('test-token/', lambda request: JsonResponse({'message': 'Token endpoint test working'}), name='test_token'),
    path('import-products/', ProductImportView.as_view(), name='import-products'),
    path('import-brands/', BrandImportView.as_view(), name='import-brands'),
    # path('import-categories/', CategoryImportView.as_view(), name='import-categories'),
    # path('import-sales-orders/', SalesOrderImportView.as_view(), name='import-sales-orders'),
    # path('import-purchase-orders/', PurchaseOrderImportView.as_view(), name='import-purchase-orders'),
    # path('import-quotations/', QuotationImportView.as_view(), name='import-quotations'),
    # URLS ELIMINADAS - RECREAR DESDE CERO
    # path('import-inventory-movements/', InventoryMovementImportView.as_view(), name='import-inventory-movements'),
    # path('movements/import/validate/', InventoryMovementImportValidateView.as_view(), name='movements-import-validate'),
    # path('movements/import/confirm/', InventoryMovementImportConfirmView.as_view(), name='movements-import-confirm'),
    # path('movements/list/', InventoryMovementListView.as_view(), name='movements-list'),
    path('warehouses/list/', WarehouseListView.as_view(), name='warehouses-list'),
    # path('authorize-inventory-movement/', AuthorizeInventoryMovementView.as_view(), name='authorize-inventory-movement'),
    # path('cancel-movement/<int:movement_id>/', CancelMovementView.as_view(), name='cancel-movement'),
    path('current-inventory/', CurrentInventoryView.as_view(), name='current-inventory'),
    path('user-menu-options/', user_menu_options, name='user-menu-options'),
    path('products/<int:pk>/kardex/', ProductKardexView.as_view(), name='product-kardex'),
    # Endpoint de perfil de usuario
    path('user/profile/', UserProfileView.as_view(), name='user-profile'),
    path('', include(router.urls)),
]



