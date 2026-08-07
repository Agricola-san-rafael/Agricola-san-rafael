-- Vistas calculadas (sección 4.3 de la especificación técnica).
-- Reemplazan columnas/tablas del Excel que hoy se editan a mano
-- (Clientes!I, saldo de Proveedores, Inventario!STOCK ACTUAL).
-- Se consultan desde la app vía prisma.$queryRaw en los services
-- correspondientes (clientes, proveedores, inventario) — no vía el
-- preview feature "views" de Prisma (ver justificación en el plan).

CREATE VIEW vista_saldo_clientes AS
SELECT c.id AS cliente_id, c.nombre,
       COALESCE(SUM(v.total), 0) - COALESCE(cobros.total_cobrado, 0) AS saldo_pendiente
FROM clientes c
LEFT JOIN ventas v ON v.cliente_id = c.id
LEFT JOIN (
  SELECT cliente_id, SUM(monto) AS total_cobrado
  FROM movimientos_cobro
  GROUP BY cliente_id
) cobros ON cobros.cliente_id = c.id
GROUP BY c.id, c.nombre, cobros.total_cobrado;

CREATE VIEW vista_saldo_proveedores AS
SELECT p.id AS proveedor_id, p.nombre,
       COALESCE(SUM(co.total), 0) - COALESCE(pagos.total_pagado, 0) AS saldo_pendiente
FROM proveedores p
LEFT JOIN compras co ON co.proveedor_id = p.id
LEFT JOIN (
  SELECT proveedor_id, SUM(monto) AS total_pagado
  FROM movimientos_pago
  GROUP BY proveedor_id
) pagos ON pagos.proveedor_id = p.id
GROUP BY p.id, p.nombre, pagos.total_pagado;

CREATE VIEW vista_stock_actual AS
SELECT variedad_id, calibre_id, SUM(kilos_disponibles) AS stock_kg
FROM lotes_inventario
GROUP BY variedad_id, calibre_id;
