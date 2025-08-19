# Solución Error 400 - API Customers

## 🚨 Problema Identificado

**Error 400 al guardar customers** en `POST /api/customers/`

```
10.0.1.197 - - [18/Aug/2025:23:51:56 +0000] "POST /api/customers/ HTTP/1.1" 400 41
```

## 🔍 Causas Principales del Error 400

1. **Código duplicado**: Cliente intenta usar un `code` que ya existe
2. **Email duplicado**: Cliente intenta usar un `email` que ya existe  
3. **Campos obligatorios faltantes**: `name`, `code`, `email`, `customer_type`
4. **Customer type inválido**: ID de `customer_type` que no existe
5. **Business no asignado**: Falta la asignación automática del business

## ✅ Solución Implementada

### 1. CustomerSerializer Mejorado

**Archivo**: `core/serializers.py`

- ✅ **Mensajes de error en español** más claros
- ✅ **Validaciones personalizadas** para `code` y `email`
- ✅ **Normalización automática**: 
  - `code` → MAYÚSCULAS
  - `email` → minúsculas
- ✅ **Asignación automática del business**
- ✅ **Detección de duplicados** antes de guardar

### 2. ViewSet Mejorado

**Archivo**: `core/views_clean.py`

- ✅ **Contexto de request** pasado al serializer
- ✅ **Manejo automático del business** del usuario

## 📋 Casos de Error Manejados

### ❌ Código Duplicado
```json
{
  "code": ["Ya existe un cliente con este código. Por favor, use un código diferente."]
}
```

### ❌ Email Duplicado  
```json
{
  "email": ["Ya existe un cliente con este email. Por favor, use un email diferente."]
}
```

### ❌ Campos Faltantes
```json
{
  "name": ["El nombre del cliente es obligatorio."],
  "code": ["El código del cliente es obligatorio."],
  "email": ["El email del cliente es obligatorio."],
  "customer_type": ["El tipo de cliente es obligatorio."]
}
```

### ❌ Customer Type Inválido
```json
{
  "customer_type": ["El tipo de cliente seleccionado no existe."]
}
```

## 🎯 Datos Correctos para Customer

```json
{
  "name": "Nombre del Cliente",
  "code": "CLI001",
  "email": "cliente@email.com",
  "phone": "123-456-7890",
  "address": "Dirección del cliente",
  "customer_type": 1,
  "has_credit": false,
  "credit_limit": 0,
  "credit_days": 0
}
```

## 🚀 Deploy en VPS

### 1. Copiar archivos modificados:

```bash
# Copiar serializers.py mejorado
scp core/serializers.py root@168.231.74.214:/app/core/

# Copiar views_clean.py mejorado  
scp core/views_clean.py root@168.231.74.214:/app/core/
```

### 2. Reiniciar backend:

```bash
ssh root@168.231.74.214

# Reiniciar contenedor backend
docker service update sancho_backend_v2 --force

# Verificar logs
docker service logs sancho_backend_v2 -f
```

### 3. Probar la API:

```bash
# Probar con datos válidos
curl -X POST https://sanchodistribuidora.com/api/customers/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Cliente Test",
    "code": "TEST001", 
    "email": "test@example.com",
    "customer_type": 1,
    "has_credit": false
  }'
```

## 📊 Verificación de Datos Actuales

### Customers Existentes:
- **Count**: 1 cliente
- **Code existente**: `TIJUANA` 
- **Email existente**: `ebyted@gmail.com`

### CustomerTypes Disponibles:
- **ID 1**: Level 1 (0% descuento)

### Business Disponibles:
- **ID 1**: Sancho Distribuidora
- **ID 2**: Empresa Principal

## 🛡️ Prevención de Errores

### Frontend (Validación)
```javascript
// Validar antes de enviar
const validateCustomer = (data) => {
  const errors = {};
  
  if (!data.name?.trim()) errors.name = "Nombre obligatorio";
  if (!data.code?.trim()) errors.code = "Código obligatorio";  
  if (!data.email?.trim()) errors.email = "Email obligatorio";
  if (!data.customer_type) errors.customer_type = "Tipo de cliente obligatorio";
  
  return errors;
};
```

### Backend (Validación Robusta)
- ✅ Validaciones personalizadas implementadas
- ✅ Mensajes claros en español
- ✅ Manejo de duplicados
- ✅ Normalización automática

## 🔧 Comandos de Debug

### Verificar datos en VPS:
```bash
# Conectar al contenedor de Django
docker exec -it CONTAINER_ID python manage.py shell

# Verificar customers
>>> from core.models import Customer
>>> Customer.objects.all().values('id', 'name', 'code', 'email')

# Verificar customer types
>>> from core.models import CustomerType  
>>> CustomerType.objects.all().values()
```

### Logs de errores:
```bash
# Ver logs del backend
docker service logs sancho_backend_v2 --tail 100

# Filtrar errores 400
docker service logs sancho_backend_v2 | grep "400"
```

---

**✅ Solución completa implementada y probada localmente**  
**🚀 Lista para deploy en producción**
