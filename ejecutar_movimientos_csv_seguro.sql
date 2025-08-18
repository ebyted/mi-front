-- SCRIPT DE EJECUCIÓN SEGURA DE MOVIMIENTOS CSV
-- Ejecuta la importación de movimientos con validaciones

BEGIN;

-- Verificaciones previas
DO $$
DECLARE
    warehouse_count INTEGER;
    user_count INTEGER;
BEGIN
    -- Verificar almacén
    SELECT COUNT(*) INTO warehouse_count FROM core_warehouse WHERE id = 1;
    IF warehouse_count = 0 THEN
        RAISE EXCEPTION 'ERROR: No existe almacén con ID 1. Crear almacén antes de continuar.';
    END IF;
    
    -- Verificar usuario
    SELECT COUNT(*) INTO user_count FROM auth_user WHERE id = 1;
    IF user_count = 0 THEN
        RAISE EXCEPTION 'ERROR: No existe usuario con ID 1. Crear usuario administrador antes de continuar.';
    END IF;
    
    RAISE NOTICE 'Verificaciones previas completadas exitosamente.';
END $$;

-- Mostrar estado actual
SELECT 
    'Estado Actual:' as info,
    (SELECT COUNT(*) FROM core_inventorymovement) as movimientos_actuales,
    (SELECT COUNT(*) FROM core_inventorymovementdetail) as detalles_actuales;

-- Confirmar antes de proceder
\echo 'IMPORTANTE: Este script insertará 17 movimientos y 101 detalles desde CSV.'
\echo 'Presiona Ctrl+C para cancelar, o Enter para continuar...'
\prompt 'Continuar? (s/N): ' continuar

-- Insertar movimientos principales
INSERT INTO core_inventorymovement (
    id, warehouse_id, user_id, movement_type, reference_document, 
    notes, created_at, authorized, authorized_by_id, authorized_at
) VALUES
(1, 1, 1, 'INGRESO', 'CSV-IMPORT-1', 'Movimiento INGRESO - Importado desde CSV', '2025-07-24 12:00:00', true, 1, '2025-07-24 12:00:00'),
(2, 1, 1, 'INGRESO', 'CSV-IMPORT-2', 'Movimiento INGRESO - Importado desde CSV', '2025-07-25 12:00:00', true, 1, '2025-07-25 12:00:00'),
(3, 1, 1, 'INGRESO', 'CSV-IMPORT-3', 'Movimiento INGRESO - Importado desde CSV', '2025-07-17 12:00:00', true, 1, '2025-07-17 12:00:00'),
(4, 1, 1, 'INGRESO', 'CSV-IMPORT-4', 'Movimiento INGRESO - Importado desde CSV', '2025-07-21 12:00:00', true, 1, '2025-07-21 12:00:00'),
(5, 1, 1, 'EGRESO', 'CSV-IMPORT-5', 'Movimiento EGRESO - Importado desde CSV', '2025-07-17 12:00:00', true, 1, '2025-07-17 12:00:00'),
(6, 1, 1, 'EGRESO', 'CSV-IMPORT-6', 'Movimiento EGRESO - Importado desde CSV', '2025-07-21 12:00:00', true, 1, '2025-07-21 12:00:00'),
(7, 1, 1, 'INGRESO', 'CSV-IMPORT-7', 'Movimiento INGRESO - Importado desde CSV', '2025-08-05 12:00:00', true, 1, '2025-08-05 12:00:00'),
(8, 1, 1, 'INGRESO', 'CSV-IMPORT-8', 'Movimiento INGRESO - Importado desde CSV', '2025-08-06 12:00:00', true, 1, '2025-08-06 12:00:00'),
(9, 1, 1, 'EGRESO', 'CSV-IMPORT-9', 'Movimiento EGRESO - Importado desde CSV', '2025-07-31 12:00:00', true, 1, '2025-07-31 12:00:00'),
(10, 1, 1, 'EGRESO', 'CSV-IMPORT-10', 'Movimiento EGRESO - Importado desde CSV', '2025-07-20 12:00:00', true, 1, '2025-07-20 12:00:00'),
(11, 1, 1, 'EGRESO', 'CSV-IMPORT-11', 'Movimiento EGRESO - Importado desde CSV', '2025-07-25 12:00:00', true, 1, '2025-07-25 12:00:00'),
(12, 1, 1, 'EGRESO', 'CSV-IMPORT-12', 'Movimiento EGRESO - Importado desde CSV', '2025-08-01 12:00:00', true, 1, '2025-08-01 12:00:00'),
(13, 1, 1, 'INGRESO', 'CSV-IMPORT-13', 'Movimiento INGRESO - Importado desde CSV', '2025-07-31 12:00:00', true, 1, '2025-07-31 12:00:00'),
(14, 1, 1, 'INGRESO', 'CSV-IMPORT-14', 'Movimiento INGRESO - Importado desde CSV', '2025-08-01 12:00:00', true, 1, '2025-08-01 12:00:00'),
(15, 1, 1, 'EGRESO', 'CSV-IMPORT-15', 'Movimiento EGRESO - Importado desde CSV', '2025-08-05 12:00:00', true, 1, '2025-08-05 12:00:00'),
(16, 1, 1, 'EGRESO', 'CSV-IMPORT-16', 'Movimiento EGRESO - Importado desde CSV', '2025-07-24 12:00:00', true, 1, '2025-07-24 12:00:00'),
(17, 1, 1, 'INGRESO', 'CSV-IMPORT-17', 'Movimiento INGRESO - Importado desde CSV', '2025-07-23 12:00:00', true, 1, '2025-07-23 12:00:00');

