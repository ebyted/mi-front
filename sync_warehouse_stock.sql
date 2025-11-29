-- =====================================================
-- Script SQL para sincronizar core_productwarehousestock
-- con los movimientos de inventario existentes
-- =====================================================

-- 1. CREAR TABLA TEMPORAL CON STOCK REAL CALCULADO
DROP TABLE IF EXISTS temp_stock_real;

CREATE TEMP TABLE temp_stock_real AS
SELECT 
    pv.id AS product_variant_id,
    w.id AS warehouse_id,
    -- Calcular ingresos (compras, ajustes, devoluciones)
    COALESCE(SUM(CASE 
        WHEN im.movement_type IN ('purchase', 'adjustment', 'return') 
        THEN imd.quantity 
        ELSE 0 
    END), 0) AS total_ingresos,
    -- Calcular salidas (ventas, transferencias, daños)
    COALESCE(SUM(CASE 
        WHEN im.movement_type IN ('sale', 'transfer', 'damage') 
        THEN imd.quantity 
        ELSE 0 
    END), 0) AS total_salidas,
    -- Stock final
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
    core_inventorymovement im ON im.id = imd.movement_id AND im.warehouse_id = w.id
WHERE 
    pv.is_active = true 
    AND w.is_active = true
GROUP BY 
    pv.id, w.id;

-- 2. MOSTRAR ESTADÍSTICAS ANTES DE LA SINCRONIZACIÓN
SELECT 
    '=== ESTADÍSTICAS ANTES DE SINCRONIZACIÓN ===' AS info;

SELECT 
    'Total registros en ProductWarehouseStock' AS metrica,
    COUNT(*) AS valor
FROM core_productwarehousestock
UNION ALL
SELECT 
    'Registros con stock > 0',
    COUNT(*)
FROM core_productwarehousestock
WHERE quantity > 0
UNION ALL
SELECT 
    'Total variantes activas',
    COUNT(*)
FROM core_productvariant
WHERE is_active = true
UNION ALL
SELECT 
    'Total almacenes activos',
    COUNT(*)
FROM core_warehouse
WHERE is_active = true
UNION ALL
SELECT 
    'Total movimientos de inventario',
    COUNT(*)
FROM core_inventorymovementdetail;

-- 3. MOSTRAR DISCREPANCIAS
SELECT 
    '=== DISCREPANCIAS DETECTADAS ===' AS info;

SELECT 
    p.name AS producto,
    pv.sku,
    w.name AS almacen,
    COALESCE(pws.quantity, 0) AS stock_registrado,
    tsr.stock_real,
    (tsr.stock_real - COALESCE(pws.quantity, 0)) AS diferencia
FROM 
    temp_stock_real tsr
LEFT JOIN 
    core_productwarehousestock pws ON pws.product_variant_id = tsr.product_variant_id 
                                     AND pws.warehouse_id = tsr.warehouse_id
JOIN 
    core_productvariant pv ON pv.id = tsr.product_variant_id
JOIN 
    core_product p ON p.id = pv.product_id
JOIN 
    core_warehouse w ON w.id = tsr.warehouse_id
WHERE 
    COALESCE(pws.quantity, 0) != tsr.stock_real
    AND (tsr.stock_real > 0 OR COALESCE(pws.quantity, 0) > 0)
ORDER BY 
    ABS(tsr.stock_real - COALESCE(pws.quantity, 0)) DESC
LIMIT 20;

-- 4. ACTUALIZAR REGISTROS EXISTENTES
UPDATE core_productwarehousestock pws
SET 
    quantity = tsr.stock_real,
    updated_at = NOW()
FROM 
    temp_stock_real tsr
WHERE 
    pws.product_variant_id = tsr.product_variant_id
    AND pws.warehouse_id = tsr.warehouse_id
    AND pws.quantity != tsr.stock_real;

SELECT 
    '=== REGISTROS ACTUALIZADOS ===' AS info,
    COUNT(*) AS total_actualizados
FROM 
    temp_stock_real tsr
