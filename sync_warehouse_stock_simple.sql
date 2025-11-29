-- =====================================================
-- Script SQL SIMPLIFICADO para sincronización rápida
-- Ejecutar desde pgAdmin o psql
-- =====================================================

-- ACTUALIZAR registros existentes con stock calculado desde movimientos
WITH stock_calculado AS (
    SELECT 
        pv.id AS product_variant_id,
        w.id AS warehouse_id,
        -- Ingresos - Salidas = Stock Real
        COALESCE(SUM(CASE 
            WHEN im.movement_type IN ('purchase', 'adjustment', 'return') 
            THEN imd.quantity 
            ELSE 0 
        END), 0) - COALESCE(SUM(CASE 
            WHEN im.movement_type IN ('sale', 'transfer', 'damage') 
            THEN imd.quantity 
            ELSE 0 
        END), 0) AS stock_real
    FROM 
        core_productvariant pv
    CROSS JOIN 
        core_warehouse w
    LEFT JOIN 
        core_inventorymovementdetail imd ON imd.product_variant_id = pv.id
    LEFT JOIN 
        core_inventorymovement im ON im.id = imd.inventory_movement_id 
                                   AND im.warehouse_id = w.id
    WHERE 
        pv.is_active = true 
        AND w.is_active = true
    GROUP BY 
        pv.id, w.id
)
UPDATE core_productwarehousestock pws
SET 
    quantity = sc.stock_real,
    updated_at = NOW()
FROM 
    stock_calculado sc
WHERE 
    pws.product_variant_id = sc.product_variant_id
    AND pws.warehouse_id = sc.warehouse_id
    AND pws.quantity != sc.stock_real;

-- INSERTAR registros faltantes
WITH stock_calculado AS (
    SELECT 
        pv.id AS product_variant_id,
        w.id AS warehouse_id,
        COALESCE(SUM(CASE 
            WHEN im.movement_type IN ('purchase', 'adjustment', 'return') 
            THEN imd.quantity 
            ELSE 0 
        END), 0) - COALESCE(SUM(CASE 
            WHEN im.movement_type IN ('sale', 'transfer', 'damage') 
            THEN imd.quantity 
            ELSE 0 
        END), 0) AS stock_real
    FROM 
        core_productvariant pv
    CROSS JOIN 
        core_warehouse w
    LEFT JOIN 
        core_inventorymovementdetail imd ON imd.product_variant_id = pv.id
    LEFT JOIN 
        core_inventorymovement im ON im.id = imd.inventory_movement_id 
                                   AND im.warehouse_id = w.id
    WHERE 
        pv.is_active = true 
        AND w.is_active = true
    GROUP BY 
        pv.id, w.id
)
INSERT INTO core_productwarehousestock (
    product_variant_id,
    warehouse_id,
    quantity,
    min_stock,
    location,
    purchase_price,
    sale_price,
    created_at,
    updated_at
)
SELECT 
    sc.product_variant_id,
    sc.warehouse_id,
    sc.stock_real,
    COALESCE(pv.min_stock, 0),
    w.name,
    COALESCE(pv.purchase_price, 0.00),
    COALESCE(pv.price, 0.00),
    NOW(),
    NOW()
FROM 
    stock_calculado sc
JOIN 
    core_productvariant pv ON pv.id = sc.product_variant_id
JOIN 
    core_warehouse w ON w.id = sc.warehouse_id
LEFT JOIN 
    core_productwarehousestock pws ON pws.product_variant_id = sc.product_variant_id 
                                     AND pws.warehouse_id = sc.warehouse_id
WHERE 
    pws.id IS NULL;

-- Mostrar resultado
SELECT 
    'Sincronización completada' AS status,
    (SELECT COUNT(*) FROM core_productwarehousestock) AS total_registros,
    (SELECT COUNT(*) FROM core_productwarehousestock WHERE quantity > 0) AS con_stock;
