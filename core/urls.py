from django.urls import path, include
from django.http import JsonResponse
from .views_welcome import welcome
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework import routers
from .views import (
    UserViewSet, SimpleBusinessViewSet, SimpleCategoryViewSet, SimpleBrandViewSet, UnitViewSet, SimpleProductViewSet, ProductVariantViewSet,
    SimpleWarehouseViewSet, SimpleProductWarehouseStockViewSet, SupplierViewSet, SupplierProductViewSet, PurchaseOrderViewSet,
    PurchaseOrderItemViewSet, PurchaseOrderReceiptViewSet, PurchaseOrderReceiptItemViewSet, SimpleInventoryMovementViewSet,
    ExchangeRateViewSet, CustomerTypeViewSet, CustomerViewSet, SalesOrderViewSet, SalesOrderItemViewSet,
    QuotationViewSet, QuotationItemViewSet, RoleViewSet, MenuOptionViewSet,
    ProductImportView, BrandImportView, CategoryImportView, SalesOrderImportView,
    PurchaseOrderImportView, QuotationImportView, InventoryMovementImportView, AuthorizeInventoryMovementView,
    AuditLogViewSet, CurrentInventoryView, user_menu_options,
    InventoryMovementImportValidateView, InventoryMovementImportConfirmView, 
    InventoryMovementListView, WarehouseListView, CancelMovementView,
    InventoryMovementDetailViewSet
)


router = routers.DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'businesses', SimpleBusinessViewSet)
router.register(r'categories', SimpleCategoryViewSet)
router.register(r'brands', SimpleBrandViewSet)
router.register(r'units', UnitViewSet)
router.register(r'products', SimpleProductViewSet)
router.register(r'product-variants', ProductVariantViewSet)
router.register(r'warehouses', SimpleWarehouseViewSet)
router.register(r'product-warehouse-stocks', SimpleProductWarehouseStockViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'supplier-products', SupplierProductViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet)
router.register(r'purchase-order-items', PurchaseOrderItemViewSet)
router.register(r'purchase-order-receipts', PurchaseOrderReceiptViewSet)
router.register(r'purchase-order-receipt-items', PurchaseOrderReceiptItemViewSet)
router.register(r'inventory-movements', SimpleInventoryMovementViewSet)
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
router.register(r'inventory-movement-details', InventoryMovementDetailViewSet)

urlpatterns = [
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('test-token/', lambda request: JsonResponse({'message': 'Token endpoint test working'}), name='test_token'),
    path('import-products/', ProductImportView.as_view(), name='import-products'),
    path('import-brands/', BrandImportView.as_view(), name='import-brands'),
    path('import-categories/', CategoryImportView.as_view(), name='import-categories'),
    path('import-sales-orders/', SalesOrderImportView.as_view(), name='import-sales-orders'),
    path('import-purchase-orders/', PurchaseOrderImportView.as_view(), name='import-purchase-orders'),
    path('import-quotations/', QuotationImportView.as_view(), name='import-quotations'),
    path('import-inventory-movements/', InventoryMovementImportView.as_view(), name='import-inventory-movements'),
    path('movements/import/validate/', InventoryMovementImportValidateView.as_view(), name='movements-import-validate'),
    path('movements/import/confirm/', InventoryMovementImportConfirmView.as_view(), name='movements-import-confirm'),
    path('movements/list/', InventoryMovementListView.as_view(), name='movements-list'),
    path('warehouses/list/', WarehouseListView.as_view(), name='warehouses-list'),
    path('authorize-inventory-movement/', AuthorizeInventoryMovementView.as_view(), name='authorize-inventory-movement'),
    path('cancel-movement/<int:movement_id>/', CancelMovementView.as_view(), name='cancel-movement'),
    path('current-inventory/', CurrentInventoryView.as_view(), name='current-inventory'),
    path('user-menu-options/', user_menu_options, name='user-menu-options'),
    path('', include(router.urls)),
    path('', welcome, name='welcome'),
]
