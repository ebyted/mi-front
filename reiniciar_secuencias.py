from django.db import connection

def reiniciar_secuencias():
    print('🔄 Reiniciando secuencias de IDs...')
    
    with connection.cursor() as cursor:
        try:
            # Verificar si es PostgreSQL
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            
            if 'PostgreSQL' in version:
                print('   📄 Base de datos: PostgreSQL')
                
                # Reiniciar secuencia de InventoryMovement
                cursor.execute("SELECT setval(pg_get_serial_sequence('core_inventorymovement', 'id'), 1, false);")
                print('   ✅ Secuencia core_inventorymovement reiniciada')
                
                # Reiniciar secuencia de InventoryMovementDetail
                cursor.execute("SELECT setval(pg_get_serial_sequence('core_inventorymovementdetail', 'id'), 1, false);")
                print('   ✅ Secuencia core_inventorymovementdetail reiniciada')
                
                print('🎉 Todas las secuencias PostgreSQL reiniciadas!')
            else:
                print(f'   📄 Base de datos: {version.split()[0]}')
                print('   ⚠️ Reinicio de secuencias no necesario para esta BD')
                
        except Exception as e:
            print(f'⚠️ Error: {e}')
            print('   Las secuencias se reiniciarán automáticamente')

if __name__ == "__main__":
    reiniciar_secuencias()
