from django.test import TestCase
from core.models import Business, Role, MenuOption

class RoleMenuOptionTests(TestCase):
    def setUp(self):
        self.business = Business.objects.create(name='Empresa Test', code='EMP002')
        self.role = Role.objects.create(name='Admin', business=self.business)
        self.menu_option = MenuOption.objects.create(name='import-products', label='Importar Productos', business=self.business)
        self.menu_option.roles.add(self.role)

    def test_role_menu_option_relation(self):
        self.assertIn(self.role, self.menu_option.roles.all())
        self.assertEqual(self.menu_option.business, self.business)
        self.assertEqual(self.role.business, self.business)