JOIN 
    core_productwarehousestock pws ON pws.product_variant_id = tsr.product_variant_id 
                                     AND pws.warehouse_id = tsr.warehouse_id
WHERE 
    pws.updated_at >= NOW() - INTERVAL '1 second';

-- 5. INSERTAR REGISTROS FALTANTES
INSERT INTO core_productwarehousestock (
    product_variant_id,
    warehouse_id,
    quantity,
    min_stock,
    location,
    created_at,
    updated_at
)
SELECT 
    tsr.product_variant_id,
    tsr.warehouse_id,
    tsr.stock_real,
    0,  -- min_stock por defecto
    w.name,
    NOW(),
    NOW()
FROM 
    temp_stock_real tsr
JOIN 
    core_productvariant pv ON pv.id = tsr.product_variant_id
JOIN 
    core_warehouse w ON w.id = tsr.warehouse_id
LEFT JOIN 
    core_productwarehousestock pws ON pws.product_variant_id = tsr.product_variant_id 
                                     AND pws.warehouse_id = tsr.warehouse_id
WHERE 
    pws.id IS NULL;

SELECT 
    '=== REGISTROS INSERTADOS ===' AS info,
    COUNT(*) AS total_insertados
FROM 
    temp_stock_real tsr
LEFT JOIN 
    core_productwarehousestock pws ON pws.product_variant_id = tsr.product_variant_id 
                                     AND pws.warehouse_id = tsr.warehouse_id
WHERE 
    pws.created_at >= NOW() - INTERVAL '1 second';

-- 6. MOSTRAR ESTADÍSTICAS DESPUÉS DE LA SINCRONIZACIÓN
SELECT 
    '=== ESTADÍSTICAS DESPUÉS DE SINCRONIZACIÓN ===' AS info;

SELECT 
    'Total registros en ProductWarehouseStock' AS metrica,
    COUNT(*) AS valor
FROM core_productwarehousestock
UNION ALL
SELECT 
    'Registros con stock > 0',
    COUNT(*)
FROM core_productwarehousestock
WHERE quantity > 0
UNION ALL
SELECT 
    'Productos con stock bajo',
    COUNT(*)
FROM core_productwarehousestock
WHERE quantity <= min_stock AND min_stock > 0;

-- 7. MOSTRAR TOP 10 PRODUCTOS CON MÁS STOCK
SELECT 
    '=== TOP 10 PRODUCTOS CON MÁS STOCK ===' AS info;

SELECT 
    p.name AS producto,
    pv.sku,
    w.name AS almacen,
    pws.quantity AS stock,
    pws.min_stock AS stock_minimo
FROM 
    core_productwarehousestock pws
JOIN 
    core_productvariant pv ON pv.id = pws.product_variant_id
JOIN 
    core_product p ON p.id = pv.product_id
JOIN 
    core_warehouse w ON w.id = pws.warehouse_id
WHERE 
    pws.quantity > 0
ORDER BY 
    pws.quantity DESC
LIMIT 10;

-- 8. MOSTRAR PRODUCTOS CON STOCK BAJO
SELECT 
    '=== PRODUCTOS CON STOCK BAJO ===' AS info;

SELECT 
    p.name AS producto,
    pv.sku,
    w.name AS almacen,
    pws.quantity AS stock_actual,
    pws.min_stock AS stock_minimo,
    (pws.min_stock - pws.quantity) AS faltante
FROM 
    core_productwarehousestock pws
JOIN 
    core_productvariant pv ON pv.id = pws.product_variant_id
JOIN 
    core_product p ON p.id = pv.product_id
JOIN 
    core_warehouse w ON w.id = pws.warehouse_id
WHERE 
    pws.quantity <= pws.min_stock 
    AND pws.min_stock > 0
ORDER BY 
    (pws.min_stock - pws.quantity) DESC
LIMIT 10;

-- 9. LIMPIAR TABLA TEMPORAL
DROP TABLE IF EXISTS temp_stock_real;

SELECT 
    '=== SINCRONIZACIÓN COMPLETADA ===' AS info;
