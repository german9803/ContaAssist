# API — endpoints principales

REST sobre Express. Todas las rutas (excepto auth) requieren JWT y resuelven `empresa_id` desde el token o desde un header `X-Empresa-Id` validado contra `usuario_empresa_rol` — nunca desde un parámetro que el cliente pueda alterar libremente sin verificación.

## Autenticación
```
POST   /api/auth/registro               (crea usuario + su primera empresa, queda ADMINISTRADOR)
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
```

## Empresas y usuarios
Estas rutas resuelven la empresa desde el parámetro `:id` de la URL (no desde `X-Empresa-Id`), validado igual contra las empresas del usuario autenticado.
```
GET    /api/empresas                    (empresas del usuario autenticado)
POST   /api/empresas                    (cualquier usuario autenticado; queda ADMINISTRADOR de la nueva empresa)
GET    /api/empresas/:id
PATCH  /api/empresas/:id                (ADMINISTRADOR)

GET    /api/empresas/:id/usuarios
POST   /api/empresas/:id/usuarios       (ADMINISTRADOR; invita/crea usuario con rol — si el email no existe
                                          se crea con una contraseña temporal devuelta una sola vez en la
                                          respuesta, ya que todavía no hay envío de correo de invitación)
PATCH  /api/empresas/:id/usuarios/:usuarioId   (ADMINISTRADOR; cambiar rol/activo — bloqueado si deja la
                                                 empresa sin ningún ADMINISTRADOR activo)
```

Nota: el token de acceso lleva embebida la lista de empresas/roles del usuario (para no consultar la BD en cada request); si se crea una empresa, se invita a un usuario o se le cambia el rol, hay que llamar a `/api/auth/refresh` para que el nuevo token refleje el cambio (dura hasta 15 minutos si no).

## Terceros
```
GET    /api/terceros?tipo=&q=&page=     (q busca por razón social o identificación, insensible a mayúsculas)
POST   /api/terceros                    (ADMINISTRADOR/AUXILIAR_CONTABLE/CONTADOR; si tipoIdentificacion=NIT y
                                          no se envía dv, se calcula con el algoritmo DIAN; si se envía y no
                                          coincide con el calculado, 400)
GET    /api/terceros/:id
PATCH  /api/terceros/:id                (mismos roles; no permite cambiar tipoIdentificacion/identificacion —
                                          si estaban mal, desactivar y crear uno nuevo, para no reatribuir en
                                          silencio los documentos históricos que ya apuntan a este id)
```

## Centro de carga
```
POST   /api/cargas                      (multipart, uno o varios archivos)
GET    /api/cargas?estado=&page=
GET    /api/cargas/:id
GET    /api/cargas/:id/archivos
```

## Documentos
```
GET    /api/documentos?estado=&tipoDocumento=&tercero=&fechaDesde=&fechaHasta=&page=
                                         (tercero busca por razón social o identificación, insensible a mayúsculas)
GET    /api/documentos/resumen?tipoDocumento=&fechaDesde=&fechaHasta=
                                         (KPIs para Compras/Ventas: totalDocumentos, totalValor,
                                          porEstado: [{estado, cantidad, valor}])
GET    /api/documentos/:id              (incluye tercero, impuestos, validaciones)
PATCH  /api/documentos/:id              (edición en revisión; ADMINISTRADOR/AUXILIAR_CONTABLE/CONTADOR)
POST   /api/documentos/:id/aprobar      (ADMINISTRADOR/CONTADOR; 409 si hay reglas BLOQUEANTE en falla)
POST   /api/documentos/:id/rechazar     (ADMINISTRADOR/CONTADOR; body opcional {motivo})
GET    /api/documentos/:id/archivo-original   (stream del PDF/imagen para el panel de revisión)
POST   /api/documentos/:id/revalidar    (ADMINISTRADOR/AUXILIAR_CONTABLE/CONTADOR)
PATCH  /api/documentos/:id/detalles/:detalleId   (Fase 14; ADMINISTRADOR/AUXILIAR_CONTABLE/CONTADOR;
                                          asigna producto/bodega/cuenta/centro de una línea ya existente
                                          por código — no crea ni borra líneas)
```

**Compras** (`/compras` en el frontend) y **Ventas** (`/ventas`) no son endpoints propios — son la misma bandeja de Documentos con `tipoDocumento` fijo (`FACTURA_COMPRA` / `FACTURA_VENTA`) más `GET /api/documentos/resumen` para los KPIs de cabecera.

