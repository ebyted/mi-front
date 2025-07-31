from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from core.models import Business, Category, Brand, Unit, Product, ProductVariant, Warehouse, Supplier, Customer, Role, MenuOption

class EndpointTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_superuser(
            email='admin@test.com', password='admin123', first_name='Admin', last_name='User'
        )
        self.client.force_authenticate(user=self.user)
        self.business = Business.objects.create(name='Empresa', code='EMP001')
        self.category = Category.objects.create(name='Categoria', business=self.business)
        self.brand = Brand.objects.create(name='Marca', business=self.business)
        self.unit = Unit.objects.create(name='Unidad', symbol='U', unit_type='tipo')
        self.role = Role.objects.create(name='Admin', business=self.business)
        self.menu_option = MenuOption.objects.create(name='import-products', label='Importar Productos', business=self.business)
        self.menu_option.roles.add(self.role)

    def test_business_crud(self):
        url = reverse('business-list')
        data = {'name': 'Empresa2', 'code': 'EMP002'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_category_crud(self):
        url = reverse('category-list')
        data = {'name': 'Categoria2', 'business': self.business.id, 'code': 'CAT002'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_brand_crud(self):
        url = reverse('brand-list')
        data = {'name': 'Marca2', 'business': self.business.id, 'code': 'BR002'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unit_crud(self):
        url = reverse('unit-list')
        data = {'name': 'Unidad2', 'symbol': 'U2', 'unit_type': 'tipo2'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_product_crud(self):
        url = reverse('product-list')
        data = {
            'business': self.business.id,
            'category': self.category.id,
            'brand': self.brand.id,
            'name': 'Producto2',
            'sku': 'SKU002',
            'base_unit': self.unit.id
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_role_crud(self):
        url = reverse('role-list')
        data = {'name': 'User', 'business': self.business.id}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_menu_option_crud(self):
        url = reverse('menuoption-list')
        data = {'name': 'dashboard', 'label': 'Dashboard', 'business': self.business.id, 'roles': [self.role.id]}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_supplier_crud(self):
        url = reverse('supplier-list')
        data = {'name': 'Proveedor1', 'business': self.business.id}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_customer_crud(self):
        from core.models import CustomerType
        url = reverse('customer-list')
        customer_type = CustomerType.objects.create(level=1, discount_percentage=10)
        data = {
            'name': 'Cliente1',
            'business': self.business.id,
            'code': 'CUST001',
            'email': 'cliente1@test.com',
            'phone': '1234567890',
            'address': 'Calle 1',
            'is_active': True,
            'customer_type': customer_type.id
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
