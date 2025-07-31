from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from core.models import Product, Category, Brand
import io

class ProductImportTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_superuser(
            email='admin@test.com', password='admin123', first_name='Admin', last_name='User'
        )
        self.client.force_authenticate(user=self.user)
        from core.models import Business
        self.business = Business.objects.create(name='Empresa Test', code='EMPTEST')
        self.user.business = self.business
        self.user.save()

    def test_import_products_success(self):
        data = "sku,name,category,brand\nSKU001,Producto 1,Categoria 1,Marca 1\nSKU002,Producto 2,Categoria 2,Marca 2"
        file = io.BytesIO(data.encode('utf-8'))
        file.name = 'productos.txt'
        response = self.client.post(reverse('import-products'), {'file': file, 'business': self.business.id}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 2)
        self.assertEqual(Category.objects.count(), 2)
        self.assertEqual(Brand.objects.count(), 2)

    def test_import_products_duplicate(self):
        Category.objects.create(name='Categoria 1', business=self.business, code='CAT001')
        Brand.objects.create(name='Marca 1', business=self.business, code='BR001')
        Product.objects.create(sku='SKU001', name='Producto 1', category=Category.objects.first(), brand=Brand.objects.first(), business=self.business)
        data = "sku,name,category,brand\nSKU001,Producto 1,Categoria 1,Marca 1"
        file = io.BytesIO(data.encode('utf-8'))
        file.name = 'productos.txt'
        response = self.client.post(reverse('import-products'), {'file': file, 'business': self.business.id}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['duplicates']), 1)

    def test_import_products_missing_fields(self):
        data = "sku,name,category,brand\nSKU003,,Categoria 3,Marca 3"
        file = io.BytesIO(data.encode('utf-8'))
        file.name = 'productos.txt'
        response = self.client.post(reverse('import-products'), {'file': file, 'business': self.business.id}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['errors']), 1)
