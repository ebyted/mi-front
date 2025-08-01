#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para procesar entrada de inventario inicial desde CSV
"""
import os
import django
import csv
from datetime import datetime
from decimal import Decimal, InvalidOperation

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import Product, ProductVariant, InventoryMovement, InventoryMovementDetail, Warehouse, User

def limpiar_precio(precio_str):
    """Convertir precio en formato '$XX,XX' a Decimal"""
    if not precio_str or precio_str.strip() == '':
        return Decimal('0.00')
    
    # Remover $ y espacios
    precio_limpio = precio_str.replace('$', '').replace(' ', '').replace(',', '.')
    
    try:
        return Decimal(precio_limpio)
    except (InvalidOperation, ValueError):
        print(f"⚠️  Precio inválido encontrado: '{precio_str}', usando 0.00")
        return Decimal('0.00')

def buscar_producto(nombre_csv):
    """Buscar producto en la base de datos por nombre"""
    try:
        # Buscar exacto primero
        producto = Product.objects.filter(name__iexact=nombre_csv).first()
        if producto:
            return producto
        
        # Buscar que contenga el nombre
        producto = Product.objects.filter(name__icontains=nombre_csv).first()
        if producto:
            return producto
        
        # Buscar por palabras clave principales
        palabras = nombre_csv.split()[:3]  # Primeras 3 palabras
        for palabra in palabras:
            if len(palabra) > 3:  # Solo palabras significativas
                producto = Product.objects.filter(name__icontains=palabra).first()
                if producto:
                    return producto
        
        return None
    except Exception as e:
        print(f"Error buscando producto '{nombre_csv}': {e}")
        return None

def procesar_inventario_inicial():
    """Procesar archivo CSV y crear movimiento de inventario inicial"""
    
    print("=" * 60)
    print("PROCESAMIENTO DE INVENTARIO INICIAL")
    print("=" * 60)
    
    # Obtener usuario y almacén
    try:
        usuario = User.objects.filter(is_superuser=True).first()
        if not usuario:
            print("❌ No se encontró usuario administrador")
            return False
        
        almacen = Warehouse.objects.first()
        if not almacen:
            print("❌ No se encontró almacén")
            return False
        
        print(f"👤 Usuario: {usuario.email}")
        print(f"🏪 Almacén: {almacen.name}")
        
    except Exception as e:
        print(f"❌ Error obteniendo datos básicos: {e}")
        return False
    
    # Crear movimiento de almacén cabecera
    try:
        movimiento = InventoryMovement.objects.create(
            warehouse=almacen,
            user=usuario,
            movement_type='Entrada',
            notes='Inventario Inicial'
        )
        print(f"✅ Movimiento creado: {movimiento.id}")
        
    except Exception as e:
        print(f"❌ Error creando movimiento: {e}")
        return False
    
    # Procesar archivo CSV
    archivo_csv = 'scripts/entrada.csv'
    productos_encontrados = 0
    productos_no_encontrados = 0
    total_movimiento = Decimal('0.00')
    
    try:
        with open(archivo_csv, 'r', encoding='utf-8') as archivo:
            reader = csv.DictReader(archivo)
            
            print(f"\n📂 Procesando archivo: {archivo_csv}")
            print("-" * 60)
            
            for fila_num, fila in enumerate(reader, 1):
                nombre = fila['nombre'].strip()
                cantidad_str = fila['cantidad'].strip()
                precio_str = fila['precio'].strip()
                
                # Validar cantidad
                try:
                    cantidad = int(cantidad_str)
                except ValueError:
                    print(f"⚠️  Fila {fila_num}: Cantidad inválida '{cantidad_str}' para {nombre[:50]}...")
                    continue
                
                # Convertir precio
                precio = limpiar_precio(precio_str)
                
                # Buscar producto
                producto = buscar_producto(nombre)
                
                if producto:
                    # Obtener variante principal del producto
                    variante = ProductVariant.objects.filter(product=producto).first()
                    if not variante:
                        print(f"⚠️  Fila {fila_num}: Producto sin variantes: {nombre[:50]}...")
                        productos_no_encontrados += 1
                        continue
                    
                    # Crear detalle del movimiento
                    total = cantidad * precio
                    
                    detalle = InventoryMovementDetail.objects.create(
                        movement=movimiento,
                        product_variant=variante,
                        quantity=cantidad,
                        price=precio,
                        total=total,
                        lote='0001',
                        expiration_date=datetime.strptime('2027-01-01', '%Y-%m-%d').date()
                    )
                    
                    total_movimiento += total
                    productos_encontrados += 1
                    
                    print(f"✅ Fila {fila_num}: {producto.name[:50]}... | Cant: {cantidad} | Precio: ${precio}")
                    
                else:
                    productos_no_encontrados += 1
                    print(f"❌ Fila {fila_num}: NO ENCONTRADO: {nombre[:50]}...")
    
    except FileNotFoundError:
        print(f"❌ Archivo no encontrado: {archivo_csv}")
        return False
    except Exception as e:
        print(f"❌ Error procesando archivo: {e}")
        return False
    
    # Actualizar total del movimiento
    try:
        movimiento.total_amount = total_movimiento
        movimiento.save()
        print(f"\n💰 Total del movimiento actualizado: ${total_movimiento}")
    except Exception as e:
        print(f"⚠️  Error actualizando total: {e}")
    
    # Resumen final
    print("\n" + "=" * 60)
    print("RESUMEN DEL PROCESAMIENTO")
    print("=" * 60)
    print(f"✅ Productos encontrados y agregados: {productos_encontrados}")
    print(f"❌ Productos no encontrados: {productos_no_encontrados}")
    print(f"💰 Total del movimiento: ${total_movimiento}")
    print(f"🆔 ID del movimiento: {movimiento.id}")
    print(f"📅 Lote: 0001 (en detalles)")
    print(f"📅 Fecha de caducidad: 2027-01-01 (en detalles)")
    print("=" * 60)
    
    return True

if __name__ == '__main__':
    try:
        resultado = procesar_inventario_inicial()
        if resultado:
            print("🎉 Proceso completado exitosamente!")
        else:
            print("💥 Proceso fallido!")
    except KeyboardInterrupt:
        print("\n⏹️  Proceso interrumpido por el usuario")
    except Exception as e:
        print(f"\n💥 Error inesperado: {e}")
        import traceback
        traceback.print_exc()
