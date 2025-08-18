-- SCRIPT DE MOVIMIENTOS DE INVENTARIO
-- Generado automáticamente desde mov_inv.csv
-- Fecha de generación: 2025-08-18 03:10:47

-- Limpiar tablas (opcional - descomenta si quieres resetear)
-- DELETE FROM core_inventorymovementdetail;
-- DELETE FROM core_inventorymovement;
-- ALTER SEQUENCE core_inventorymovement_id_seq RESTART WITH 1;
-- ALTER SEQUENCE core_inventorymovementdetail_id_seq RESTART WITH 1;

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

