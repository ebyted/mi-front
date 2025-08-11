from core.models import SalesOrder, Customer

print("=== SALES ORDER AND CUSTOMER CHECK ===")

# Check first few orders
orders = SalesOrder.objects.all()[:3]
print(f"Found {len(orders)} orders")

for order in orders:
    print(f"Order {order.id}:")
    print(f"  Customer ID: {order.customer_id}")
    if order.customer:
        print(f"  Customer: {order.customer.name}")
    else:
        print("  Customer: None")
