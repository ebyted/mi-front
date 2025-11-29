-- =====================================================
-- Script SQL RÁPIDO para sincronizar stock
-- Ejecutar en pgAdmin directamente
-- =====================================================

-- OPCIÓN 1: ACTUALIZAR TODO EL STOCK
-- (Usa esto si quieres sincronizar todo)

WITH stock_calculado AS (
    SELECT 
        pv.id AS variant_id,
        w.id AS warehouse_id,
        -- Ingresos - Salidas = Stock Real
        GREATEST(
            COALESCE(SUM(CASE 
                WHEN im.movement_type IN ('purchase', 'adjustment', 'return') 
                THEN imd.quantity 
                ELSE 0 
            END), 0) - 
            COALESCE(SUM(CASE 
                WHEN im.movement_type IN ('sale', 'transfer', 'damage') 
                THEN imd.quantity 
                ELSE 0 
            END), 0),
            0
        ) AS stock_real
    FROM core_productvariant pv
    CROSS JOIN core_warehouse w
    LEFT JOIN core_inventorymovementdetail imd ON imd.product_variant_id = pv.id
    LEFT JOIN core_inventorymovement im ON im.id = imd.inventory_movement_id 
                                         AND im.warehouse_id = w.id
    WHERE pv.is_active = true AND w.is_active = true
    GROUP BY pv.id, w.id
)
-- Actualizar registros existentes
UPDATE core_productwarehousestock pws
SET 
    quantity = sc.stock_real,
    updated_at = NOW()
FROM stock_calculado sc
WHERE pws.product_variant_id = sc.variant_id
  AND pws.warehouse_id = sc.warehouse_id
  AND pws.quantity != sc.stock_real;

-- Ver cuántos se actualizaron
SELECT COUNT(*) AS registros_actualizados 
FROM core_productwarehousestock 
WHERE updated_at >= NOW() - INTERVAL '10 seconds';


-- =====================================================
-- OPCIÓN 2: INSERTAR REGISTROS FALTANTES
-- =====================================================

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
    pv.id,
    w.id,
    GREATEST(
        COALESCE(SUM(CASE 
            WHEN im.movement_type IN ('purchase', 'adjustment', 'return') 
            THEN imd.quantity 
            ELSE 0 
        END), 0) - 
        COALESCE(SUM(CASE 
            WHEN im.movement_type IN ('sale', 'transfer', 'damage') 
            THEN imd.quantity 
            ELSE 0 
        END), 0),
        0
    ) AS stock_real,
    COALESCE(pv.min_stock, 0),
    w.name,
    COALESCE(pv.purchase_price, 0.00),
    COALESCE(pv.price, 0.00),
    NOW(),
    NOW()
FROM core_productvariant pv
CROSS JOIN core_warehouse w
LEFT JOIN core_inventorymovementdetail imd ON imd.product_variant_id = pv.id
LEFT JOIN core_inventorymovement im ON im.id = imd.inventory_movement_id 
                                      AND im.warehouse_id = w.id
LEFT JOIN core_productwarehousestock pws ON pws.product_variant_id = pv.id 
                                           AND pws.warehouse_id = w.id
WHERE pv.is_active = true 
  AND w.is_active = true
  AND pws.id IS NULL
GROUP BY pv.id, w.id, w.name;

-- Ver cuántos se insertaron
SELECT COUNT(*) AS registros_insertados 
FROM core_productwarehousestock 
WHERE created_at >= NOW() - INTERVAL '10 seconds';


-- =====================================================
-- OPCIÓN 3: VER DISCREPANCIAS (Solo consulta)
-- =====================================================

SELECT 
    p.name AS producto,
    pv.sku,
    w.name AS almacen,
    pws.quantity AS registrado,
    (
        COALESCE(SUM(CASE 
            WHEN im.movement_type IN ('purchase', 'adjustment', 'return') 
            THEN imd.quantity 
            ELSE 0 
        END), 0) - 
        COALESCE(SUM(CASE 
            WHEN im.movement_type IN ('sale', 'transfer', 'damage') 
            THEN imd.quantity 
            ELSE 0 
        END), 0)
    ) AS real,
    (
        (
            COALESCE(SUM(CASE 
                WHEN im.movement_type IN ('purchase', 'adjustment', 'return') 
                THEN imd.quantity 
                ELSE 0 
            END), 0) - 
            COALESCE(SUM(CASE 
                WHEN im.movement_type IN ('sale', 'transfer', 'damage') 
                THEN imd.quantity 
                ELSE 0 
            END), 0)
        ) - pws.quantity
    ) AS diferencia
FROM core_productwarehousestock pws
JOIN core_productvariant pv ON pv.id = pws.product_variant_id
JOIN core_product p ON p.id = pv.product_id
JOIN core_warehouse w ON w.id = pws.warehouse_id
LEFT JOIN core_inventorymovementdetail imd ON imd.product_variant_id = pv.id
LEFT JOIN core_inventorymovement im ON im.id = imd.inventory_movement_id 
                                      AND im.warehouse_id = w.id
GROUP BY p.name, pv.sku, w.name, pws.quantity
HAVING pws.quantity != (
    COALESCE(SUM(CASE 
        WHEN im.movement_type IN ('purchase', 'adjustment', 'return') 
        THEN imd.quantity 
        ELSE 0 
    END), 0) - 
    COALESCE(SUM(CASE 
        WHEN im.movement_type IN ('sale', 'transfer', 'damage') 
        THEN imd.quantity 
        ELSE 0 
    END), 0)
)
ORDER BY ABS(
    (
        COALESCE(SUM(CASE 
            WHEN im.movement_type IN ('purchase', 'adjustment', 'return') 
            THEN imd.quantity 
            ELSE 0 
        END), 0) - 
        COALESCE(SUM(CASE 
            WHEN im.movement_type IN ('sale', 'transfer', 'damage') 
            THEN imd.quantity 
            ELSE 0 
        END), 0)
    ) - pws.quantity
) DESC
LIMIT 20;
