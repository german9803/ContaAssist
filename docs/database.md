# Modelo de datos — PostgreSQL

> **Cambio de motor (2026-09-17):** el diseño original de este documento usaba SQL Server (sección 20 del brief inicial). Se migró a PostgreSQL por ser un motor sin dependencia de Docker/GUI en macOS (instalación nativa vía Homebrew), con el conector de Prisma más maduro y soporte nativo de `UUID`/`JSONB`. WordOffice/Siigo no comparten base de datos con ContaAssist (la integración es por archivo exportado), así que el motor interno es una decisión libre. El modelo relacional (entidades, FKs, índices) no cambió — solo los tipos físicos.

Convenciones: PK `UUID DEFAULT gen_random_uuid()` en entidades de negocio (permite generación distribuida y evita colisiones al integrar orígenes externos); `SERIAL` en catálogos pequeños. Timestamps `TIMESTAMPTZ`. Dinero `DECIMAL(18,2)`. Todo texto libre `VARCHAR`/`TEXT` (UTF-8 nativo). Toda tabla de negocio incluye `empresa_id` para aislamiento multiempresa, `creado_en`, `creado_por`, `actualizado_en`, `actualizado_por`.

## 1. Seguridad y organización

### empresas
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| nit | VARCHAR(20) | UNIQUE, NOT NULL |
| razon_social | VARCHAR(200) | NOT NULL |
| nombre_comercial | VARCHAR(200) | NULL |
| activa | BOOLEAN | NOT NULL DEFAULT 1 |
| creado_en | TIMESTAMPTZ | NOT NULL DEFAULT now() |

### roles
| Campo | Tipo | Restricción |
|---|---|---|
| id | SERIAL | PK |
| codigo | VARCHAR(30) | UNIQUE, NOT NULL — `ADMINISTRADOR`, `AUXILIAR_CONTABLE`, `CONTADOR`, `CONSULTA` |
| nombre | VARCHAR(60) | NOT NULL |

### permisos
| Campo | Tipo | Restricción |
|---|---|---|
| id | SERIAL | PK |
| codigo | VARCHAR(60) | UNIQUE, NOT NULL — ej. `documento.aprobar`, `exportacion.generar` |
| modulo | VARCHAR(40) | NOT NULL |

Diseñada desde ya para permisos granulares por rol (sección 9: "diseñar para permisos más específicos posteriormente"), sin implementar UI de permisos en Fase 1.

### rol_permisos
| Campo | Tipo | Restricción |
|---|---|---|
| rol_id | INT | PK compuesta, FK → roles.id |
| permiso_id | INT | PK compuesta, FK → permisos.id |

### usuarios
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| email | VARCHAR(150) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(200) | NOT NULL (bcrypt) |
| nombre_completo | VARCHAR(150) | NOT NULL |
| activo | BOOLEAN | NOT NULL DEFAULT 1 |
| ultimo_login | TIMESTAMPTZ | NULL |
| creado_en | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Un usuario puede pertenecer a varias empresas con distinto rol en cada una (típico de un auxiliar que atiende varios clientes) →

### usuario_empresa_rol
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| usuario_id | UUID | FK → usuarios.id |
| empresa_id | UUID | FK → empresas.id |
| rol_id | INT | FK → roles.id |
| activo | BOOLEAN | NOT NULL DEFAULT 1 |

Índice único: `(usuario_id, empresa_id, rol_id)`. Índice: `(empresa_id, usuario_id)` para listar usuarios por empresa.

## 2. Terceros

### terceros
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id, NOT NULL |
| tipo_identificacion | VARCHAR(10) | NOT NULL — `NIT`, `CC`, `CE`, `PAS` |
| identificacion | VARCHAR(20) | NOT NULL |
| dv | CHAR(1) | NULL (dígito de verificación NIT) |
| razon_social | VARCHAR(200) | NOT NULL |
| tipo_tercero | VARCHAR(20) | NOT NULL — `CLIENTE`, `PROVEEDOR`, `AMBOS`, `OTRO` |
| email | VARCHAR(150) | NULL |
| telefono | VARCHAR(30) | NULL |
| ciudad | VARCHAR(80) | NULL |
| activo | BOOLEAN | NOT NULL DEFAULT 1 |

