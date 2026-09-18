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
GET    /api/terceros?tipo=&q=&page=
POST   /api/terceros
GET    /api/terceros/:id
PATCH  /api/terceros/:id
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
```

## Exportaciones
```
POST   /api/exportaciones/preview       (valida y devuelve resumen: ✓/⚠, sin generar archivo)
POST   /api/exportaciones                (genera el archivo)
GET    /api/exportaciones?empresa=&page=
GET    /api/exportaciones/:id
GET    /api/exportaciones/:id/descargar
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