\echo 'Movimientos principales insertados correctamente.'

-- Insertar primeros 20 detalles para evitar líneas muy largas
INSERT INTO core_inventorymovementdetail (
    id, movement_id, product_variant_id, quantity, price, total, 
    lote, expiration_date, notes, aux1
) VALUES
(1, 1, 10174, 10.0, 0.00, 0.00, 'LOTE-1-1', NULL, 'Producto: ACXION 30MG C/30 TABS FENTERMINA (IFA)', 'IN'),
(2, 2, 10174, 40.0, 0.00, 0.00, 'LOTE-2-2', NULL, 'Producto: ACXION 30MG C/30 TABS FENTERMINA (IFA)', 'IN'),
(3, 1, 10174, 4.0, 0.00, 0.00, 'LOTE-1-3', NULL, 'Producto: ACXION AP 30MG C/30 TABS FENTERMINA (IFA)', 'IN'),
(4, 2, 10174, 40.0, 0.00, 0.00, 'LOTE-2-4', NULL, 'Producto: ACXION AP 30MG C/30 TABS FENTERMINA (IFA)', 'IN'),
(5, 3, 10157, 59.0, 19.5, 1150.50, 'LOTE-3-5', NULL, 'Producto: ADIOLOL 100MG C/50 + 50 DUO CAPS TRAMADOL (SBL)', 'IN'),
(6, 4, 10157, 5.0, 19.5, 97.50, 'LOTE-4-6', NULL, 'Producto: ADIOLOL 100MG C/50 + 50 DUO CAPS TRAMADOL (SBL)', 'IN'),
(7, 5, 10159, 17.0, 0.00, 0.00, 'LOTE-5-7', NULL, 'Producto: ADIOLOL 100MG C/60 + 60 DUO CAPS TRAMADOL (SBL)', 'OUT'),
(8, 6, 10159, 17.0, 0.00, 0.00, 'LOTE-6-8', NULL, 'Producto: ADIOLOL 100MG C/60 + 60 DUO CAPS TRAMADOL (SBL)', 'OUT'),
(9, 6, 10197, 5.0, 8.99, 44.95, 'LOTE-6-9', NULL, 'Producto: ALIVIAX 550MG C/10 TABS NAPROXENO SODICO (GENOMMA LAB)', 'OUT'),
(10, 7, 10197, 20.0, 8.99, 179.80, 'LOTE-7-10', NULL, 'Producto: ALIVIAX 550MG C/10 TABS NAPROXENO SODICO (GENOMMA LAB)', 'IN');

\echo 'Procesando todos los detalles...'
\i movimientos_detalles.sql

-- Actualizar secuencias
SELECT setval('core_inventorymovement_id_seq', (SELECT MAX(id) FROM core_inventorymovement));
SELECT setval('core_inventorymovementdetail_id_seq', (SELECT MAX(id) FROM core_inventorymovementdetail));

-- Verificación final
\echo 'Verificando inserción...'
SELECT 
    'Movimientos CSV insertados:' as tipo,
    COUNT(*) as cantidad
FROM core_inventorymovement
WHERE reference_document LIKE 'CSV-IMPORT-%'
UNION ALL
SELECT 
    'Detalles CSV insertados:' as tipo,
    COUNT(*) as cantidad
FROM core_inventorymovementdetail 
WHERE movement_id IN (
    SELECT id FROM core_inventorymovement 
    WHERE reference_document LIKE 'CSV-IMPORT-%'
);

-- Resumen de productos procesados
SELECT 
    'Top 5 productos por cantidad:' as resumen,
    '' as producto,
    0 as cantidad_total
UNION ALL
SELECT 
    '',
    pv.name,
    SUM(imd.quantity)::INTEGER
FROM core_inventorymovementdetail imd
JOIN core_productvariant pv ON pv.id = imd.product_variant_id
JOIN core_inventorymovement im ON im.id = imd.movement_id
WHERE im.reference_document LIKE 'CSV-IMPORT-%'
GROUP BY pv.name
ORDER BY cantidad_total DESC
LIMIT 6;

COMMIT;

\echo '✅ IMPORTACIÓN COMPLETADA EXITOSAMENTE!'
\echo 'Movimientos de inventario del CSV han sido procesados e insertados.'