Índice único: `(empresa_id, tipo_identificacion, identificacion)`. Índice: `(empresa_id, tipo_tercero)`.

## 3. Ingesta y archivos

### cargas
Registro de cada lote subido al Centro de Carga (sección 11).

| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| usuario_id | UUID | FK → usuarios.id |
| tipo_origen | VARCHAR(20) | NOT NULL — `PDF`,`XML`,`XLSX`,`XLS`,`CSV`,`JPG`,`PNG` |
| cantidad_archivos | INT | NOT NULL |
| estado | VARCHAR(30) | NOT NULL — ver `data-flow.md` |
| iniciado_en | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| finalizado_en | TIMESTAMPTZ | NULL |

Índice: `(empresa_id, iniciado_en DESC)` para dashboard/historial.

### archivos_origen
Cada archivo físico recibido, ligado a una carga.

| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| carga_id | UUID | FK → cargas.id |
| empresa_id | UUID | FK → empresas.id |
| nombre_original | VARCHAR(260) | NOT NULL |
| extension | VARCHAR(10) | NOT NULL |
| tamano_bytes | BIGINT | NOT NULL |
| hash_sha256 | CHAR(64) | NOT NULL — usado para detectar archivo duplicado |
| ruta_almacenamiento | VARCHAR(400) | NOT NULL |
| estado | VARCHAR(30) | NOT NULL — `RECIBIDO`,`PROCESANDO`,`PROCESADO`,`ERROR` |
| mensaje_error | VARCHAR(1000) | NULL |

Índice único: `(empresa_id, hash_sha256)` — soporta la detección de archivos duplicados.

## 4. Documentos (núcleo del modelo interno)

### documentos
Representa cualquier documento contable normalizado (factura de compra, de venta, nota, extracto, etc.), independiente del sistema destino.

| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id, NOT NULL |
| archivo_origen_id | UUID | FK → archivos_origen.id, NULL (NULL si es entrada manual) |
| tipo_documento | VARCHAR(30) | NOT NULL — `FACTURA_COMPRA`,`FACTURA_VENTA`,`NOTA_CREDITO`,`NOTA_DEBOOLEANO`,`EXTRACTO_BANCARIO`,`OTRO` |
| numero_documento | VARCHAR(50) | NULL (puede llegar vacío hasta extracción) |
| prefijo | VARCHAR(10) | NULL |
| fecha_emision | DATE | NULL |
| fecha_vencimiento | DATE | NULL |
| tercero_id | UUID | FK → terceros.id, NULL hasta identificar el tercero |
| subtotal | DECIMAL(18,2) | NULL |
| total_impuestos | DECIMAL(18,2) | NULL |
| total_retenciones | DECIMAL(18,2) | NULL |
| total | DECIMAL(18,2) | NULL |
| moneda | CHAR(3) | NOT NULL DEFAULT 'COP' |
| cuenta_contable_id | UUID | FK → cuentas_contables.id, NULL (sugerida o asignada en revisión) |
| centro_costo_id | UUID | FK → centros_costo.id, NULL |
| forma_pago_id | UUID | FK → formas_pago.id, NULL |
| estado | VARCHAR(30) | NOT NULL — ver estados en `data-flow.md` |
| es_duplicado_de | UUID | FK → documentos.id, NULL |
| observaciones | VARCHAR(1000) | NULL |
| creado_en | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Índice: `(empresa_id, estado)`. Índice: `(empresa_id, tercero_id)`. Índice único condicional (recomendado a nivel de aplicación, no solo BD): `(empresa_id, tercero_id, numero_documento, tipo_documento)` para apoyar la detección de duplicados.

