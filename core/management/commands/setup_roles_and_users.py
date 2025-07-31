from django.core.management.base import BaseCommand
from core.models import Business, Role, MenuOption, User


class Command(BaseCommand):
    help = 'Poblar roles, opciones de menú y usuarios iniciales'

    def handle(self, *args, **options):
        # Obtener el primer business o crear uno si no existe
        business, created = Business.objects.get_or_create(
            code='EMP001',
            defaults={
                'name': 'Empresa Principal',
                'description': 'Empresa principal del sistema'
            }
        )
        
        if created:
            self.stdout.write(f'✅ Business creado: {business.name}')
        else:
            self.stdout.write(f'✅ Business encontrado: {business.name}')

        # Crear opciones de menú
        menu_options = [
            {'name': 'dashboard', 'label': 'Dashboard'},
            {'name': 'users', 'label': 'Usuarios'},
            {'name': 'products', 'label': 'Productos'},
            {'name': 'warehouses', 'label': 'Almacenes'},
            {'name': 'purchase-orders', 'label': 'Ordenes de compra'},
            {'name': 'quotations', 'label': 'Cotizaciones'},
            {'name': 'sales', 'label': 'Ventas'},
            {'name': 'movements', 'label': 'Movimientos'},
            {'name': 'categories', 'label': 'Categorías'},
            {'name': 'brands', 'label': 'Marcas'},
            {'name': 'exchange-rates', 'label': 'Tasas de Cambio'},
            {'name': 'store', 'label': 'Tienda'},
        ]

        created_menus = []
        for menu_data in menu_options:
            menu, created = MenuOption.objects.get_or_create(
                name=menu_data['name'],
                business=business,
                defaults={'label': menu_data['label']}
            )
            created_menus.append(menu)
            if created:
                self.stdout.write(f'✅ Opción de menú creada: {menu.label}')

        # Crear roles
        roles_data = [
            {
                'name': 'Administrador',
                'menus': created_menus  # Todas las opciones
            },
            {
                'name': 'Capturista',
                'menus': [m for m in created_menus if m.name in [
                    'dashboard', 'products', 'movements', 'exchange-rates', 
                    'quotations', 'sales', 'purchase-orders'
                ]]
            },
            {
                'name': 'Almacenista',
                'menus': [m for m in created_menus if m.name in [
                    'dashboard', 'products', 'movements', 'purchase-orders'
                ]]
            }
        ]

        created_roles = {}
        for role_data in roles_data:
            role, created = Role.objects.get_or_create(
                name=role_data['name'],
                business=business
            )
            
            # Asignar opciones de menú al rol
            role.menu_options.set(role_data['menus'])
            created_roles[role_data['name']] = role
            
            if created:
                self.stdout.write(f'✅ Rol creado: {role.name} con {len(role_data["menus"])} opciones de menú')
            else:
                self.stdout.write(f'✅ Rol actualizado: {role.name} con {len(role_data["menus"])} opciones de menú')

        # Crear usuarios
        users_data = [
            {
                'email': 'israel.garces@empresa.com',
                'first_name': 'Israel',
                'last_name': 'Garces',
                'role': 'Administrador',
                'password': 'admin123'
            },
            {
                'email': 'nayeli@empresa.com',
                'first_name': 'Nayeli',
                'last_name': 'Capturista',
                'role': 'Capturista',
                'password': 'captu123'
            },
            {
                'email': 'almacenista.tijuana@empresa.com',
                'first_name': 'Almacenista',
                'last_name': 'Tijuana',
                'role': 'Almacenista',
                'password': 'alma123'
            }
        ]

        # Asignar rol de administrador a usuarios existentes
        existing_users = User.objects.filter(role__isnull=True)
        admin_role = created_roles['Administrador']
        
        for user in existing_users:
            user.role = admin_role
            user.business = business
            user.save()
            self.stdout.write(f'✅ Usuario existente actualizado como admin: {user.email}')

        # Crear nuevos usuarios
        for user_data in users_data:
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults={
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'role': created_roles[user_data['role']],
                    'business': business,
                    'is_staff': user_data['role'] == 'Administrador',
                    'is_superuser': user_data['role'] == 'Administrador'
                }
            )
            
            if created:
                user.set_password(user_data['password'])
                user.save()
                self.stdout.write(f'✅ Usuario creado: {user.email} - Rol: {user.role.name}')
            else:
                # Actualizar rol si el usuario ya existe
                user.role = created_roles[user_data['role']]
                user.business = business
                user.save()
                self.stdout.write(f'✅ Usuario actualizado: {user.email} - Rol: {user.role.name}')

        self.stdout.write(
            self.style.SUCCESS(
                f'\n🎉 Setup completado!\n'
                f'- Business: {business.name}\n'
                f'- Opciones de menú: {len(created_menus)}\n'
                f'- Roles: {len(created_roles)}\n'
                f'- Usuarios totales: {User.objects.count()}\n'
            )
        )
