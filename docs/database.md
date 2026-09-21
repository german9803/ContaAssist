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
| tipo_documento | VARCHAR(30) | NOT NULL — `FACTURA_COMPRA`,`FACTURA_VENTA`,`NOTA_CREDITO`,`NOTA_DEBITO`,`EXTRACTO_BANCARIO`,`OTRO` |
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
Líneas del documento (ítems/productos/servicios). Implementada en Fase 14: `bodega_id`, `porcentaje_iva` y `descuento` son extensiones sobre la spec original, evidenciadas por el formato real de WordOffice (compras/ventas se importan como movimiento de inventario por línea, no como asiento contable de cabecera — ver `transformation-engine.md`).

| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| documento_id | UUID | FK → documentos.id, NOT NULL |
| producto_id | UUID | FK → productos.id, NULL |
| bodega_id | UUID | FK → bodegas.id, NULL |
| descripcion | VARCHAR(300) | NOT NULL |
| cantidad | DECIMAL(18,4) | NOT NULL DEFAULT 1 |
| valor_unitario | DECIMAL(18,4) | NOT NULL |
| subtotal_linea | DECIMAL(18,2) | NOT NULL |
| porcentaje_iva | DECIMAL(6,3) | NULL |
| descuento | DECIMAL(18,2) | NULL |
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
| naturaleza | VARCHAR(10) | NOT NULL — `DEBITO`,`CREDITO` |
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
`unidad_medida` es una extensión de Fase 14 (WordOffice exige unidad de medida por línea de producto).

| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| codigo | VARCHAR(30) | NULL |
| nombre | VARCHAR(200) | NOT NULL |
| unidad_medida | VARCHAR(20) | NULL |
| cuenta_contable_id | UUID | FK → cuentas_contables.id, NULL |
| activo | BOOLEAN | NOT NULL DEFAULT 1 |

Índice único: `(empresa_id, codigo)` cuando `codigo` no es NULL.

### bodegas (catálogo, Fase 14 — no estaba en el diseño original)
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| codigo | VARCHAR(20) | NOT NULL |
| nombre | VARCHAR(150) | NOT NULL |
| activa | BOOLEAN | NOT NULL DEFAULT 1 |

Índice único: `(empresa_id, codigo)`.

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

### mapeo_productos (Fase 14)
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| sistema_destino_id | INT | FK → sistemas_destino.id |
| producto_id | UUID | FK → productos.id |
| codigo_destino | VARCHAR(50) | NOT NULL |

Índice único: `(empresa_id, sistema_destino_id, producto_id)`.

### mapeo_bodegas (Fase 14)
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| sistema_destino_id | INT | FK → sistemas_destino.id |
| bodega_id | UUID | FK → bodegas.id |
| codigo_destino | VARCHAR(50) | NOT NULL |

Índice único: `(empresa_id, sistema_destino_id, bodega_id)`.

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

## 10. Tesorería — pagos, recaudos y cuentas bancarias (Fase 15, parcial)

Cartera y Cuentas por pagar son el mismo concepto con dirección opuesta (dinero que entra vs. que sale) — una sola tabla `pagos` con un campo `tipo`, igual que `documentos.tipo_documento` unifica compras/ventas. El saldo pendiente de un documento **no se guarda como columna**: se calcula en el service como `documento.total - Σ(valor_aplicado de pagos con estado REGISTRADO)`, para que nunca se desincronice. `cuentas_bancarias` (segunda pasada de Fase 15) es solo el catálogo + vínculo opcional con `pagos`, mismo criterio de saldo calculado. Extractos bancarios e importación/conciliación quedan pendientes.

