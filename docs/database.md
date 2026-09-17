# Modelo de datos — SQL Server

Convenciones: PK `UNIQUEIDENTIFIER DEFAULT NEWID()` en entidades de negocio (permite generación distribuida y evita colisiones al integrar orígenes externos); `INT IDENTITY` en catálogos pequeños. Timestamps `DATETIME2`. Dinero `DECIMAL(18,2)`. Todo texto libre `NVARCHAR` (soporte Unicode). Toda tabla de negocio incluye `empresa_id` para aislamiento multiempresa, `creado_en`, `creado_por`, `actualizado_en`, `actualizado_por`.

## 1. Seguridad y organización

### empresas
| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| nit | NVARCHAR(20) | UNIQUE, NOT NULL |
| razon_social | NVARCHAR(200) | NOT NULL |
| nombre_comercial | NVARCHAR(200) | NULL |
| activa | BIT | NOT NULL DEFAULT 1 |
| creado_en | DATETIME2 | NOT NULL DEFAULT SYSUTCDATETIME() |

### roles
| Campo | Tipo | Restricción |
|---|---|---|
| id | INT IDENTITY | PK |
| codigo | NVARCHAR(30) | UNIQUE, NOT NULL — `ADMINISTRADOR`, `AUXILIAR_CONTABLE`, `CONTADOR`, `CONSULTA` |
| nombre | NVARCHAR(60) | NOT NULL |

### permisos
| Campo | Tipo | Restricción |
|---|---|---|
| id | INT IDENTITY | PK |
| codigo | NVARCHAR(60) | UNIQUE, NOT NULL — ej. `documento.aprobar`, `exportacion.generar` |
| modulo | NVARCHAR(40) | NOT NULL |

Diseñada desde ya para permisos granulares por rol (sección 9: "diseñar para permisos más específicos posteriormente"), sin implementar UI de permisos en Fase 1.

### rol_permisos
| Campo | Tipo | Restricción |
|---|---|---|
| rol_id | INT | PK compuesta, FK → roles.id |
| permiso_id | INT | PK compuesta, FK → permisos.id |

### usuarios
| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| email | NVARCHAR(150) | UNIQUE, NOT NULL |
| password_hash | NVARCHAR(200) | NOT NULL (bcrypt) |
| nombre_completo | NVARCHAR(150) | NOT NULL |
| activo | BIT | NOT NULL DEFAULT 1 |
| ultimo_login | DATETIME2 | NULL |
| creado_en | DATETIME2 | NOT NULL DEFAULT SYSUTCDATETIME() |

Un usuario puede pertenecer a varias empresas con distinto rol en cada una (típico de un auxiliar que atiende varios clientes) →

### usuario_empresa_rol
| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| usuario_id | UNIQUEIDENTIFIER | FK → usuarios.id |
| empresa_id | UNIQUEIDENTIFIER | FK → empresas.id |
| rol_id | INT | FK → roles.id |
| activo | BIT | NOT NULL DEFAULT 1 |

Índice único: `(usuario_id, empresa_id, rol_id)`. Índice: `(empresa_id, usuario_id)` para listar usuarios por empresa.

## 2. Terceros

### terceros
| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| empresa_id | UNIQUEIDENTIFIER | FK → empresas.id, NOT NULL |
| tipo_identificacion | NVARCHAR(10) | NOT NULL — `NIT`, `CC`, `CE`, `PAS` |
| identificacion | NVARCHAR(20) | NOT NULL |
| dv | CHAR(1) | NULL (dígito de verificación NIT) |
| razon_social | NVARCHAR(200) | NOT NULL |
| tipo_tercero | NVARCHAR(20) | NOT NULL — `CLIENTE`, `PROVEEDOR`, `AMBOS`, `OTRO` |
| email | NVARCHAR(150) | NULL |
| telefono | NVARCHAR(30) | NULL |
| ciudad | NVARCHAR(80) | NULL |
| activo | BIT | NOT NULL DEFAULT 1 |

Índice único: `(empresa_id, tipo_identificacion, identificacion)`. Índice: `(empresa_id, tipo_tercero)`.

## 3. Ingesta y archivos

### cargas
Registro de cada lote subido al Centro de Carga (sección 11).

| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| empresa_id | UNIQUEIDENTIFIER | FK → empresas.id |
| usuario_id | UNIQUEIDENTIFIER | FK → usuarios.id |
| tipo_origen | NVARCHAR(20) | NOT NULL — `PDF`,`XML`,`XLSX`,`XLS`,`CSV`,`JPG`,`PNG` |
| cantidad_archivos | INT | NOT NULL |
| estado | NVARCHAR(30) | NOT NULL — ver `data-flow.md` |
| iniciado_en | DATETIME2 | NOT NULL DEFAULT SYSUTCDATETIME() |
| finalizado_en | DATETIME2 | NULL |

