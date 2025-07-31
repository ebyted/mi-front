from django.test import TestCase
from core.models import Product, Category, Brand, Business

class ProductModelTests(TestCase):
    def setUp(self):
        self.business = Business.objects.create(name='Empresa Test', code='EMP001')
        self.category = Category.objects.create(name='Categoria Test', business=self.business)
        self.brand = Brand.objects.create(name='Marca Test', business=self.business)

    def test_create_product(self):
        product = Product.objects.create(
            business=self.business,
            category=self.category,
            brand=self.brand,
            name='Producto Test',
            sku='SKU123',
            image_url='https://example.com/image.jpg'
        )
        self.assertEqual(product.name, 'Producto Test')
        self.assertEqual(product.sku, 'SKU123')
        self.assertEqual(product.image_url, 'https://example.com/image.jpg')
        self.assertEqual(product.category.name, 'Categoria Test')
        self.assertEqual(product.brand.name, 'Marca Test')
