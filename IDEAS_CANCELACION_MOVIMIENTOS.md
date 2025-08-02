## 🎯 IDEAS PARA CANCELACIÓN DE MOVIMIENTOS DE INVENTARIO

### 📊 ANÁLISIS DE LA ESTRUCTURA ACTUAL

**Modelo actual `InventoryMovement`:**
- ✅ `authorized` (Boolean) - Si está autorizado
- ✅ `authorized_by` (User) - Quién autorizó
- ✅ `authorized_at` (DateTime) - Cuándo se autorizó
- ❌ **FALTA:** Sistema de cancelación

---

## 🔧 OPCIÓN 1: ESTADOS EXTENDIDOS (RECOMENDADA)

### **Modificaciones al Modelo:**
```python
class InventoryMovement(models.Model):
    # ... campos existentes ...
    
    # Sistema de estados
    STATUS_CHOICES = [
        ('draft', 'Borrador'),
        ('pending', 'Pendiente'),
        ('authorized', 'Autorizado'),
        ('cancelled', 'Cancelado'),
        ('reversed', 'Revertido'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Campos de cancelación
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='movements_cancelled')
    cancellation_reason = models.TextField(blank=True)
    cancellation_type = models.CharField(max_length=20, choices=[
        ('user_request', 'Solicitud de Usuario'),
        ('error_correction', 'Corrección de Error'),
        ('policy_violation', 'Violación de Política'),
        ('system_error', 'Error del Sistema'),
    ], blank=True)
    
    # Para reversiones automáticas
    reversal_movement = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='original_movement')
```

### **Ventajas:**
- ✅ Trazabilidad completa
- ✅ Diferentes tipos de cancelación
- ✅ Mantiene histórico intacto
- ✅ Permite reversiones automáticas

---

## 🔧 OPCIÓN 2: TABLA DE AUDITORÍA SEPARADA

### **Nuevo Modelo:**
```python
class InventoryMovementCancellation(models.Model):
    original_movement = models.OneToOneField(InventoryMovement, on_delete=models.CASCADE, related_name='cancellation')
    cancelled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    cancelled_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField()
    cancellation_type = models.CharField(max_length=20, choices=[
        ('before_auth', 'Antes de Autorización'),
        ('after_auth', 'Después de Autorización'),
        ('reversal', 'Reversión Completa'),
    ])
    
    # Stock adjustment needed
    requires_stock_reversal = models.BooleanField(default=False)
    stock_reversal_completed = models.BooleanField(default=False)
    reversal_movement = models.ForeignKey(InventoryMovement, on_delete=models.SET_NULL, null=True, blank=True, related_name='cancellation_reversal')
    
    # Metadata
    original_stock_impact = models.JSONField(default=dict)  # Guarda el impacto original al stock
    approval_required = models.BooleanField(default=False)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='cancellations_approved')
```

### **Ventajas:**
- ✅ No modifica modelo principal
- ✅ Auditoría detallada
- ✅ Flexibilidad para metadata
- ✅ Separación de responsabilidades

---

## 🔧 OPCIÓN 3: SISTEMA HÍBRIDO (MÁS COMPLETO)

### **Combinación de ambos enfoques:**

#### **1. Modificar `InventoryMovement`:**
```python
class InventoryMovement(models.Model):
    # ... campos existentes ...
    
    # Estado simple
    is_cancelled = models.BooleanField(default=False)
    cancelled_at = models.DateTimeField(null=True, blank=True)
```

#### **2. Tabla de Auditoría Detallada:**
```python
class MovementCancellationAudit(models.Model):
    movement = models.ForeignKey(InventoryMovement, on_delete=models.CASCADE, related_name='cancellation_audits')
    action_type = models.CharField(max_length=20, choices=[
        ('cancel_request', 'Solicitud de Cancelación'),
        ('cancel_approved', 'Cancelación Aprobada'),
        ('cancel_rejected', 'Cancelación Rechazada'),
        ('stock_reversed', 'Stock Revertido'),
    ])
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    performed_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField()
    metadata = models.JSONField(default=dict)
```

