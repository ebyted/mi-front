from core.models import User

# Verificar usuario
try:
    user = User.objects.get(email='ebyted@hotmail.com')
    print(f"Usuario: {user.email}")
    print(f"Activo: {user.is_active}")
    print(f"Superuser: {user.is_superuser}")
    print(f"Password hash: {user.password[:50]}...")
    
    # Probar contraseñas
    passwords = ['Arkano-IA2025+', 'admin123', 'Admin123']
    for pwd in passwords:
        if user.check_password(pwd):
            print(f"✅ Contraseña correcta: {pwd}")
            break
    else:
        print("❌ Ninguna contraseña funcionó")
        
except User.DoesNotExist:
    print("❌ Usuario no encontrado")
    print("Usuarios disponibles:")
    for u in User.objects.all():
        print(f"  - {u.email}")
