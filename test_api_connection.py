#!/usr/bin/env python3
"""
Script para verificar la conexión con el API y probar el endpoint de sales-orders
"""

import requests
import json

# Configuración
API_BASE_URL = "https://sanchodistribuidora.com/api"
TEST_USER_EMAIL = "arkano@master.com"
TEST_USER_PASSWORD = "master123"

def test_api_connection():
    print("🔗 Probando conexión con el API...")
    
    try:
        # 1. Probar endpoint de token
        print("1️⃣ Probando autenticación...")
        auth_response = requests.post(f"{API_BASE_URL}/token/", {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        if auth_response.status_code == 200:
            tokens = auth_response.json()
            access_token = tokens.get('access')
            print(f"✅ Autenticación exitosa")
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # 2. Probar endpoint de customers
            print("2️⃣ Probando endpoint de customers...")
            customers_response = requests.get(f"{API_BASE_URL}/customers/", headers=headers)
            print(f"📊 Customers status: {customers_response.status_code}")
            if customers_response.status_code == 200:
                customers = customers_response.json()
                print(f"👥 Encontrados {len(customers)} clientes")
            
            # 3. Probar endpoint de customer-types
            print("3️⃣ Probando endpoint de customer-types...")
            customer_types_response = requests.get(f"{API_BASE_URL}/customer-types/", headers=headers)
            print(f"📊 Customer types status: {customer_types_response.status_code}")
            if customer_types_response.status_code == 200:
                types = customer_types_response.json()
                print(f"🏷️ Encontrados {len(types)} tipos de cliente")
            
            # 4. Probar endpoint de sales-orders
            print("4️⃣ Probando endpoint de sales-orders...")
            sales_orders_response = requests.get(f"{API_BASE_URL}/sales-orders/", headers=headers)
            print(f"📊 Sales orders status: {sales_orders_response.status_code}")
            if sales_orders_response.status_code == 200:
                orders = sales_orders_response.json()
                print(f"🛒 Encontradas {len(orders)} órdenes de venta")
            
            # 5. Probar endpoint de product-warehouse-stocks
            print("5️⃣ Probando endpoint de product-warehouse-stocks...")
            stocks_response = requests.get(f"{API_BASE_URL}/product-warehouse-stocks/", headers=headers)
            print(f"📊 Stocks status: {stocks_response.status_code}")
            if stocks_response.status_code == 200:
                stocks = stocks_response.json()
                print(f"📦 Encontrados {len(stocks)} registros de stock")
            
            # 6. Probar crear una venta de prueba
            print("6️⃣ Probando creación de venta...")
            
            # Primero obtener un cliente
            if customers_response.status_code == 200 and len(customers_response.json()) > 0:
                customer_id = customers_response.json()[0]['id']
                
                # Obtener un producto con stock
                if stocks_response.status_code == 200 and len(stocks_response.json()) > 0:
                    stock_item = stocks_response.json()[0]
                    
                    test_sale_data = {
                        "customer": customer_id,
                        "total_amount": 100.00,
                        "status": "completed",
                        "notes": "Venta de prueba desde script",
                        "items": [
                            {
                                "product": stock_item.get('product_variant', {}).get('id') if stock_item.get('product_variant') else stock_item.get('id'),
                                "quantity": 1,
                                "unit_price": 100.00,
                                "total_price": 100.00
                            }
                        ]
                    }
                    
                    create_sale_response = requests.post(
                        f"{API_BASE_URL}/sales-orders/", 
                        headers=headers,
                        json=test_sale_data
                    )
                    
                    print(f"📊 Create sale status: {create_sale_response.status_code}")
                    if create_sale_response.status_code == 201:
                        print("✅ Venta creada exitosamente!")
                        print(f"📄 Respuesta: {create_sale_response.json()}")
                    else:
                        print(f"❌ Error creando venta: {create_sale_response.text}")
                        print(f"📄 Status: {create_sale_response.status_code}")
                else:
                    print("⚠️ No hay productos con stock para probar")
            else:
                print("⚠️ No hay clientes para probar")
                
        else:
            print(f"❌ Error de autenticación: {auth_response.status_code}")
            print(f"📄 Respuesta: {auth_response.text}")
            
    except Exception as e:
        print(f"💥 Error de conexión: {e}")

if __name__ == "__main__":
    test_api_connection()