## Mapeo
```
GET    /api/mapeos/cuentas?sistemaDestino=
POST   /api/mapeos/cuentas
GET    /api/mapeos/terceros?sistemaDestino=
POST   /api/mapeos/terceros
GET    /api/mapeos/formas-pago?sistemaDestino=
POST   /api/mapeos/formas-pago
GET    /api/mapeos/bodegas?sistemaDestino=       (Fase 14)
POST   /api/mapeos/bodegas
GET    /api/mapeos/productos?sistemaDestino=     (Fase 14; solo devuelve los ya mapeados, como terceros)
POST   /api/mapeos/productos
```

## Exportaciones
```
POST   /api/exportaciones/preview       (ADMINISTRADOR/CONTADOR; valida y devuelve resumen: ✓/⚠, sin generar archivo)
POST   /api/exportaciones                (ADMINISTRADOR/CONTADOR; genera el archivo; body admite
                                          `parametrosAdaptador` — Fase 14: WordOffice exige
                                          `{ terceroInterno }`, admite `notaLinea`/`centroCostosTexto`)
GET    /api/exportaciones?empresa=&page=
GET    /api/exportaciones/:id
GET    /api/exportaciones/:id/descargar
```

## Inventario (Fase 14)
```
GET    /api/inventario/productos?q=      (q busca por nombre o código, insensible a mayúsculas)
POST   /api/inventario/productos         (ADMINISTRADOR/AUXILIAR_CONTABLE/CONTADOR; codigo es opcional)
GET    /api/inventario/bodegas
POST   /api/inventario/bodegas           (ADMINISTRADOR/AUXILIAR_CONTABLE/CONTADOR)
```

## Pagos y recaudos — cartera / cuentas por pagar (Fase 15, parcial)
Cartera y Cuentas por pagar son el mismo endpoint con `tipo` fijo (`PAGO` a proveedor / `RECAUDO` de cliente) — igual que Compras/Ventas con `tipoDocumento`.
```
GET    /api/pagos/documentos?tipo=&estadoCartera=&tercero=&fechaDesde=&fechaHasta=&page=
                                          (documentos FACTURA_COMPRA/FACTURA_VENTA elegibles con
                                           saldoPendiente/estadoCartera/vencido calculados)
GET    /api/pagos/resumen?tipo=&fechaDesde=&fechaHasta=
                                          (KPIs: totalPendiente, totalVencido, cantidadPendientes,
                                           cantidadVencidos)
POST   /api/pagos                        (ADMINISTRADOR/CONTADOR; { tipo, terceroId, fecha, valor,
                                           formaPagoId?, cuentaBancariaId?, observaciones?,
                                           aplicaciones: [{documentoId, valorAplicado}] })
GET    /api/pagos?tipo=&terceroId=&page=
GET    /api/pagos/:id
POST   /api/pagos/:id/anular             (ADMINISTRADOR/CONTADOR; soft-delete, no borra el historial)
```

## Bancos — cuentas, extractos y conciliación (Fase 15)
Catálogo de cuentas + vínculo opcional con pagos/recaudos (`cuentaBancariaId` en `POST /api/pagos`) + importación de extractos (plantilla propia de ContaAssist) + conciliación sugerida (nunca automática).
```
GET    /api/bancos/cuentas               (incluye saldo calculado)
POST   /api/bancos/cuentas               (ADMINISTRADOR/AUXILIAR_CONTABLE/CONTADOR; { banco,
                                           numeroCuenta, tipoCuenta, saldoInicial?, moneda? })
POST   /api/bancos/cuentas/:id/extractos (ADMINISTRADOR/AUXILIAR_CONTABLE/CONTADOR; multipart,
                                           campo `archivo` — CSV/XLSX, plantilla propia:
                                           fecha, descripcion, debito, credito)
GET    /api/bancos/cuentas/:id/extractos (historial de extractos importados de esa cuenta)
GET    /api/bancos/extractos/:id         (detalle con líneas; cada línea sin conciliar trae
                                           `sugerencias`: candidatos de pago, nunca auto-aplicados)
POST   /api/bancos/extractos/lineas/:lineaId/conciliar     (ADMINISTRADOR/CONTADOR; { pagoId })
POST   /api/bancos/extractos/lineas/:lineaId/desconciliar  (ADMINISTRADOR/CONTADOR)
```

## Reportes
```
GET    /api/reportes/documentos?filtros...&formato=json|xlsx|pdf
```

## Configuración
```
GET    /api/config/cuentas-contables
POST   /api/config/cuentas-contables
GET    /api/config/centros-costo
POST   /api/config/centros-costo
GET    /api/config/formas-pago
POST   /api/config/formas-pago
GET    /api/config/sistemas-destino
```

## Auditoría
```
GET    /api/auditoria?entidad=&entidadId=&usuario=&fechaDesde=&fechaHasta=
```

Todos los listados (`GET` de colección) soportan paginación (`page`, `pageSize`) y devuelven `{ data, total, page, pageSize }`. Las rutas de escritura devuelven el recurso actualizado, no solo un status.
