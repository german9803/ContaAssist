# API — endpoints principales

REST sobre Express. Todas las rutas (excepto auth) requieren JWT y resuelven `empresa_id` desde el token o desde un header `X-Empresa-Id` validado contra `usuario_empresa_rol` — nunca desde un parámetro que el cliente pueda alterar libremente sin verificación.

## Autenticación
```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
```

## Empresas y usuarios
```
GET    /api/empresas                    (empresas del usuario autenticado)
POST   /api/empresas                    (ADMINISTRADOR)
GET    /api/empresas/:id
PATCH  /api/empresas/:id

GET    /api/empresas/:id/usuarios
POST   /api/empresas/:id/usuarios       (invitar/crear usuario con rol)
PATCH  /api/empresas/:id/usuarios/:usuarioId   (cambiar rol/activo)
```

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
GET    /api/documentos?estado=&tipo=&tercero=&fechaDesde=&fechaHasta=&page=
GET    /api/documentos/:id              (incluye detalles, impuestos, retenciones, validaciones)
PATCH  /api/documentos/:id              (edición en revisión)
POST   /api/documentos/:id/aprobar
POST   /api/documentos/:id/rechazar
GET    /api/documentos/:id/archivo-original   (stream del PDF/imagen para el panel de revisión)
POST   /api/documentos/:id/revalidar
```

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