Índice: `(empresa_id, iniciado_en DESC)` para dashboard/historial.

### archivos_origen
Cada archivo físico recibido, ligado a una carga.

| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| carga_id | UNIQUEIDENTIFIER | FK → cargas.id |
| empresa_id | UNIQUEIDENTIFIER | FK → empresas.id |
| nombre_original | NVARCHAR(260) | NOT NULL |
| extension | NVARCHAR(10) | NOT NULL |
| tamano_bytes | BIGINT | NOT NULL |
| hash_sha256 | CHAR(64) | NOT NULL — usado para detectar archivo duplicado |
| ruta_almacenamiento | NVARCHAR(400) | NOT NULL |
| estado | NVARCHAR(30) | NOT NULL — `RECIBIDO`,`PROCESANDO`,`PROCESADO`,`ERROR` |
| mensaje_error | NVARCHAR(1000) | NULL |

Índice único: `(empresa_id, hash_sha256)` — soporta la detección de archivos duplicados.

## 4. Documentos (núcleo del modelo interno)

### documentos
Representa cualquier documento contable normalizado (factura de compra, de venta, nota, extracto, etc.), independiente del sistema destino.

| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| empresa_id | UNIQUEIDENTIFIER | FK → empresas.id, NOT NULL |
| archivo_origen_id | UNIQUEIDENTIFIER | FK → archivos_origen.id, NULL (NULL si es entrada manual) |
| tipo_documento | NVARCHAR(30) | NOT NULL — `FACTURA_COMPRA`,`FACTURA_VENTA`,`NOTA_CREDITO`,`NOTA_DEBITO`,`EXTRACTO_BANCARIO`,`OTRO` |
| numero_documento | NVARCHAR(50) | NULL (puede llegar vacío hasta extracción) |
| prefijo | NVARCHAR(10) | NULL |
| fecha_emision | DATE | NULL |
| fecha_vencimiento | DATE | NULL |
| tercero_id | UNIQUEIDENTIFIER | FK → terceros.id, NULL hasta identificar el tercero |
| subtotal | DECIMAL(18,2) | NULL |
| total_impuestos | DECIMAL(18,2) | NULL |
| total_retenciones | DECIMAL(18,2) | NULL |
| total | DECIMAL(18,2) | NULL |
| moneda | CHAR(3) | NOT NULL DEFAULT 'COP' |
| cuenta_contable_id | UNIQUEIDENTIFIER | FK → cuentas_contables.id, NULL (sugerida o asignada en revisión) |
| centro_costo_id | UNIQUEIDENTIFIER | FK → centros_costo.id, NULL |
| forma_pago_id | UNIQUEIDENTIFIER | FK → formas_pago.id, NULL |
| estado | NVARCHAR(30) | NOT NULL — ver estados en `data-flow.md` |
| es_duplicado_de | UNIQUEIDENTIFIER | FK → documentos.id, NULL |
| observaciones | NVARCHAR(1000) | NULL |
| creado_en | DATETIME2 | NOT NULL DEFAULT SYSUTCDATETIME() |

Índice: `(empresa_id, estado)`. Índice: `(empresa_id, tercero_id)`. Índice único condicional (recomendado a nivel de aplicación, no solo BD): `(empresa_id, tercero_id, numero_documento, tipo_documento)` para apoyar la detección de duplicados.

### documento_detalles
Líneas del documento (ítems/productos/servicios).

| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| documento_id | UNIQUEIDENTIFIER | FK → documentos.id, NOT NULL |
| producto_id | UNIQUEIDENTIFIER | FK → productos.id, NULL |
| descripcion | NVARCHAR(300) | NOT NULL |
| cantidad | DECIMAL(18,4) | NOT NULL DEFAULT 1 |
| valor_unitario | DECIMAL(18,4) | NOT NULL |
| subtotal_linea | DECIMAL(18,2) | NOT NULL |
| cuenta_contable_id | UNIQUEIDENTIFIER | FK → cuentas_contables.id, NULL |
| centro_costo_id | UNIQUEIDENTIFIER | FK → centros_costo.id, NULL |

Índice: `(documento_id)`.