### cuentas_bancarias
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| banco | VARCHAR(100) | NOT NULL |
| numero_cuenta | VARCHAR(30) | NOT NULL |
| tipo_cuenta | VARCHAR(20) | NOT NULL — `AHORROS`, `CORRIENTE` |
| saldo_inicial | DECIMAL(18,2) | NOT NULL DEFAULT 0 |
| moneda | CHAR(3) | NOT NULL DEFAULT 'COP' |
| activa | BOOLEAN | NOT NULL DEFAULT 1 |
| creado_en | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Índice único: `(empresa_id, banco, numero_cuenta)`. Saldo actual = `saldo_inicial + Σ(valor de pagos REGISTRADO de esa cuenta, RECAUDO suma, PAGO resta)` — calculado, no almacenado.

### pagos
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| usuario_id | UUID | FK → usuarios.id |
| tipo | VARCHAR(10) | NOT NULL — `PAGO` (a proveedor), `RECAUDO` (de cliente) |
| tercero_id | UUID | FK → terceros.id, NOT NULL |
| fecha | DATE | NOT NULL |
| valor | DECIMAL(18,2) | NOT NULL — debe ser igual a la suma de `pago_documentos.valor_aplicado` |
| forma_pago_id | UUID | FK → formas_pago.id, NULL |
| cuenta_bancaria_id | UUID | FK → cuentas_bancarias.id, NULL |
| observaciones | VARCHAR(1000) | NULL |
| estado | VARCHAR(20) | NOT NULL — `REGISTRADO`, `ANULADO` |
| creado_en | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Índice: `(empresa_id, tipo, fecha DESC)`.

### pago_documentos (detalle N:N)
| Campo | Tipo | Restricción |
|---|---|---|
| pago_id | UUID | PK compuesta, FK → pagos.id |
| documento_id | UUID | PK compuesta, FK → documentos.id |
| valor_aplicado | DECIMAL(18,2) | NOT NULL |

### Reglas de negocio (aplicadas en el service, no en el motor de validación de documentos)
- `tercero_id` del pago debe coincidir con el `tercero_id` de cada documento aplicado.
- `tipo=PAGO` solo aplica a documentos `FACTURA_COMPRA`; `tipo=RECAUDO` solo a `FACTURA_VENTA`.
- Documento elegible: `estado` en `APROBADO`/`LISTO_PARA_EXPORTAR`/`EXPORTADO`.
- Σ(`valor_aplicado`) de un pago debe ser exactamente igual a `pagos.valor` (tolerancia de redondeo: 1 peso).
- Lo aplicado a un documento (sumando todos los pagos `REGISTRADO`) nunca puede superar `documento.total`.
- Anular un pago es un soft-delete (`estado→ANULADO`): no se borra `pago_documentos`, solo deja de contar en el saldo.

### extractos
Un extracto importado (plantilla propia de ContaAssist — cada banco tiene la suya, no hay una que "adivinar" sin arriesgarse a leer mal los datos, mismo criterio que la plantilla CSV/XLSX de documentos de Fase 7).

| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id |
| cuenta_bancaria_id | UUID | FK → cuentas_bancarias.id, NOT NULL |
| periodo_inicio | DATE | NOT NULL — mínimo de `fecha` entre las líneas importadas |
| periodo_fin | DATE | NOT NULL — máximo de `fecha` entre las líneas importadas |
| cantidad_lineas | INT | NOT NULL |
| creado_en | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Índice: `(empresa_id, cuenta_bancaria_id, creado_en DESC)`.

### extracto_lineas
| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| extracto_id | UUID | FK → extractos.id, NOT NULL |
| fecha | DATE | NOT NULL |
| descripcion | VARCHAR(300) | NOT NULL |
| debito | DECIMAL(18,2) | NOT NULL DEFAULT 0 |
| credito | DECIMAL(18,2) | NOT NULL DEFAULT 0 — una línea tiene débito o crédito, nunca ambos ni ninguno |
| pago_id | UUID | FK → pagos.id, NULL |

Índice: `(extracto_id)`. `conciliado` no es una columna — una línea está conciliada cuando `pago_id` no es NULL (calculado, mismo criterio que el saldo de cuenta/documento).