### documento_detalles
Líneas del documento (ítems/productos/servicios).

| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| documento_id | UUID | FK → documentos.id, NOT NULL |
| producto_id | UUID | FK → productos.id, NULL |
| descripcion | VARCHAR(300) | NOT NULL |
| cantidad | DECIMAL(18,4) | NOT NULL DEFAULT 1 |
| valor_unitario | DECIMAL(18,4) | NOT NULL |
| subtotal_linea | DECIMAL(18,2) | NOT NULL |
| cuenta_contable_id | UUID | FK → cuentas_contables.id, NULL |
| centro_costo_id | UUID | FK → centros_costo.id, NULL |

Índice: `(documento_id)`.

### impuestos (catálogo)
| Campo | Tipo | Restricción |
|---|---|---|
| id | SERIAL | PK |
| codigo | VARCHAR(20) | UNIQUE, NOT NULL — `IVA_19`,`IVA_5`,`INC`, etc. |
| nombre | VARCHAR(60) | NOT NULL |
| porcentaje | DECIMAL(6,3) | NOT NULL |

### documento_impuestos
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| documento_id | UUID | FK → documentos.id |
| impuesto_id | INT | FK → impuestos.id |
| base | DECIMAL(18,2) | NOT NULL |
| valor | DECIMAL(18,2) | NOT NULL |

### retenciones (catálogo)
| Campo | Tipo | Restricción |
|---|---|---|
| id | SERIAL | PK |
| codigo | VARCHAR(20) | UNIQUE, NOT NULL — `RETEFUENTE`,`RETEICA`,`RETEIVA` |
| nombre | VARCHAR(60) | NOT NULL |
| porcentaje | DECIMAL(6,3) | NOT NULL |

### documento_retenciones
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| documento_id | UUID | FK → documentos.id |
| retencion_id | INT | FK → retenciones.id |
| base | DECIMAL(18,2) | NOT NULL |
| valor | DECIMAL(18,2) | NOT NULL |

## 5. Catálogos contables internos

### cuentas_contables
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| codigo | VARCHAR(20) | NOT NULL |
| nombre | VARCHAR(150) | NOT NULL |
| naturaleza | VARCHAR(10) | NOT NULL — `DEBOOLEANO`,`CREDITO` |
| activa | BOOLEAN | NOT NULL DEFAULT 1 |

Índice único: `(empresa_id, codigo)`.

### centros_costo
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| codigo | VARCHAR(20) | NOT NULL |
| nombre | VARCHAR(150) | NOT NULL |
| activo | BOOLEAN | NOT NULL DEFAULT 1 |

Índice único: `(empresa_id, codigo)`.

### formas_pago
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| codigo | VARCHAR(20) | NOT NULL |
| nombre | VARCHAR(80) | NOT NULL |

### productos
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| codigo | VARCHAR(30) | NULL |
| nombre | VARCHAR(200) | NOT NULL |
| cuenta_contable_id | UUID | FK → cuentas_contables.id, NULL |
| activo | BOOLEAN | NOT NULL DEFAULT 1 |

## 6. Mapeo (equivalencias, sección 15)

### sistemas_destino (catálogo)
| Campo | Tipo | Restricción |
|---|---|---|
| id | SERIAL | PK |
| codigo | VARCHAR(30) | UNIQUE, NOT NULL — `WORDOFFICE`,`SIIGO`,`EXCEL`,`CSV` |
| nombre | VARCHAR(80) | NOT NULL |
| version_formato_actual | VARCHAR(20) | NULL |

### mapeo_cuentas
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| sistema_destino_id | INT | FK → sistemas_destino.id |
| cuenta_contable_id | UUID | FK → cuentas_contables.id |
| codigo_destino | VARCHAR(50) | NOT NULL |

Índice único: `(empresa_id, sistema_destino_id, cuenta_contable_id)`.

