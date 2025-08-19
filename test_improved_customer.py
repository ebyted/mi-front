from core.models import Customer, CustomerType, Business
from core.serializers import CustomerSerializer

print("=== Testing Improved CustomerSerializer ===")

# Test cases que simulan el error 400
test_cases = [
    {
        "name": "Caso 1: Datos válidos",
        "data": {
            'name': 'Cliente Válido',
            'code': 'VALID001', 
            'email': 'valido@test.com',
            'phone': '123-456-7890',
            'customer_type': 1,
            'has_credit': False
        },
        "should_pass": True
    },
    {
        "name": "Caso 2: Código duplicado",
        "data": {
            'name': 'Cliente Duplicado',
            'code': 'TIJUANA',  # Ya existe
            'email': 'nuevo2@test.com',
            'customer_type': 1
        },
        "should_pass": False
    },
    {
        "name": "Caso 3: Email duplicado", 
        "data": {
            'name': 'Cliente Email Dup',
            'code': 'NUEVO003',
            'email': 'ebyted@gmail.com',  # Ya existe
            'customer_type': 1
        },
        "should_pass": False
    },
    {
        "name": "Caso 4: Campos obligatorios faltantes",
        "data": {
            'name': 'Cliente Incompleto',
            # Falta code, email, customer_type
        },
        "should_pass": False
    },
    {
        "name": "Caso 5: Customer type inválido",
        "data": {
            'name': 'Cliente Type Inv',
            'code': 'NUEVO004',
            'email': 'nuevo4@test.com',
            'customer_type': 999  # No existe
        },
        "should_pass": False
    }
]

for case in test_cases:
    print(f"\n--- {case['name']} ---")
    serializer = CustomerSerializer(data=case['data'])
    
    is_valid = serializer.is_valid()
    print(f"Valid: {is_valid} (Expected: {case['should_pass']})")
    
    if not is_valid:
        print("Errores:")
        for field, errors in serializer.errors.items():
            for error in errors:
                print(f"  - {field}: {error}")
    
    # Si es válido y debería pasar, intentar crear (pero no guardar)
    if is_valid and case['should_pass']:
        print("  ✅ Datos válidos - listos para crear")
    elif not is_valid and not case['should_pass']:
        print("  ✅ Errores detectados correctamente")
    else:
        print("  ❌ Resultado inesperado")

print("\n=== Resumen del error 400 ===")
print("El error 400 en /api/customers/ se debe principalmente a:")
print("1. Código duplicado - ya existe un cliente con ese código")
print("2. Email duplicado - ya existe un cliente con ese email") 
print("3. Campos obligatorios faltantes (name, code, email, customer_type)")
print("4. Customer type inválido")
print("5. Business no asignado correctamente")

print("\n=== Solución implementada ===")
print("1. Mensajes de error más claros en español")
print("2. Validaciones personalizadas para code y email")
print("3. Normalización automática (code a mayúsculas, email a minúsculas)")
print("4. Asignación automática del business")
print("5. Manejo mejorado de errores de validación")
