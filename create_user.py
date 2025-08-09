from core.models import User
from django.contrib.auth.hashers import make_password

# Crear o actualizar el usuario ebyted@hotmail.com
user, created = User.objects.get_or_create(
    email="ebyted@hotmail.com",
    defaults={
        "first_name": "Eduardo",
        "last_name": "Byted", 
        "is_staff": True,
        "is_superuser": True,
        "is_active": True,
        "password": make_password("123456")
    }
)

# Asegurar que la password esté correcta
user.password = make_password("123456")
user.save()

print(f"Usuario: {user.email}")
print(f"Creado: {created}")
print("Password actualizado a: 123456")