### Conciliación (reglas de negocio)
- El sistema solo **sugiere** candidatos (mismo `cuenta_bancaria_id`, tipo de pago correcto según el lado del movimiento — débito↔`PAGO`, crédito↔`RECAUDO` —, sin conciliar todavía, valor con tolerancia de 1 peso, fecha con tolerancia de 5 días). El usuario siempre confirma manualmente — nunca se concilia automáticamente.
- Un pago solo puede conciliarse con una línea de extracto a la vez.
- Desconciliar es reversible: solo pone `pago_id = NULL`, no borra la línea.

## Relaciones clave (resumen)

```
empresas 1─N usuario_empresa_rol N─1 usuarios
empresas 1─N terceros
empresas 1─N cargas 1─N archivos_origen 1─N documentos
documentos 1─N documento_detalles N─1 productos, bodegas, cuentas_contables, centros_costo
documentos 1─N documento_impuestos, documento_retenciones, documento_validaciones
documentos N─1 terceros, cuentas_contables, centros_costo, formas_pago
empresas 1─N mapeo_cuentas / mapeo_terceros / mapeo_formas_pago / mapeo_productos / mapeo_bodegas N─1 sistemas_destino
exportaciones N─N documentos (vía exportacion_documentos)
pagos N─1 terceros, formas_pago, cuentas_bancarias; pagos N─N documentos (vía pago_documentos)
cuentas_bancarias 1─N extractos 1─N extracto_lineas N─1 pagos (conciliación, opcional)
```

## Notas de implementación (Prisma)

- Multiempresa se refuerza con un middleware de Prisma o de servicio que inyecta `empresa_id` en cada `where`, nunca confiando en el filtro que envía el frontend.
- Los catálogos globales (`impuestos`, `retenciones`, `roles`, `permisos`, `sistemas_destino`) no llevan `empresa_id`; los catálogos configurables por empresa (`cuentas_contables`, `centros_costo`, `formas_pago`, `productos`, `bodegas`) sí.
- `documento_validaciones` y `auditoria` son append-only (no se actualizan ni eliminan registros).
- `gen_random_uuid()` es nativa de PostgreSQL 13+ (no requiere la extensión `pgcrypto`).
- Los modelos de `empresas`, `roles`, `permisos`, `rol_permisos`, `usuarios` y `usuario_empresa_rol` ya están implementados en `backend/prisma/schema.prisma` (Fases 3-4, con la unicidad de `usuario_empresa_rol` corregida a `(usuario, empresa)`); `cargas`/`archivos_origen`/`auditoria` desde Fase 6; `terceros`, `documentos`, `impuestos` e `documento_impuestos` desde Fase 7 (`terceros` con su API/UI completa desde Fase 10: crear/editar/buscar, DV de NIT auto-calculado); `reglas_validacion` y `documento_validaciones` desde Fase 8, con las 10 reglas de `validation-engine.md` implementadas (las últimas 3 desde Fase 11); `cuentas_contables`, `centros_costo`, `formas_pago`, `sistemas_destino`, `mapeo_cuentas`, `mapeo_terceros` y `mapeo_formas_pago` desde Fase 11, junto con las FK de `documentos` a `cuenta_contable`/`centro_costo`/`forma_pago` (nullables, asignación opcional en revisión); `exportaciones`/`exportacion_documentos` desde Fase 13; `productos`, `bodegas`, `documento_detalles`, `mapeo_productos` y `mapeo_bodegas` desde Fase 14 (requeridos por el adaptador real de WordOffice — resuelve la cuenta contable desde el producto, no desde un asiento de cabecera); `pagos`/`pago_documentos` desde Fase 15 (parcial — Cartera y Cuentas por pagar; el saldo pendiente se calcula, no se guarda); `cuentas_bancarias` desde la segunda pasada de Fase 15 (catálogo + vínculo opcional con `pagos`, mismo criterio de saldo calculado); `extractos`/`extracto_lineas` desde la tercera pasada de Fase 15 (importación con plantilla propia + conciliación sugerida, nunca automática) — sigue sin existir `retenciones`/`documento_retenciones`, que dependen de fases posteriores.