### impuestos (catálogo)
| Campo | Tipo | Restricción |
|---|---|---|
| id | INT IDENTITY | PK |
| codigo | NVARCHAR(20) | UNIQUE, NOT NULL — `IVA_19`,`IVA_5`,`INC`, etc. |
| nombre | NVARCHAR(60) | NOT NULL |
| porcentaje | DECIMAL(6,3) | NOT NULL |

### documento_impuestos
| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| documento_id | UNIQUEIDENTIFIER | FK → documentos.id |
| impuesto_id | INT | FK → impuestos.id |
| base | DECIMAL(18,2) | NOT NULL |
| valor | DECIMAL(18,2) | NOT NULL |

### retenciones (catálogo)
| Campo | Tipo | Restricción |
|---|---|---|
| id | INT IDENTITY | PK |
| codigo | NVARCHAR(20) | UNIQUE, NOT NULL — `RETEFUENTE`,`RETEICA`,`RETEIVA` |
| nombre | NVARCHAR(60) | NOT NULL |
| porcentaje | DECIMAL(6,3) | NOT NULL |

### documento_retenciones
| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| documento_id | UNIQUEIDENTIFIER | FK → documentos.id |
| retencion_id | INT | FK → retenciones.id |
| base | DECIMAL(18,2) | NOT NULL |
| valor | DECIMAL(18,2) | NOT NULL |

## 5. Catálogos contables internos

### cuentas_contables
| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| empresa_id | UNIQUEIDENTIFIER | FK → empresas.id |
| codigo | NVARCHAR(20) | NOT NULL |
| nombre | NVARCHAR(150) | NOT NULL |
| naturaleza | NVARCHAR(10) | NOT NULL — `DEBITO`,`CREDITO` |
| activa | BIT | NOT NULL DEFAULT 1 |

Índice único: `(empresa_id, codigo)`.

### centros_costo
| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| empresa_id | UNIQUEIDENTIFIER | FK → empresas.id |
| codigo | NVARCHAR(20) | NOT NULL |
| nombre | NVARCHAR(150) | NOT NULL |
| activo | BIT | NOT NULL DEFAULT 1 |

Índice único: `(empresa_id, codigo)`.

### formas_pago
| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| empresa_id | UNIQUEIDENTIFIER | FK → empresas.id |
| codigo | NVARCHAR(20) | NOT NULL |
| nombre | NVARCHAR(80) | NOT NULL |

### productos
| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| empresa_id | UNIQUEIDENTIFIER | FK → empresas.id |
| codigo | NVARCHAR(30) | NULL |
| nombre | NVARCHAR(200) | NOT NULL |
| cuenta_contable_id | UNIQUEIDENTIFIER | FK → cuentas_contables.id, NULL |
| activo | BIT | NOT NULL DEFAULT 1 |

## 6. Mapeo (equivalencias, sección 15)

### sistemas_destino (catálogo)
| Campo | Tipo | Restricción |
|---|---|---|
| id | INT IDENTITY | PK |
| codigo | NVARCHAR(30) | UNIQUE, NOT NULL — `WORDOFFICE`,`SIIGO`,`EXCEL`,`CSV` |
| nombre | NVARCHAR(80) | NOT NULL |
| version_formato_actual | NVARCHAR(20) | NULL |

### mapeo_cuentas
| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| empresa_id | UNIQUEIDENTIFIER | FK → empresas.id |
| sistema_destino_id | INT | FK → sistemas_destino.id |
| cuenta_contable_id | UNIQUEIDENTIFIER | FK → cuentas_contables.id |
| codigo_destino | NVARCHAR(50) | NOT NULL |

Índice único: `(empresa_id, sistema_destino_id, cuenta_contable_id)`.

### mapeo_terceros
| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| empresa_id | UNIQUEIDENTIFIER | FK → empresas.id |
| sistema_destino_id | INT | FK → sistemas_destino.id |
| tercero_id | UNIQUEIDENTIFIER | FK → terceros.id |
| codigo_destino | NVARCHAR(50) | NOT NULL |

Índice único: `(empresa_id, sistema_destino_id, tercero_id)`.

### mapeo_formas_pago
| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| empresa_id | UNIQUEIDENTIFIER | FK → empresas.id |
| sistema_destino_id | INT | FK → sistemas_destino.id |
| forma_pago_id | UNIQUEIDENTIFIER | FK → formas_pago.id |
| codigo_destino | NVARCHAR(50) | NOT NULL |

Índice único: `(empresa_id, sistema_destino_id, forma_pago_id)`.

## 7. Validación (sección 13)

