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

-- Insertar detalles de movimientos
INSERT INTO core_inventorymovementdetail (
    id, movement_id, product_variant_id, quantity, price, total, 
    lote, expiration_date, notes, aux1
) VALUES
(1, 1, 10174, 10.0, 0.00, 0.00, 'LOTE-1-1', NULL, 'Producto: ACXION 30MG C/30 TABS FENTERMINA (IFA)...', 'IN'),
(2, 2, 10174, 40.0, 0.00, 0.00, 'LOTE-2-2', NULL, 'Producto: ACXION 30MG C/30 TABS FENTERMINA (IFA)...', 'IN'),
(3, 1, 10174, 4.0, 0.00, 0.00, 'LOTE-1-3', NULL, 'Producto: ACXION AP 30MG C/30 TABS FENTERMINA (IFA)...', 'IN'),
(4, 2, 10174, 40.0, 0.00, 0.00, 'LOTE-2-4', NULL, 'Producto: ACXION AP 30MG C/30 TABS FENTERMINA (IFA)...', 'IN'),
(5, 3, 10157, 59.0, 19.5, 1150.50, 'LOTE-3-5', NULL, 'Producto: ADIOLOL 100MG C/50 + 50 DUO CAPS TRAMADOL (SBL)...', 'IN'),
(6, 4, 10157, 5.0, 19.5, 97.50, 'LOTE-4-6', NULL, 'Producto: ADIOLOL 100MG C/50 + 50 DUO CAPS TRAMADOL (SBL)...', 'IN'),
(7, 5, 10159, 17.0, 0.00, 0.00, 'LOTE-5-7', NULL, 'Producto: ADIOLOL 100MG C/60 + 60 DUO CAPS TRAMADOL (SBL)...', 'OUT'),
(8, 6, 10159, 17.0, 0.00, 0.00, 'LOTE-6-8', NULL, 'Producto: ADIOLOL 100MG C/60 + 60 DUO CAPS TRAMADOL (SBL)...', 'OUT'),
(9, 6, 10197, 5.0, 8.99, 44.950, 'LOTE-6-9', NULL, 'Producto: ALIVIAX 550MG C/10 TABS NAPROXENO SODICO (GENOMMA ...', 'OUT'),
(10, 7, 10197, 20.0, 8.99, 179.800, 'LOTE-7-10', NULL, 'Producto: ALIVIAX 550MG C/10 TABS NAPROXENO SODICO (GENOMMA ...', 'IN'),
(11, 7, 10561, 20.0, 0.00, 0.00, 'LOTE-7-11', NULL, 'Producto: ALIN 0.75MG C/30 TABS DEXAMETASONA (CHINOIN)...', 'IN'),
(12, 8, 10235, 20.0, 0.00, 0.00, 'LOTE-8-12', NULL, 'Producto: AMOXIL 500MG SUSP AMOXICILINA (GLAXO SMITH KLINE)...', 'IN'),
(13, 9, 10247, 10.0, 23.99, 239.900, 'LOTE-9-13', NULL, 'Producto: AMPICILINA EXHIBIDOR C/100 CAPS (SAIMED)...', 'OUT'),
(14, 9, 10281, 6.0, 8.99, 53.940, 'LOTE-9-14', NULL, 'Producto: ARDOSONS C/20 CAPS INDOMETACINA, BETAMETASONA, MET...', 'OUT'),
(15, 7, 10281, 3.0, 8.99, 26.970, 'LOTE-7-15', NULL, 'Producto: ARDOSONS C/20 CAPS INDOMETACINA, BETAMETASONA, MET...', 'IN'),
(16, 7, 10281, 24.0, 0.00, 0.00, 'LOTE-7-16', NULL, 'Producto: ARDOSONS C/20 CAPS INDOMETACINA, BETAMETASONA, MET...', 'IN'),
(17, 9, 10331, 4.0, 18.99, 75.960, 'LOTE-9-17', NULL, 'Producto: AVAPENA 25MG C/20 TABS CLOROPIRAMINA (SANDOZ)...', 'OUT'),
(18, 10, 12706, 6.0, 0.00, 0.00, 'LOTE-10-18', NULL, 'Producto: BARMICIL 30G CREMA Betametasona,Gentamicina,Clotri...', 'OUT'),
(19, 1, 12706, 3.0, 0.00, 0.00, 'LOTE-1-19', NULL, 'Producto: BARMICIL 30G CREMA Betametasona,Gentamicina,Clotri...', 'IN'),
(20, 11, 12706, 5.0, 0.00, 0.00, 'LOTE-11-20', NULL, 'Producto: BARMICIL 30G CREMA Betametasona,Gentamicina,Clotri...', 'OUT'),
(21, 9, 12706, 5.0, 0.00, 0.00, 'LOTE-9-21', NULL, 'Producto: BARMICIL 30G CREMA Betametasona,Gentamicina,Clotri...', 'OUT'),
(22, 12, 12706, 4.0, 0.00, 0.00, 'LOTE-12-22', NULL, 'Producto: BARMICIL 30G CREMA Betametasona,Gentamicina,Clotri...', 'OUT'),
(23, 13, 101, 3.0, 0.00, 0.00, 'LOTE-13-23', NULL, 'Producto: BEDOYECTA CAPSULAS C/30 (GROSSMAN)...', 'IN'),
(24, 2, 10362, 150.0, 20.99, 3148.500, 'LOTE-2-24', NULL, 'Producto: BEDOYECTA TRI C/5 AMP (GROSSMAN)...', 'IN'),
(25, 13, 10362, 4.0, 20.99, 83.960, 'LOTE-13-25', NULL, 'Producto: BEDOYECTA TRI C/5 AMP (GROSSMAN)...', 'IN'),
(26, 14, 10362, 10.0, 20.99, 209.900, 'LOTE-14-26', NULL, 'Producto: BEDOYECTA TRI C/5 AMP (GROSSMAN)...', 'IN'),
(27, 7, 10362, 14.0, 20.99, 293.860, 'LOTE-7-27', NULL, 'Producto: BEDOYECTA TRI C/5 AMP (GROSSMAN)...', 'IN'),
(28, 12, 10362, 35.0, 20.99, 734.650, 'LOTE-12-28', NULL, 'Producto: BEDOYECTA TRI C/5 AMP (GROSSMAN)...', 'OUT'),
(29, 13, 10362, 36.0, 0.00, 0.00, 'LOTE-13-29', NULL, 'Producto: BEDOYECTA TRI C/5 AMP (GROSSMAN) (SIN EMPAQUE)...', 'IN'),
(30, 7, 10362, 42.0, 0.00, 0.00, 'LOTE-7-30', NULL, 'Producto: BEDOYECTA TRI C/5 AMP (GROSSMAN) (SIN EMPAQUE)...', 'IN'),
(31, 4, 10420, 10.0, 0.00, 0.00, 'LOTE-4-31', NULL, 'Producto: CANESTEN V 20 MG C/3 OVULOS CLOTRIMAZOL (BAYER)...', 'IN'),
(32, 9, 10420, 4.0, 0.00, 0.00, 'LOTE-9-32', NULL, 'Producto: CANESTEN V 20 MG C/3 OVULOS CLOTRIMAZOL (BAYER)...', 'OUT'),
(33, 15, 10420, 4.0, 0.00, 0.00, 'LOTE-15-33', NULL, 'Producto: CANESTEN V 20 MG C/3 OVULOS CLOTRIMAZOL (BAYER)...', 'OUT'),
(34, 4, 10421, 25.0, 0.00, 0.00, 'LOTE-4-34', NULL, 'Producto: CANESTEN V 20G CREMA CLOTRIMAZOL (BAYER)...', 'IN'),
(35, 1, 10421, 5.0, 0.00, 0.00, 'LOTE-1-35', NULL, 'Producto: CANESTEN V 20G CREMA CLOTRIMAZOL (BAYER)...', 'IN'),
(36, 11, 10421, 5.0, 0.00, 0.00, 'LOTE-11-36', NULL, 'Producto: CANESTEN V 20G CREMA CLOTRIMAZOL (BAYER)...', 'OUT'),
(37, 7, 10472, 30.0, 0.00, 0.00, 'LOTE-7-37', NULL, 'Producto: CITRA 100MG C/120 TABS TRAMADOL (VICTORY)...', 'IN'),
(38, 6, 11166, 16.0, 31.99, 511.840, 'LOTE-6-38', NULL, 'Producto: DIPROSPAN HYPAK AMP 1ML (SCHERING-PLOUGH)...', 'OUT'),
(39, 5, 11185, 200.0, 33.99, 6798.000, 'LOTE-5-39', NULL, 'Producto: DOLO-NEORUBIÓN DC C/3 AMP (MERCK)...', 'OUT'),
(40, 6, 11185, 30.0, 33.99, 1019.700, 'LOTE-6-40', NULL, 'Producto: DOLO-NEORUBIÓN DC C/3 AMP (MERCK)...', 'OUT'),
(41, 16, 11185, 100.0, 33.99, 3399.000, 'LOTE-16-41', NULL, 'Producto: DOLO-NEORUBIÓN DC C/3 AMP (MERCK)...', 'OUT'),
(42, 11, 11185, 100.0, 33.99, 3399.000, 'LOTE-11-42', NULL, 'Producto: DOLO-NEORUBIÓN DC C/3 AMP (MERCK)...', 'OUT'),
(43, 3, 11185, 400.0, 33.99, 13596.000, 'LOTE-3-43', NULL, 'Producto: DOLO-NEORUBIÓN DC C/3 AMP (MERCK)...', 'IN'),
(44, 4, 11185, 64.0, 33.99, 2175.360, 'LOTE-4-44', NULL, 'Producto: DOLO-NEORUBIÓN DC C/3 AMP (MERCK)...', 'IN'),
(45, 1, 11185, 10.0, 33.99, 339.900, 'LOTE-1-45', NULL, 'Producto: DOLO-NEORUBIÓN DC C/3 AMP (MERCK)...', 'IN'),
(46, 2, 11185, 7.0, 33.99, 237.930, 'LOTE-2-46', NULL, 'Producto: DOLO-NEORUBIÓN DC C/3 AMP (MERCK)...', 'IN'),
(47, 13, 11185, 71.0, 33.99, 2413.290, 'LOTE-13-47', NULL, 'Producto: DOLO-NEORUBIÓN DC C/3 AMP (MERCK)...', 'IN'),
(48, 9, 11185, 6.0, 0.00, 0.00, 'LOTE-9-48', NULL, 'Producto: DOLO-NEORUBIÓN DC C/3 AMP (MERCK) (EMPAQUE)...', 'OUT'),
(49, 3, 11185, 10.0, 0.00, 0.00, 'LOTE-3-49', NULL, 'Producto: DOLO-NEORUBIÓN DC C/3 AMP (MERCK) (EMPAQUE)...', 'IN'),
(50, 5, 11188, 4.0, 0.00, 0.00, 'LOTE-5-50', NULL, 'Producto: DOLO-NEUROBION DC FORTE INY (MERCK)...', 'OUT'),
(51, 6, 11188, 10.0, 0.00, 0.00, 'LOTE-6-51', NULL, 'Producto: DOLO-NEUROBION DC FORTE INY (MERCK)...', 'OUT'),
(52, 16, 11188, 10.0, 0.00, 0.00, 'LOTE-16-52', NULL, 'Producto: DOLO-NEUROBION DC FORTE INY (MERCK)...', 'OUT'),
(53, 3, 11188, 35.0, 0.00, 0.00, 'LOTE-3-53', NULL, 'Producto: DOLO-NEUROBION DC FORTE INY (MERCK)...', 'IN'),
(54, 17, 11188, 22.0, 0.00, 0.00, 'LOTE-17-54', NULL, 'Producto: DOLO-NEUROBION DC FORTE INY (MERCK)...', 'IN'),
(55, 1, 11188, 32.0, 0.00, 0.00, 'LOTE-1-55', NULL, 'Producto: DOLO-NEUROBION DC FORTE INY (MERCK)...', 'IN'),
(56, 5, 11189, 10.0, 0.00, 0.00, 'LOTE-5-56', NULL, 'Producto: DOLO-NEUROBION FORTE C/30 TABS (MERCK)...', 'OUT'),
(57, 3, 11189, 10.0, 0.00, 0.00, 'LOTE-3-57', NULL, 'Producto: DOLO-NEUROBION FORTE C/30 TABS (MERCK)...', 'IN'),
(58, 17, 11189, 10.0, 0.00, 0.00, 'LOTE-17-58', NULL, 'Producto: DOLO-NEUROBION FORTE C/30 TABS (MERCK)...', 'IN'),
(59, 1, 11189, 9.0, 0.00, 0.00, 'LOTE-1-59', NULL, 'Producto: DOLO-NEUROBION FORTE C/30 TABS (MERCK)...', 'IN'),
(60, 4, 11246, 10.0, 0.00, 0.00, 'LOTE-4-60', NULL, 'Producto: ERISPAN C/1 AMP Y JERINGA BETAMETASONA (MAVER)...', 'IN'),
(61, 1, 10651, 15.0, 0.00, 0.00, 'LOTE-1-61', NULL, 'Producto: FARMAPRAM 2MG C/90 TABS ALPRAZOLAM (IFA CELTICS)...', 'IN'),
(62, 9, 11435, 18.0, 0.00, 0.00, 'LOTE-9-62', NULL, 'Producto: GELMICIN 40G Betametasona,Gentamicina,Clotrimazol ...', 'OUT'),
(63, 14, 11435, 40.0, 0.00, 0.00, 'LOTE-14-63', NULL, 'Producto: GELMICIN 40G Betametasona,Gentamicina,Clotrimazol ...', 'IN'),
(64, 7, 11435, 90.0, 0.00, 0.00, 'LOTE-7-64', NULL, 'Producto: GELMICIN 40G Betametasona,Gentamicina,Clotrimazol ...', 'IN'),
(65, 13, 10351, 80.0, 2.99, 239.200, 'LOTE-13-65', NULL, 'Producto: GELMICIN 40G Betametasona,Gentamicina,Clotrimazol ...', 'IN'),
(66, 10, 11815, 6.0, 0.00, 0.00, 'LOTE-10-66', NULL, 'Producto: MELOX PLUS CEREZA 360ML ALUMINIO, MAGNESIO, DIMETI...', 'OUT'),
(67, 13, 10190, 10.0, 0.00, 0.00, 'LOTE-13-67', NULL, 'Producto: METAX C/3 AMP DEXAMETASONA (SONS)...', 'IN'),
(68, 4, 11860, 30.0, 0.00, 0.00, 'LOTE-4-68', NULL, 'Producto: MICROGYNON C/21 TABLETAS (BAYER)...', 'IN'),
(69, 14, 11918, 3.0, 14.99, 44.970, 'LOTE-14-69', NULL, 'Producto: NEO-MELUBRINA JBE INF 100ML (SANOFI AVENTIS)...', 'IN'),
(70, 7, 11919, 15.0, 0.00, 0.00, 'LOTE-7-70', NULL, 'Producto: NEO-MELUBRINA TABS 500MG C/10 TAB METAMIZOL SODICO...', 'IN'),
(71, 6, 11921, 5.0, 0.00, 0.00, 'LOTE-6-71', NULL, 'Producto: NESAJAR C/16 CAPS PINAVERIO / DIMETICONA (GEL PHAR...', 'OUT'),
(72, 1, 11932, 30.0, 34.99, 1049.700, 'LOTE-1-72', NULL, 'Producto: NIKSON C/90 TABS (GENOMMA LAB)...', 'IN'),
(73, 9, 102, 4.0, 0.00, 0.00, 'LOTE-9-73', NULL, 'Producto: NISTATINA (Alpharma) SUSP. Fco./Gotero 24 ML. 100,...', 'OUT'),
(74, 7, 11959, 5.0, 0.00, 0.00, 'LOTE-7-74', NULL, 'Producto: NORDET C/21 TABLETAS (PFIZER)...', 'IN'),
(75, 9, 10717, 20.0, 34.99, 699.800, 'LOTE-9-75', NULL, 'Producto: PENIXILIN 500MG 800,000 UI C/100 CAPS PENICILINA (...', 'OUT'),
(76, 13, 10719, 18.0, 0.00, 0.00, 'LOTE-13-76', NULL, 'Producto: PENPROCILINA 800,000 U INY BENCILPENICILINA PROCAI...', 'IN'),
(77, 13, 10688, 20.0, 7.99, 159.800, 'LOTE-13-77', NULL, 'Producto: PENTIBROXIL 250MG SUSP. AMOXICILINA / AMBROXOL (MA...', 'IN'),
(78, 1, 10689, 15.0, 0.00, 0.00, 'LOTE-1-78', NULL, 'Producto: PENTIBROXIL 500MG C/16 CAPS AMOXICILINA / AMBROXOL...', 'IN'),
(79, 13, 10255, 64.0, 18.99, 1215.360, 'LOTE-13-79', NULL, 'Producto: PENTREXYL 500MG C/28 CAPS AMPICILINA (ASPEN)...', 'IN'),
(80, 13, 12079, 3.0, 0.00, 0.00, 'LOTE-13-80', NULL, 'Producto: PIRIMIR 100MG C/24 TABS (MEDLEY)...', 'IN'),
(81, 7, 10721, 206.0, 0.00, 0.00, 'LOTE-7-81', NULL, 'Producto: POTA-VI-KIN 800,000 U C/40 TAB PENICILINA (COLLINS...', 'IN'),
(82, 7, 12127, 2.0, 0.00, 0.00, 'LOTE-7-82', NULL, 'Producto: POSTDAY C/1 COMPRIMIDOS 1.5MG (INV FARMACÉUTICAS)...', 'IN'),
(83, 13, 12168, 2.0, 0.00, 0.00, 'LOTE-13-83', NULL, 'Producto: QUADRIDERM NF CREMA 30G (SANFER)...', 'IN'),
(84, 7, 12225, 20.0, 0.00, 0.00, 'LOTE-7-84', NULL, 'Producto: RIOPAN GEL ANTIACIDO 250ML (TAKEDA)...', 'IN'),
(85, 2, 12349, 10.0, 9.99, 99.900, 'LOTE-2-85', NULL, 'Producto: SALUDIN OTICO 10ML (PISA)...', 'IN'),
(86, 13, 12458, 3.0, 13.99, 41.970, 'LOTE-13-86', NULL, 'Producto: TEMPRA PEDIATRICO 100ML PARACETAMOL (BRISTOL-MYERS...', 'IN'),
(87, 12, 12458, 30.0, 13.99, 419.700, 'LOTE-12-87', NULL, 'Producto: TEMPRA PEDIATRICO 100ML PARACETAMOL (BRISTOL-MYERS...', 'OUT'),
(88, 9, 12467, 10.0, 11.99, 119.900, 'LOTE-9-88', NULL, 'Producto: TERRAMICINA 10G OFTALMICA OXITETRACICLINA-POLIMIXI...', 'OUT'),
(89, 14, 12467, 50.0, 11.99, 599.500, 'LOTE-14-89', NULL, 'Producto: TERRAMICINA 10G OFTALMICA OXITETRACICLINA-POLIMIXI...', 'IN'),
(90, 8, 12467, 32.0, 0.00, 0.00, 'LOTE-8-90', NULL, 'Producto: TERRAMICINA 10G OFTALMICA OXITETRACICLINA-POLIMIXI...', 'IN'),
(91, 13, 12471, 5.0, 0.00, 0.00, 'LOTE-13-91', NULL, 'Producto: TERRA-TROCISCOS 15MG C/18 PAST (RRX)...', 'IN'),
(92, 13, 12483, 5.0, 0.00, 0.00, 'LOTE-13-92', NULL, 'Producto: TESALON TESACOF ADULTO CEREZA 100ML (NOVARTIS)...', 'IN'),
(93, 13, 103, 1.0, 0.00, 0.00, 'LOTE-13-93', NULL, 'Producto: TOPSYN GEL 0.05% 40G (SYNTEX)...', 'IN'),
(94, 5, 12525, 10.0, 0.00, 0.00, 'LOTE-5-94', NULL, 'Producto: TRAMED RV 100MG C/60 + 60 CAPS DUO TRAMADOL (BAJAM...', 'OUT'),
(95, 8, 10227, 15.0, 0.00, 0.00, 'LOTE-8-95', NULL, 'Producto: TRIXONA 1.0G INY I.M CEFTRIAXONA (BRULUAGSA)...', 'IN'),
(96, 6, 12537, 3.0, 0.00, 0.00, 'LOTE-6-96', NULL, 'Producto: TRIBEDOCE DX C/3 AMP (BRULUART)...', 'OUT'),
(97, 6, 12594, 6.0, 0.00, 0.00, 'LOTE-6-97', NULL, 'Producto: VERMOX 100MG C/6 TABS MEBENDAZOL (JANSSEN-CILAG)...', 'OUT'),
(98, 1, 12745, 10.0, 8.99, 89.900, 'LOTE-1-98', NULL, 'Producto: VERMOX 10ML 1 DIA CEREZA MEBENDAZOL (JANSSEN)...', 'IN'),
(99, 6, 10290, 10.0, 0.00, 0.00, 'LOTE-6-99', NULL, 'Producto: VOLFENAC RETARD 100MG C/20 TABS DICLOFENACO (COLLI...', 'OUT'),
(100, 1, 10290, 19.0, 0.00, 0.00, 'LOTE-1-100', NULL, 'Producto: VOLFENAC RETARD 100MG C/20 TABS DICLOFENACO (COLLI...', 'IN'),
(101, 13, 12685, 2.0, 0.00, 0.00, 'LOTE-13-101', NULL, 'Producto: ZISUAL-C 30G UNG RECTAL C/6 CANULAS LIDOCAINA/ HID...', 'IN');


-- Actualizar secuencias
SELECT setval('core_inventorymovement_id_seq', (SELECT MAX(id) FROM core_inventorymovement));
SELECT setval('core_inventorymovementdetail_id_seq', (SELECT MAX(id) FROM core_inventorymovementdetail));

-- Verificación
SELECT 
    'Movimientos insertados:' as tipo,
    COUNT(*) as cantidad
FROM core_inventorymovement
WHERE reference_document LIKE 'CSV-IMPORT-%'
UNION ALL
SELECT 
    'Detalles insertados:' as tipo,
    COUNT(*) as cantidad
FROM core_inventorymovementdetail 
WHERE movement_id IN (
    SELECT id FROM core_inventorymovement 
    WHERE reference_document LIKE 'CSV-IMPORT-%'
);