---

## 🎯 FLUJOS DE CANCELACIÓN PROPUESTOS

### **CASO 1: Movimiento NO Autorizado**
```
1. Usuario solicita cancelación
2. Sistema valida permisos
3. Cambia estado a 'cancelled'
4. NO requiere reversión de stock
5. Registra auditoría
```

### **CASO 2: Movimiento Autorizado (Con Stock Impactado)**
```
1. Usuario solicita cancelación
2. Sistema calcula impacto al stock
3. Requiere aprobación de supervisor
4. Al aprobar:
   a. Crea movimiento de reversión automático
   b. Autoriza movimiento de reversión
   c. Actualiza stock
   d. Marca original como cancelado
5. Registra toda la cadena en auditoría
```

### **CASO 3: Cancelación con Aprobación Múltiple**
```
1. Usuario solicita → Estado: 'cancel_requested'
2. Supervisor revisa → Estado: 'cancel_approved/rejected'
3. Si aprobado:
   a. Financiero verifica → Estado: 'finance_approved'
   b. Sistema ejecuta → Estado: 'cancelled'
   c. Reversión automática → Estado: 'reversed'
```

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### **Backend (Django):**

#### **1. Vista de Cancelación:**
```python
class CancelInventoryMovementView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, movement_id):
        movement = get_object_or_404(InventoryMovement, id=movement_id)
        
        # Validaciones
        if movement.is_cancelled:
            return Response({'error': 'Movimiento ya cancelado'}, status=400)
        
        if movement.authorized:
            # Requiere proceso especial para movimientos autorizados
            return self.cancel_authorized_movement(movement, request)
        else:
            # Cancelación directa para no autorizados
            return self.cancel_draft_movement(movement, request)
    
    def cancel_authorized_movement(self, movement, request):
        reason = request.data.get('reason', '')
        
        # Crear movimiento de reversión
        reversal_movement = InventoryMovement.objects.create(
            warehouse=movement.warehouse,
            user=request.user,
            movement_type=f"reversal_{movement.movement_type}",
            reference_document=f"REV-{movement.id}",
            notes=f"Reversión de movimiento {movement.id}. Razón: {reason}"
        )
        
        # Copiar detalles con cantidades invertidas
        for detail in movement.details.all():
            InventoryMovementDetail.objects.create(
                movement=reversal_movement,
                product_variant=detail.product_variant,
                quantity=-detail.quantity,  # Cantidad negativa para revertir
                price=detail.price,
                total=-detail.total
            )
        
        # Autorizar automáticamente la reversión
        reversal_movement.authorized = True
        reversal_movement.authorized_by = request.user
        reversal_movement.authorized_at = timezone.now()
        reversal_movement.save()
        
        # Actualizar stock
        self.update_stock_for_reversal(reversal_movement)
        
        # Marcar original como cancelado
        movement.is_cancelled = True
        movement.cancelled_at = timezone.now()
        movement.save()
        
        # Auditoría
        MovementCancellationAudit.objects.create(
            movement=movement,
            action_type='cancel_approved',
            performed_by=request.user,
            reason=reason,
            metadata={
                'reversal_movement_id': reversal_movement.id,
                'automatic_approval': True
            }
        )
        
        return Response({
            'message': 'Movimiento cancelado y stock revertido',
            'reversal_movement_id': reversal_movement.id
        })
```

### **Frontend (React):**