### reglas_validacion (catálogo, referencia al código del validador)
| Campo | Tipo | Restricción |
|---|---|---|
| id | INT IDENTITY | PK |
| codigo | NVARCHAR(60) | UNIQUE, NOT NULL — ej. `DUPLICADO_DOCUMENTO`, `NIT_INVALIDO`, `TOTAL_DESCUADRADO` |
| descripcion | NVARCHAR(300) | NOT NULL |
| severidad | NVARCHAR(20) | NOT NULL — `BLOQUEANTE`,`ADVERTENCIA` |
| activa | BIT | NOT NULL DEFAULT 1 |

### documento_validaciones (resultado de ejecutar reglas sobre un documento)
| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| documento_id | UNIQUEIDENTIFIER | FK → documentos.id |
| regla_id | INT | FK → reglas_validacion.id |
| resultado | NVARCHAR(20) | NOT NULL — `OK`,`FALLA` |
| mensaje | NVARCHAR(500) | NULL |
| evaluado_en | DATETIME2 | NOT NULL DEFAULT SYSUTCDATETIME() |

Índice: `(documento_id)`.

## 8. Exportación (secciones 16-17)

### exportaciones
| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| empresa_id | UNIQUEIDENTIFIER | FK → empresas.id |
| usuario_id | UNIQUEIDENTIFIER | FK → usuarios.id |
| sistema_destino_id | INT | FK → sistemas_destino.id |
| tipo_informacion | NVARCHAR(30) | NOT NULL — `COMPRAS`,`VENTAS`,`BANCOS`, etc. |
| periodo_inicio | DATE | NOT NULL |
| periodo_fin | DATE | NOT NULL |
| version_formato | NVARCHAR(20) | NOT NULL |
| cantidad_documentos | INT | NOT NULL |
| ruta_archivo_generado | NVARCHAR(400) | NULL |
| estado | NVARCHAR(30) | NOT NULL — `GENERADA`,`ERROR` |
| creado_en | DATETIME2 | NOT NULL DEFAULT SYSUTCDATETIME() |

Índice: `(empresa_id, creado_en DESC)`.

### exportacion_documentos (detalle N:N)
| Campo | Tipo | Restricción |
|---|---|---|
| exportacion_id | UNIQUEIDENTIFIER | PK compuesta, FK → exportaciones.id |
| documento_id | UNIQUEIDENTIFIER | PK compuesta, FK → documentos.id |

## 9. Auditoría (sección 23)

### auditoria
| Campo | Tipo | Restricción |
|---|---|---|
| id | UNIQUEIDENTIFIER | PK |
| empresa_id | UNIQUEIDENTIFIER | FK → empresas.id |
| usuario_id | UNIQUEIDENTIFIER | FK → usuarios.id |
| accion | NVARCHAR(60) | NOT NULL — ej. `MODIFICAR_DOCUMENTO`,`APROBAR_DOCUMENTO`,`GENERAR_EXPORTACION` |
| entidad | NVARCHAR(60) | NOT NULL — ej. `documento` |
| entidad_id | UNIQUEIDENTIFIER | NULL |
| campo | NVARCHAR(60) | NULL |
| valor_anterior | NVARCHAR(MAX) | NULL |
| valor_nuevo | NVARCHAR(MAX) | NULL |
| creado_en | DATETIME2 | NOT NULL DEFAULT SYSUTCDATETIME() |

Índice: `(empresa_id, creado_en DESC)`. Índice: `(entidad, entidad_id)`.

## Relaciones clave (resumen)

```
empresas 1─N usuario_empresa_rol N─1 usuarios
empresas 1─N terceros
empresas 1─N cargas 1─N archivos_origen 1─N documentos
documentos 1─N documento_detalles
documentos 1─N documento_impuestos, documento_retenciones, documento_validaciones
documentos N─1 terceros, cuentas_contables, centros_costo, formas_pago
empresas 1─N mapeo_cuentas / mapeo_terceros / mapeo_formas_pago N─1 sistemas_destino
exportaciones N─N documentos (vía exportacion_documentos)
```

## Notas de implementación (Prisma)

- Multiempresa se refuerza con un middleware de Prisma o de servicio que inyecta `empresa_id` en cada `where`, nunca confiando en el filtro que envía el frontend.
- Los catálogos globales (`impuestos`, `retenciones`, `roles`, `permisos`, `sistemas_destino`) no llevan `empresa_id`; los catálogos configurables por empresa (`cuentas_contables`, `centros_costo`, `formas_pago`) sí.
- `documento_validaciones` y `auditoria` son append-only (no se actualizan ni eliminan registros).