### mapeo_terceros
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| sistema_destino_id | INT | FK → sistemas_destino.id |
| tercero_id | UUID | FK → terceros.id |
| codigo_destino | VARCHAR(50) | NOT NULL |

Índice único: `(empresa_id, sistema_destino_id, tercero_id)`.

### mapeo_formas_pago
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| sistema_destino_id | INT | FK → sistemas_destino.id |
| forma_pago_id | UUID | FK → formas_pago.id |
| codigo_destino | VARCHAR(50) | NOT NULL |

Índice único: `(empresa_id, sistema_destino_id, forma_pago_id)`.

## 7. Validación (sección 13)

### reglas_validacion (catálogo, referencia al código del validador)
| Campo | Tipo | Restricción |
|---|---|---|
| id | SERIAL | PK |
| codigo | VARCHAR(60) | UNIQUE, NOT NULL — ej. `DUPLICADO_DOCUMENTO`, `NIT_INVALIDO`, `TOTAL_DESCUADRADO` |
| descripcion | VARCHAR(300) | NOT NULL |
| severidad | VARCHAR(20) | NOT NULL — `BLOQUEANTE`,`ADVERTENCIA` |
| activa | BOOLEAN | NOT NULL DEFAULT 1 |

### documento_validaciones (resultado de ejecutar reglas sobre un documento)
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| documento_id | UUID | FK → documentos.id |
| regla_id | INT | FK → reglas_validacion.id |
| resultado | VARCHAR(20) | NOT NULL — `OK`,`FALLA` |
| mensaje | VARCHAR(500) | NULL |
| evaluado_en | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Índice: `(documento_id)`.

## 8. Exportación (secciones 16-17)

### exportaciones
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| usuario_id | UUID | FK → usuarios.id |
| sistema_destino_id | INT | FK → sistemas_destino.id |
| tipo_informacion | VARCHAR(30) | NOT NULL — `COMPRAS`,`VENTAS`,`BANCOS`, etc. |
| periodo_inicio | DATE | NOT NULL |
| periodo_fin | DATE | NOT NULL |
| version_formato | VARCHAR(20) | NOT NULL |
| cantidad_documentos | INT | NOT NULL |
| ruta_archivo_generado | VARCHAR(400) | NULL |
| estado | VARCHAR(30) | NOT NULL — `GENERADA`,`ERROR` |
| creado_en | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Índice: `(empresa_id, creado_en DESC)`.

### exportacion_documentos (detalle N:N)
| Campo | Tipo | Restricción |
|---|---|---|
| exportacion_id | UUID | PK compuesta, FK → exportaciones.id |
| documento_id | UUID | PK compuesta, FK → documentos.id |

## 9. Auditoría (sección 23)

### auditoria
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| usuario_id | UUID | FK → usuarios.id |
| accion | VARCHAR(60) | NOT NULL — ej. `MODIFICAR_DOCUMENTO`,`APROBAR_DOCUMENTO`,`GENERAR_EXPORTACION` |
| entidad | VARCHAR(60) | NOT NULL — ej. `documento` |
| entidad_id | UUID | NULL |
| campo | VARCHAR(60) | NULL |
| valor_anterior | TEXT | NULL |
| valor_nuevo | TEXT | NULL |
| creado_en | TIMESTAMPTZ | NOT NULL DEFAULT now() |

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
- `gen_random_uuid()` es nativa de PostgreSQL 13+ (no requiere la extensión `pgcrypto`).
- Los modelos de `empresas`, `roles`, `permisos`, `rol_permisos`, `usuarios` y `usuario_empresa_rol` ya están implementados en `backend/prisma/schema.prisma` (Fases 3-4, con la unicidad de `usuario_empresa_rol` corregida a `(usuario, empresa)`); el resto de tablas de este documento se agregan de forma incremental en las fases correspondientes (terceros en Fase 10, documentos en Fase 7, etc.).
