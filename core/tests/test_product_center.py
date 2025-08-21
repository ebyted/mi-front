import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from core.models import Product, ProductVariant, Supplier, PurchaseOrder, SalesOrder, Quotation, AuditLog, Business, Category, Brand, Unit, User

@pytest.mark.django_db
def test_pc_product_search_view():
    client = APIClient()
    business = Business.objects.create(name='TestBiz', code='BIZ123')
    category = Category.objects.create(name='Cat1', code='CAT1', business=business)
    brand = Brand.objects.create(name='Brand1', code='BR1', business=business)
    unit = Unit.objects.create(name='Unidad', symbol='U', unit_type='pieza', conversion_factor=1)
    user = User.objects.create_user(email='testuser@example.com', password='testpass', first_name='Test', last_name='User', business=business)
    p = Product.objects.create(
        name='TestProd', sku='TST123', business=business,
        category=category, brand=brand, base_unit=unit
    )
    url = reverse('pc_product_search') + '?q=TestProd'
    client.force_authenticate(user=user)
    resp = client.get(url)
    assert resp.status_code == 200
    assert any(prod['name'] == 'TestProd' for prod in resp.json())

@pytest.mark.django_db
def test_pc_product_detail_view():
    client = APIClient()
    business = Business.objects.create(name='TestBiz', code='BIZ123')
    category = Category.objects.create(name='Cat1', code='CAT1', business=business)
    brand = Brand.objects.create(name='Brand1', code='BR1', business=business)
    unit = Unit.objects.create(name='Unidad', symbol='U', unit_type='pieza', conversion_factor=1)
    user = User.objects.create_user(email='testuser@example.com', password='testpass', first_name='Test', last_name='User', business=business)
    p = Product.objects.create(
        name='TestProd', sku='TST123', business=business,
        category=category, brand=brand, base_unit=unit
    )
    url = reverse('pc_product_detail', args=[p.id])
    client.force_authenticate(user=user)
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.json()['name'] == 'TestProd'

@pytest.mark.django_db
def test_pc_product_variants_view():
    client = APIClient()
    business = Business.objects.create(name='TestBiz', code='BIZ123')
    category = Category.objects.create(name='Cat1', code='CAT1', business=business)
    brand = Brand.objects.create(name='Brand1', code='BR1', business=business)
    unit = Unit.objects.create(name='Unidad', symbol='U', unit_type='pieza', conversion_factor=1)
    user = User.objects.create_user(email='testuser@example.com', password='testpass', first_name='Test', last_name='User', business=business)
    p = Product.objects.create(
        name='TestProd', sku='TST123', business=business,
        category=category, brand=brand, base_unit=unit
    )
    v = ProductVariant.objects.create(product=p, sku='VAR1', name='Variante1', cost_price=1, sale_price=2, purchase_price=1, unit=unit)
    url = reverse('pc_product_variants', args=[p.id])
    client.force_authenticate(user=user)
    resp = client.get(url)
    assert resp.status_code == 200
    assert any(var['sku'] == 'VAR1' for var in resp.json())

@pytest.mark.django_db
def test_pc_product_kardex_view():
    client = APIClient()
    business = Business.objects.create(name='TestBiz', code='BIZ123')
    category = Category.objects.create(name='Cat1', code='CAT1', business=business)
    brand = Brand.objects.create(name='Brand1', code='BR1', business=business)
    unit = Unit.objects.create(name='Unidad', symbol='U', unit_type='pieza', conversion_factor=1)
    user = User.objects.create_user(email='testuser@example.com', password='testpass', first_name='Test', last_name='User', business=business)
    p = Product.objects.create(name='TestProd', sku='TST123', business=business, category=category, brand=brand, base_unit=unit)
    url = reverse('pc_product_kardex', args=[p.id])
    client.force_authenticate(user=user)
    resp = client.get(url)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

@pytest.mark.django_db
def test_pc_product_stock_view():
    client = APIClient()
    business = Business.objects.create(name='TestBiz', code='BIZ123')
    category = Category.objects.create(name='Cat1', code='CAT1', business=business)
    brand = Brand.objects.create(name='Brand1', code='BR1', business=business)
    unit = Unit.objects.create(name='Unidad', symbol='U', unit_type='pieza', conversion_factor=1)
    user = User.objects.create_user(email='testuser@example.com', password='testpass', first_name='Test', last_name='User', business=business)
    p = Product.objects.create(name='TestProd', sku='TST123', business=business, category=category, brand=brand, base_unit=unit)
    url = reverse('pc_product_stock', args=[p.id])
    client.force_authenticate(user=user)
    resp = client.get(url)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

@pytest.mark.django_db
def test_pc_product_suppliers_view():
    client = APIClient()
    business = Business.objects.create(name='TestBiz', code='BIZ123')
    category = Category.objects.create(name='Cat1', code='CAT1', business=business)
    brand = Brand.objects.create(name='Brand1', code='BR1', business=business)
    unit = Unit.objects.create(name='Unidad', symbol='U', unit_type='pieza', conversion_factor=1)
    user = User.objects.create_user(email='testuser@example.com', password='testpass', first_name='Test', last_name='User', business=business)
    p = Product.objects.create(name='TestProd', sku='TST123', business=business, category=category, brand=brand, base_unit=unit)
    url = reverse('pc_product_suppliers', args=[p.id])
    client.force_authenticate(user=user)
    resp = client.get(url)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

@pytest.mark.django_db
def test_pc_product_orders_view():
    client = APIClient()
    business = Business.objects.create(name='TestBiz', code='BIZ123')
    category = Category.objects.create(name='Cat1', code='CAT1', business=business)
    brand = Brand.objects.create(name='Brand1', code='BR1', business=business)
    unit = Unit.objects.create(name='Unidad', symbol='U', unit_type='pieza', conversion_factor=1)
    user = User.objects.create_user(email='testuser@example.com', password='testpass', first_name='Test', last_name='User', business=business)
    p = Product.objects.create(name='TestProd', sku='TST123', business=business, category=category, brand=brand, base_unit=unit)
    url = reverse('pc_product_orders', args=[p.id])
    client.force_authenticate(user=user)
    resp = client.get(url)
    assert resp.status_code == 200
    assert 'purchase_orders' in resp.json()

@pytest.mark.django_db
def test_pc_product_auditlog_view():
    client = APIClient()
    business = Business.objects.create(name='TestBiz', code='BIZ123')
    category = Category.objects.create(name='Cat1', code='CAT1', business=business)
    brand = Brand.objects.create(name='Brand1', code='BR1', business=business)
    unit = Unit.objects.create(name='Unidad', symbol='U', unit_type='pieza', conversion_factor=1)
    user = User.objects.create_user(email='testuser@example.com', password='testpass', first_name='Test', last_name='User', business=business)
    p = Product.objects.create(name='TestProd', sku='TST123', business=business, category=category, brand=brand, base_unit=unit)
    url = reverse('pc_product_auditlog', args=[p.id])
    client.force_authenticate(user=user)
    resp = client.get(url)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
