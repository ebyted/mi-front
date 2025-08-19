from core.models import Customer, CustomerType, Business
from core.serializers import CustomerSerializer

# Verificar datos existentes
print("=== Datos existentes ===")
print(f"Customers: {Customer.objects.count()}")
print(f"CustomerTypes: {CustomerType.objects.count()}")  
print(f"Business: {Business.objects.count()}")

# Mostrar el customer existente
customer = Customer.objects.first()
if customer:
    print(f"Customer existente: {customer.name} - Code: {customer.code} - Email: {customer.email}")

# Datos de prueba que pueden estar causando el error 400
test_data = {
    'name': 'Cliente Nuevo Test',
    'code': 'NUEVO001',
    'email': 'nuevo@test.com',
    'phone': '123-456-7890',
    'address': 'Dirección del cliente nuevo',
    'customer_type': 1,
    'has_credit': False
}

print("\n=== Probando CustomerSerializer ===")
print(f"Datos de prueba: {test_data}")

serializer = CustomerSerializer(data=test_data)
print(f"¿Es válido? {serializer.is_valid()}")

if not serializer.is_valid():
    print("Errores encontrados:")
    for field, errors in serializer.errors.items():
        print(f"  {field}: {errors}")

# Probar con datos que pueden causar conflicto
duplicate_data = {
    'name': 'Cliente Duplicado',
    'code': 'TIJUANA',  # Código que ya existe
    'email': 'duplicado@test.com',
    'customer_type': 1
}

print(f"\n=== Probando con código duplicado ===")
serializer2 = CustomerSerializer(data=duplicate_data)
print(f"¿Es válido? {serializer2.is_valid()}")
if not serializer2.is_valid():
    print("Errores:")
    for field, errors in serializer2.errors.items():
        print(f"  {field}: {errors}")

# Probar con email duplicado
duplicate_email_data = {
    'name': 'Cliente Email Duplicado',
    'code': 'NUEVO002',
    'email': 'ebyted@gmail.com',  # Email que ya existe
    'customer_type': 1
}

print(f"\n=== Probando con email duplicado ===")
serializer3 = CustomerSerializer(data=duplicate_email_data)
print(f"¿Es válido? {serializer3.is_valid()}")
if not serializer3.is_valid():
    print("Errores:")
    for field, errors in serializer3.errors.items():
        print(f"  {field}: {errors}")