#### **1. Componente de Cancelación:**
```jsx
const CancelMovementModal = ({ movement, onCancel, onClose }) => {
  const [reason, setReason] = useState('');
  const [cancellationType, setCancellationType] = useState('user_request');
  const [loading, setLoading] = useState(false);
  
  const handleCancel = async () => {
    setLoading(true);
    try {
      const response = await api.post(`inventory-movements/${movement.id}/cancel/`, {
        reason,
        cancellation_type: cancellationType
      });
      
      toast.success('Movimiento cancelado exitosamente');
      onCancel(response.data);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al cancelar movimiento');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="modal show d-block">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-x-circle text-danger me-2"></i>
              Cancelar Movimiento #{movement.id}
            </h5>
          </div>
          
          <div className="modal-body">
            {movement.authorized && (
              <div className="alert alert-warning">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <strong>Movimiento Autorizado:</strong> Se creará una reversión automática 
                para revertir el impacto al stock.
              </div>
            )}
            
            <div className="mb-3">
              <label className="form-label">Tipo de Cancelación:</label>
              <select 
                className="form-select" 
                value={cancellationType}
                onChange={(e) => setCancellationType(e.target.value)}
              >
                <option value="user_request">Solicitud de Usuario</option>
                <option value="error_correction">Corrección de Error</option>
                <option value="policy_violation">Violación de Política</option>
              </select>
            </div>
            
            <div className="mb-3">
              <label className="form-label">Razón de Cancelación: *</label>
              <textarea 
                className="form-control" 
                rows="3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explique por qué se cancela este movimiento..."
                required
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button 
              className="btn btn-danger" 
              onClick={handleCancel}
              disabled={!reason.trim() || loading}
            >
              {loading ? 'Procesando...' : 'Confirmar Cancelación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

#### **2. Botón de Cancelación en Lista:**
```jsx
// En la tabla de movimientos, agregar:
{!movement.is_cancelled && (
  <button 
    className="btn btn-outline-danger btn-sm"
    onClick={() => setCancellingMovement(movement)}
    title="Cancelar movimiento"
    disabled={!canCancelMovement(movement)}
  >
    <i className="bi bi-x-circle"></i>
  </button>
)}

{movement.is_cancelled && (
  <span className="badge bg-danger">
    <i className="bi bi-x-circle me-1"></i>
    Cancelado
  </span>
)}
```

---

## 🎯 CARACTERÍSTICAS ADICIONALES

### **1. Permisos y Roles:**
```python
# En views.py
def can_cancel_movement(user, movement):
    if not movement.authorized:
        return user == movement.user or user.is_staff
    else:
        return user.has_perm('core.cancel_authorized_movement')
```

### **2. Notificaciones:**
```python
# Enviar notificación al usuario original
send_notification(
    movement.user,
    f"Su movimiento #{movement.id} ha sido cancelado",
    f"Razón: {reason}"
)

# Notificar a supervisores si es necesario
if movement.authorized:
    notify_supervisors_of_cancellation(movement, reason)
```

### **3. Reportes de Cancelaciones:**
```sql
-- Query para análisis de cancelaciones
SELECT 
    DATE(cancelled_at) as fecha,
    cancellation_type,
    COUNT(*) as total_cancelaciones,
    AVG(TIMESTAMPDIFF(HOUR, created_at, cancelled_at)) as horas_promedio
FROM inventory_movement 
WHERE is_cancelled = true
GROUP BY DATE(cancelled_at), cancellation_type
ORDER BY fecha DESC;
```

---

## 🏆 RECOMENDACIÓN FINAL

**Implementar OPCIÓN 1 (Estados Extendidos)** con las siguientes fases:

### **Fase 1:** Cancelación Básica
- Agregar campos de cancelación al modelo
- Implementar cancelación para movimientos no autorizados
- UI básica de cancelación

### **Fase 2:** Reversión Automática
- Implementar reversión para movimientos autorizados
- Sistema de aprobaciones
- Auditoría completa

### **Fase 3:** Características Avanzadas
- Notificaciones
- Reportes
- Permisos granulares
- Workflow de aprobación múltiple

¿Te gustaría que implemente alguna de estas opciones específicamente?
