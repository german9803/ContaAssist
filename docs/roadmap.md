# Roadmap

Cada fase deja una base funcional para la siguiente. No se avanza a la siguiente fase con pruebas pendientes o documentación desactualizada.

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Arquitectura y documentación | **Completa** |
| 2 | Configuración inicial del proyecto (frontend Vite+React+Tailwind, backend Express, Prisma + PostgreSQL, estructura de carpetas) | **Completa** |
| 3 | Autenticación (JWT, login, roles base) | **Completa** — probada de punta a punta contra PostgreSQL local |
| 4 | Empresas, usuarios y roles (multiempresa funcional) | **Completa** — probada de punta a punta contra PostgreSQL local |
| 5 | Dashboard | **Completa** — verificada manualmente en navegador por el usuario |
| 6 | Centro de carga (subida de archivos, registro de cargas) | **Completa** — probada de punta a punta contra PostgreSQL local y confirmada por el usuario en navegador |
| 7 | Documentos y procesamiento (parsers, modelo interno) | **Completa** — probada de punta a punta contra PostgreSQL local y confirmada por el usuario en navegador |
| 8 | Motor de validaciones | **Completa** — probada de punta a punta contra PostgreSQL local |
| 9 | Compras y ventas (módulos de negocio sobre `documentos`) | **Completa** — probada de punta a punta contra PostgreSQL local |
| 10 | Terceros | **Completa** — probada de punta a punta contra PostgreSQL local |
| 11 | Mapeo de datos | **Completa** — probada de punta a punta contra PostgreSQL local |
| 12 | Motor de transformación (interfaz de adaptador) | **Completa** — probada de punta a punta contra PostgreSQL local |
| 13 | Motor de exportación (adaptadores Excel/CSV, sin bloqueos externos) | **Completa** — probada de punta a punta contra PostgreSQL real |
| 14 | Primer adaptador de software contable real (WordOffice o Siigo) | **Completa (WordOffice: compras y ventas)** — probada de punta a punta contra PostgreSQL real. Siigo sigue bloqueada — sin insumos oficiales propios |
| 15 | Bancos, cartera y cuentas por pagar | **Completa** — probada de punta a punta contra PostgreSQL real |
| 16 | OCR | **Completa (imágenes JPG/PNG)** — probada de punta a punta contra PostgreSQL real. OCR de PDF escaneado sin capa de texto queda pendiente |
| 17 | IA | **Bloqueada** — se definió el alcance (sugerencias de IA en revisión de documentos, sobre el texto de OCR/PDF) y el proveedor (Anthropic) con el usuario, pero falta una `ANTHROPIC_API_KEY` real para empezar |
| 18 | Nuevos adaptadores | Pendiente |

## Nota sobre Fase 3

El módulo de autenticación (`backend/src/authentication/`) está implementado, cubierto por pruebas unitarias (`npm test`: hashing, JWT, middlewares de autorización — 13/13 OK) y probado de punta a punta contra una base de datos real: login, rechazo de credenciales inválidas, `GET /me` autenticado y `POST /refresh` funcionando contra PostgreSQL local.

**Cambio de motor de base de datos:** se migró de SQL Server a PostgreSQL (ver nota al inicio de `database.md`) porque este entorno de desarrollo (Mac, sin Docker) no podía correr SQL Server sin instalar Docker Desktop, algo que requiere una contraseña interactiva de macOS que no se puede dar por línea de comandos. PostgreSQL se instala nativo vía Homebrew (`brew install postgresql@16`, sin sudo) y tiene el conector más maduro de Prisma.

**Entorno de desarrollo local (para reproducirlo en otra máquina):**
```
brew install postgresql@16
brew services start postgresql@16
psql postgres -c "CREATE ROLE contaassist LOGIN PASSWORD 'contaassist_dev';"
psql postgres -c "ALTER ROLE contaassist CREATEDB;"
psql postgres -c "CREATE DATABASE contaassist OWNER contaassist;"
# en backend/.env: DATABASE_URL="postgresql://contaassist:contaassist_dev@localhost:5432/contaassist?schema=public"
cd backend && npx prisma migrate dev && npm run prisma:seed
```

## Nota sobre Fase 4

Módulo `backend/src/modules/empresas/` (más el helper `modules/usuarios/usuarios.service.js`) implementado y probado de punta a punta contra PostgreSQL real: `POST /api/auth/registro` (alta de usuario + primera empresa), `POST /api/empresas` (empresa adicional), listar/editar empresa, listar/invitar/editar usuarios de una empresa, y la regla de negocio "la empresa siempre debe conservar al menos un ADMINISTRADOR activo" (verificada con un intento bloqueado). También se confirmó que un usuario sin acceso a una empresa recibe 403, y que un rol sin permiso (`AUXILIAR_CONTABLE` intentando invitar) recibe 403.

Se corrigió además un defecto de diseño de Fase 3: la restricción de unicidad de `usuario_empresa_rol` estaba definida como `(usuario, empresa, rol)`, lo que permitía —incorrectamente— que un mismo usuario tuviera dos roles simultáneos en la misma empresa. Se corrigió a `(usuario, empresa)` vía migración (`fix_usuario_empresa_unique`).

**Incidente durante la migración (transparencia):** al generar el SQL de esa migración con `prisma migrate diff`, se pasó por error la URL de la base de datos real como `--shadow-database-url` (que Prisma espera vacía para hacer el cálculo). Esto vació las tablas de `contaassist` (estructura intacta, solo se perdieron las filas: catálogo de roles y el usuario/empresa demo del seed). Sin impacto real — era data de desarrollo local — se corrigió corriendo `npm run prisma:seed` de nuevo. Aprendizaje aplicado: no volver a usar la URL de una base con datos reales como shadow database.

## Nota sobre Fase 5

Se construyó el shell real de la aplicación que la Fase 2 había dejado pendiente: `AuthProvider` + cliente API (`frontend/src/lib/api.js`, con refresh silencioso de token en 401), rutas protegidas, login y registro (consumen `POST /api/auth/login` y `/registro`), layout con sidebar (los 15 módulos de la sección 10; los no implementados muestran un `PlaceholderPage` honesto con la fase del roadmap que los habilita, no datos simulados) y topbar con selector de empresa cuando el usuario pertenece a varias.

El Dashboard (`DashboardPage.jsx`) muestra únicamente datos reales: empresa activa, rol del usuario, equipo (consumiendo el backend de Fase 4) y una alerta genuina cuando la empresa tiene un solo administrador activo. Las métricas de documentos de la sección 18 (recibidos, procesados, pendientes, aprobados, etc.) se muestran como placeholders explícitos ("—", con la fase que los habilita) en vez de inventar ceros que parezcan datos reales, porque el modelo de `documentos` todavía no existe (llega en Fase 7). Se agregó también una página de Configuración → Equipo (listar/invitar/cambiar rol) que le da uso real a la API de Fase 4.

No se pudo probar en un navegador automatizado (la extensión Claude in Chrome no quedó conectada en esta sesión); se verificó con `npm run build` + `npm run lint` limpios, y el usuario confirmó manualmente que el flujo de registro funciona correctamente.

## Nota sobre Fase 6

Se agregaron los modelos `Carga`, `ArchivoOrigen` (ver `docs/database.md` §3) y `Auditoria` (sección 23, implementada de una vez ya que la primera acción mutante real — subir archivos — la necesitaba). Módulo `backend/src/modules/cargas/`: `POST /api/cargas` (multipart con `multer`, hasta `CARGA_MAX_ARCHIVOS` archivos por lote), validación de **contenido real** vía `file-type` (magic bytes) para formatos binarios y un heurístico propio para XML/CSV (texto plano no tiene firma binaria), deduplicación por hash SHA-256 a nivel de empresa, y almacenamiento en disco (`backend/storage/`, gitignored) con rutas generadas solo a partir de ids del servidor — nunca del nombre original del archivo (evita path traversal). Se agregó también `GET /api/auditoria` (solo ADMINISTRADOR) para poder verificar el registro de auditoría.

Frontend: página real de Centro de Carga (`CentroCargaPage.jsx`) con selector de tipo, drag & drop, barra de progreso real (XHR, `fetch` no expone progreso de subida de forma confiable), resultado por archivo, e historial expandible con apertura del archivo original. El Dashboard ahora muestra el conteo real de cargas y las últimas cargas, reemplazando ese placeholder de Fase 5.

**Bug real encontrado y corregido durante las pruebas E2E:** el índice único `(empresa_id, hash_sha256)` en `archivos_origen` competía con el intento de guardar una fila `ERROR` para reportar un archivo duplicado (mismo hash que uno ya `RECIBIDO`) → violación de constraint → 500. Se corrigió no persistiendo filas para archivos rechazados/duplicados (nunca se "recibieron" de verdad); se reportan solo en la respuesta de la petición de subida. Limitación conocida: no queda historial por-archivo de rechazos pasados, solo el conteo agregado (`cantidadArchivos` vs. archivos realmente guardados) en `cargas`.

Probado de punta a punta contra PostgreSQL real: lote mixto (2 válidos + 1 duplicado intra-lote + 1 con contenido inválido), duplicado entre cargas distintas, descarga con verificación de integridad del contenido, bloqueo de rol `CONSULTA` al subir (403) y al ver auditoría (403), y registro correcto en `auditoria`. Confirmado también manualmente por el usuario en el navegador.

## Nota sobre Fase 7

Motor de procesamiento (`backend/src/document-processing/`), conectado automáticamente al final del flujo de carga de Fase 6 (sin cola/worker — se procesa en el mismo request). Cobertura real por tipo de archivo:
- **CSV/XLSX**: plantilla propia de ContaAssist (columnas `tipo_documento,numero_documento,fecha_emision,nit_tercero,razon_social_tercero,subtotal,iva,porcentaje_iva,total` — un formato que definimos nosotros, no de un tercero, así que sí se podía especificar sin violar la regla de "no inventar formatos externos"). Una fila inválida no descarta las demás.
- **XML**: factura electrónica DIAN (UBL 2.1), el estándar público colombiano — extrae número, fecha, NIT/razón social del emisor, subtotal, IVA y total reales.
- **PDF**: extrae el texto embebido real (sin OCR/IA) para revisión manual.
- **Imágenes (JPG/PNG) y XLS**: crean el documento vacío listo para completar a mano — OCR es Fase 16; ExcelJS (la librería del stack) no soporta el binario legado `.xls`, solo `.xlsx`.

Modelos agregados: `Tercero` (versión mínima — resolución por NIT únicamente, sin la UI/CRUD de Fase 10), `Documento`, `Impuesto`, `DocumentoImpuesto`. Se dejaron fuera a propósito `documento_detalles`, `retenciones`/`documento_retenciones` y las FK de `documentos` a cuenta contable/centro de costo/forma de pago, porque esos catálogos no existen todavía.

Nuevo módulo `/api/documentos` (listar con filtros, detalle, editar con auditoría por campo, ver archivo original) y páginas de frontend Documentos (lista) y Documento (detalle/edición — el panel "documento original | datos extraídos" de la sección 14).

**Dos bugs reales encontrados por el usuario en pruebas manuales y corregidos:**
1. `api.subirCarga` no existía como tal — la función se había exportado suelta en `api.js` en vez de como propiedad del objeto `api`, y `CentroCargaPage` la llamaba como `api.subirCarga(...)`. El error real quedaba oculto detrás de un mensaje genérico porque el manejo de errores del frontend usaba `err instanceof ApiError` en 7 lugares — un patrón frágil bajo HMR de Vite (un módulo recargado en caliente puede duplicarse en el grafo de módulos del navegador, rompiendo `instanceof`). Se reemplazó por un helper `mensajeDeError(err, fallback)` que usa `err?.message` en los 7 lugares.
2. Un CSV real (de sample-files.com, con una línea de comentario y columnas que no seguían la plantilla) tumbaba `csv-parse` con una excepción sin atrapar, que crasheaba la petición completa a mitad de camino y dejaba la carga y el archivo atascados en estado `PROCESANDO` para siempre. Se corrigió en tres niveles: el parser de CSV ahora tolera comentarios (`comment: '#'`) y conteo de columnas irregular (`relax_column_count`) y nunca lanza (igual se corrigió `xlsxParser.js` preventivamente); `procesarArchivo` nunca lanza (try/catch envolvente); y el loop de `crearCarga` en `cargas.service.js` envuelve cada archivo individualmente, así que un fallo inesperado en cualquier punto marca ese archivo como error sin tumbar el resto del lote ni dejar la carga sin estado final.

## Nota sobre Fase 8

Motor de reglas (`backend/src/validation-engine/`) con el patrón de registro documentado desde Fase 1: cada regla es un módulo `{codigo, severidad, aplicaA, evaluar}` en `reglas/`, sumado a un array en `registry.js` — agregar una regla nueva no toca el motor. 7 reglas implementadas ahora, las que ya son evaluables con los campos que existen en `documentos`:

- **BLOQUEANTE**: `CAMPO_OBLIGATORIO_FALTANTE`, `FECHA_INVALIDA`, `TOTAL_DESCUADRADO`, `TERCERO_NO_IDENTIFICADO`, `NIT_INVALIDO` (dígito de verificación real, algoritmo público de la DIAN — verificado contra un NIT real conocido: Bancolombia 890903938-8), `DUPLICADO_DOCUMENTO` (mismo tercero+número+tipo en la empresa).
- **ADVERTENCIA**: `IMPUESTO_INCONSISTENTE` (la suma de `documento_impuestos` no coincide con `total_impuestos`).

`CUENTA_NO_ASIGNADA`, `CENTRO_COSTO_REQUERIDO` y `FORMA_PAGO_FALTANTE` (documentadas en `validation-engine.md` desde Fase 1) siguen pendientes: los campos correspondientes no existen en `documentos` todavía (llegan con los catálogos de Fase 9/11).

El motor se dispara automáticamente al final del procesamiento de Fase 7 (mismo request, sin cola) y dentro de `PATCH /api/documentos/:id` (una edición invalida cualquier aprobación previa y vuelve a `PENDIENTE_REVISION`). Nuevo `POST /:id/revalidar` (cualquier rol editor) y `POST /:id/aprobar` / `POST /:id/rechazar` (solo ADMINISTRADOR/CONTADOR — sección 9: "el contador revisa, valida y aprueba"; `aprobar` rechaza con 409 si queda algún bloqueante en falla). No hay auto-aprobación: todo documento pasa por `PENDIENTE_REVISION` sin excepción, como quedó documentado en `data-flow.md` desde Fase 1.

**Dos bugs reales encontrados en pruebas E2E propias y corregidos antes de que el usuario los viera:**
1. `GET /api/documentos` tiraba 500: `documentos.map(serializarDocumento)` le pasaba a `serializarDocumento` el índice del array como segundo argumento (`validaciones`), y `0?.some(...)` explota porque `0` no es `undefined` (el optional-chaining no protege ahí). Se corrigió envolviendo en arrow function y además se hizo `hayBloqueante` defensivo con `Array.isArray(...)` en vez de confiar solo en `?.`.
2. Un `node src/server.js &` lanzado en foreground dentro de un script largo de una sola llamada de herramienta se quedó colgado sin logs — se resolvió siempre arrancando el servidor con `run_in_background`/`nohup` en un paso separado, nunca `&` inline dentro de un script combinado.

Probado de punta a punta contra PostgreSQL real: ciclo completo aprobar bloqueado por error → corregir vía PATCH → revalida automático → aprobar exitoso → reintentar aprobar ya aprobado (409); rechazar con motivo; permisos por rol (`AUXILIAR_CONTABLE` revalida pero no aprueba/rechaza — 403; `CONSULTA` no puede ninguna acción de escritura pero sí ve el detalle).

## Nota sobre Fase 9

Compras y Ventas no son módulos nuevos de negocio — son la bandeja de Documentos (Fase 7/8) con `tipoDocumento` fijo, más un endpoint de KPIs. Se implementó una sola vez (`components/documentos/DocumentosPorTipo.jsx`) y `ComprasPage`/`VentasPage` son wrappers de 8 líneas; evita duplicar la tabla/filtros/lógica tres veces.

Backend:
- `GET /api/documentos` gana los filtros `tercero` (busca por razón social o NIT, insensible a mayúsculas) y `fechaDesde`/`fechaHasta` — ya estaban documentados en `api.md` desde Fase 1 pero nunca se habían implementado.
- Nuevo `GET /api/documentos/resumen` (`prisma.documento.groupBy` por estado) para los KPIs de cabecera de Compras/Ventas: total de documentos, valor total, pendientes de revisión, aprobados.

**Bug real encontrado y corregido antes de construir Ventas:** `buscarOCrearTercero` clasificaba todo tercero nuevo como `PROVEEDOR` sin importar el contexto — una factura de venta habría creado "clientes" marcados como proveedores. Se corrigió: el tipo de tercero ahora se deriva del `tipoDocumento` (`FACTURA_COMPRA` → `PROVEEDOR`, `FACTURA_VENTA` → `CLIENTE`), y si el mismo NIT vuelve a aparecer con un rol distinto (una empresa que nos compra y nos vende) se reclasifica a `AMBOS` en vez de perder la clasificación original. Verificado con un NIT real subido primero como compra y luego como venta → quedó `AMBOS`.

Probado de punta a punta contra PostgreSQL real: resumen por tipo+estado con cifras correctas, filtro por tercero (parcial, case-insensitive) devolviendo documentos de compra y venta del mismo tercero, filtro por rango de fechas exacto, y combinación tipoDocumento+estado.

## Nota sobre Fase 10

Módulo completo `backend/src/modules/terceros/` (la tabla `terceros` ya existía desde Fase 7, creada mínimamente para que `documentos.tercero_id` pudiera resolverse — Fase 10 le da API/UI propia): listar con búsqueda (`q` por razón social o identificación) y filtro por `tipoTercero`, crear, editar. Reutiliza el algoritmo de dígito de verificación de NIT construido en Fase 8 (`validation-engine/nit.js`): si se crea un tercero NIT sin `dv`, se calcula solo; si se envía uno que no coincide con el calculado, se rechaza con 400 — un typo se atrapa al crear el tercero, no después sobre un documento.

Decisión de diseño: `PATCH` no permite cambiar `tipoIdentificacion`/`identificacion` — cambiar la identificación de un tercero existente reatribuiría en silencio todo su historial de documentos. Si la identificación quedó mal, se desactiva ese registro (`activo:false`) y se crea uno nuevo.

**Bug real corregido en Fase 9** (clasificación de terceros como `PROVEEDOR` sin importar el contexto) ya deja `buscarOCrearTercero` clasificando correctamente por tipo de documento; Fase 10 no tuvo que tocar esa lógica, solo construir la gestión manual encima.

Probado de punta a punta contra PostgreSQL real: NIT real (Bancolombia 890903938) con DV autocalculado en 8, DV incorrecto rechazado (400), identificación duplicada rechazada (409), cédula sin DV, búsqueda parcial, filtro por tipo, edición de campos editables, intento de cambiar la identificación (ignorado), desactivación, permisos (`CONSULTA` no crea — 403, sí lista), y auditoría de `CREAR_TERCERO`/`MODIFICAR_TERCERO`.

## Nota sobre Fase 11

Modelos nuevos: `CuentaContable`, `CentroCosto`, `FormaPago` (catálogos por empresa, `@@unique([empresaId, codigo])`), `SistemaDestino` (catálogo global sembrado con WORDOFFICE/SIIGO/EXCEL/CSV) y las tablas de equivalencia `MapeoCuenta`/`MapeoTercero`/`MapeoFormaPago` (`@@unique([empresaId, sistemaDestinoId, <entidad>Id])`). `Documento` gana `cuentaContableId`/`centroCostoId`/`formaPagoId`, nullables — la asignación es opcional durante la revisión, no un requisito para recibir/procesar el documento.

Backend: módulo `configuracion-contable` (`/api/config`) con CRUD de listar/crear para los tres catálogos más lectura de sistemas destino; módulo `mapeo` (`/api/mapeos`) con listar/guardar por sistema destino — cuentas y formas de pago devuelven el catálogo completo fusionado con el mapeo existente (para que la UI muestre también lo no mapeado), terceros solo devuelve lo ya mapeado (el catálogo puede ser grande; nuevos se agregan por búsqueda+id). `documentos.service.js` gana `resolverCatalogo()`: a diferencia de terceros, un código de cuenta/centro/forma que no exista en el catálogo de la empresa devuelve 404 en vez de crearse solo.

3 reglas de validación nuevas (ADVERTENCIA, no bloquean aprobación): `CUENTA_NO_ASIGNADA`, `CENTRO_COSTO_REQUERIDO`, `FORMA_PAGO_FALTANTE` — completan las 10 reglas de `validation-engine.md` (las 7 anteriores dependían de datos que ya existían desde Fase 7/8; estas tres esperaban a que el documento pudiera tener estos campos).

Frontend: `ConfiguracionPage` pasa a tabs (Equipo de Fase 4 + nuevo Catálogos contables, componente compartido `TablaCatalogo` para no triplicar la misma UI de listar+crear); `MapeoPage` nueva con selector de sistema destino y tres secciones editables; `DocumentoDetallePage` gana los tres selects de asignación, incluyendo la opción de dejar el campo sin asignar (`null`).

Probado de punta a punta contra PostgreSQL real: creación de catálogos, guardado y actualización de mapeos por sistema destino, asignación y desasignación (`null`) de cuenta/centro/forma de pago sobre un documento, permisos por rol (`CONSULTA` recibe 403 al intentar crear catálogos o guardar mapeos, pero sí puede leer `GET /api/config/sistemas-destino`). Sin bugs nuevos encontrados en esta fase. Suite de tests: 49/49 pasando.

## Nota sobre Fase 12

Motor de transformación (`backend/src/transformation-engine/`): solo el núcleo y la interfaz de adaptador descrita en `transformation-engine.md`, sin construir ningún adaptador concreto — WordOffice/Siigo siguen bloqueados por falta de insumos oficiales, y Excel/CSV están planeados para Fase 13, no antes (no se adelanta trabajo de fases siguientes).

`registry.js` mantiene la lista de adaptadores registrados (vacía por ahora); `engine.js` resuelve el adaptador por `sistemas_destino.codigo`, carga los documentos y el mapeo de la empresa para ese destino, y expone `resolverPrerequisitosExportacion` (aplica el paso 6 de `data-flow.md`: pasa a `LISTO_PARA_EXPORTAR` los documentos sin errores de prerequisito, deja el resto en `APROBADO`) y `transformarParaExportar` (aplica el adaptador sobre documentos ya listos, sin generar archivo — eso queda para `export-engine` en Fase 13).

Como ningún adaptador real existe todavía, el motor no se conectó a ningún endpoint ni pantalla nueva — exponerlo ahora solo devolvería 501 en los 4 destinos sembrados. Se verificó con un adaptador de prueba (no commiteado) directamente contra PostgreSQL real: documento con cuenta/tercero/forma de pago mapeados a EXCEL → queda `LISTO_PARA_EXPORTAR` y `transformar` arma el registro correcto; documento con una referencia sin mapear → se queda en `APROBADO`, reportado como pendiente; `transformarParaExportar` rechaza (409) un documento que no llegó a `LISTO_PARA_EXPORTAR`; sistema destino sin adaptador (SIIGO) → 501. Lógica pura (`clasificarPorPrerequisitos`, registro de adaptadores) cubierta con tests unitarios. Suite: 53/53 pasando.

## Nota sobre Fase 13

Modelos nuevos `Exportacion`/`ExportacionDocumento` (ver `docs/database.md` §8). Los dos primeros adaptadores reales (`backend/src/adapters/excel/adapter.js`, `backend/src/adapters/csv/adapter.js`) implementan la interfaz descrita en `transformation-engine.md`, registrados en `transformation-engine/registry.js`. Como es un formato propio de ContaAssist (no de un tercero, así que no aplica la regla de "no inventar formatos externos"), ambos comparten la misma lógica de `validarPrerequisitos`/`transformar` en `backend/src/adapters/formatoContaAssist.js` — solo difiere `generarArchivo` (ExcelJS vs. texto delimitado por comas propio).

Nuevo `backend/src/export-engine/exportEngine.js`, que implementa el flujo completo de la sección 16: busca documentos candidatos por empresa+tipo de información (`COMPRAS`→`FACTURA_COMPRA`, `VENTAS`→`FACTURA_VENTA`; `BANCOS` queda pendiente de Fase 15) y período, invoca `resolverPrerequisitosExportacion`/`transformarParaExportar` de Fase 12, re-chequea bloqueantes releyendo el último resultado de validación (sin volver a ejecutar las reglas, que reiniciaría el documento a `PENDIENTE_REVISION`), genera el archivo con el adaptador, lo guarda en `storage/<empresa>/exportaciones/`, crea `exportacion`+`exportacion_documentos`, pasa los documentos incluidos a `EXPORTADO` y registra `GENERAR_EXPORTACION` en auditoría. Nuevo módulo `backend/src/modules/exportaciones/` expone `/api/exportaciones` (`preview`, generar, listar, detalle, descargar) según `docs/api.md`, restringido a `ADMINISTRADOR`/`CONTADOR` para generar (mismos roles que aprueban documentos).

Frontend: `ExportacionesPage` (antes placeholder) pasa a implementación real — formulario de previsualización/generación (solo visible para quien puede exportar) más historial con descarga.

Probado de punta a punta contra PostgreSQL real: preview y generación de una exportación EXCEL de VENTAS con un documento `APROBADO` cuyo tercero/cuenta/forma de pago ya estaban mapeados a EXCEL (datos dejados por las pruebas de Fase 12) — el documento pasó a `LISTO_PARA_EXPORTAR` y luego a `EXPORTADO`, el `.xlsx` generado se descargó y se verificó su contenido celda por celda con ExcelJS; una segunda previsualización del mismo período confirmó la idempotencia (el documento ya `EXPORTADO` no vuelve a aparecer como candidato); generar contra `SIIGO` (sin adaptador) devolvió 501. Suite de unit tests (formato compartido, ambos adaptadores, `TIPOS_DOCUMENTO_POR_INFORMACION`): 61/61 pasando. `npm run build`/`npm run lint` del frontend limpios.

Verificado también en navegador real (Claude in Chrome) contra los servidores locales: login como ADMINISTRADOR, sidebar con "Exportaciones" ya no como placeholder, historial mostrando la exportación generada, previsualización con "sin documentos elegibles" para Compras (correcto, no hay compras aprobadas en los datos de prueba) y descarga del archivo (`GET /api/exportaciones/:id/descargar` → 200, sin errores de consola).

## Nota sobre Fase 14

El usuario aportó 5 archivos reales de importación a WordOffice (compras, ventas, nota crédito de compra, comprobante de egreso, recibo de caja) — ver `backend/src/adapters/wordoffice/README.md` para el detalle completo de la fuente y los supuestos documentados. Al analizarlos se confirmó que WordOffice resuelve la cuenta contable de compras/ventas **desde el producto** (movimiento de inventario por línea: producto+bodega+cantidad+valor unitario), no desde un asiento de cabecera — algo que el modelo de `Documento` (solo cabecera hasta Fase 13) no podía describir.

Por eso esta fase tuvo que construir primero la base de inventario que `docs/database.md` ya documentaba desde Fase 1 pero Fase 7 había dejado fuera a propósito: modelos `Producto`, `Bodega`, `DocumentoDetalle`, `MapeoProducto`, `MapeoBodega` (extendidos con `unidad_medida`/`bodega_id`/`porcentaje_iva`/`descuento`, que el diseño original no anticipaba — evidenciados por las columnas reales de WordOffice). Nuevo módulo `backend/src/modules/inventario/` (CRUD de productos/bodegas) y extensión de `mapeo` con productos (patrón terceros: solo mapeados + búsqueda) y bodegas (patrón cuentas: catálogo completo + equivalencia).

Extracción de líneas de detalle: `xmlParser.js` ahora extrae `cac:InvoiceLine` de la factura DIAN automáticamente; `plantillaTabular.js` (CSV/XLSX propio de ContaAssist) acepta columnas de línea opcionales y agrupa varias filas del mismo documento — retrocompatible con la plantilla de 10 columnas de Fase 7. PDF/imágenes/XLS siguen sin extracción de línea (gap documentado); un documento sin líneas no puede exportarse a WordOffice hasta asignarlas manualmente en `DocumentoDetallePage` (nueva sección "Líneas de detalle").

Adaptador `backend/src/adapters/wordoffice/` (`adapter.js`+`mapper.js`+`README.md`): dos layouts reales distintos (39/40 columnas para compras, 44/45 para ventas — ambos verificados programáticamente byte a byte contra los archivos del usuario, no transcritos a mano), `validarPrerequisitos` propio (no reutiliza el de Excel/CSV: exige líneas con producto+bodega mapeados, no cuenta contable de cabecera), y un nuevo concepto `parametrosAdaptador` en `export-engine` para constantes de lote que no viven en ningún documento (`terceroInterno`, obligatorio; `notaLinea`/`centroCostosTexto`, opcionales).

**Decisión confirmada con el usuario, importante para no corromper datos reales:** en compras, "Documento Número" es un consecutivo que WordOffice controla internamente (se deja vacío); el número real de la factura del proveedor va en "Pref Dto Ext"/"No. Dto Ext". En ventas, "Documento Número" sí es el consecutivo real de la venta.

**Bug real encontrado y corregido durante la verificación en navegador (no introducido por esta fase, pero expuesto por ella):** `FilaMapeo` (`MapeoPage.jsx`) inicializaba su valor con `useState(codigoDestino || '')` una sola vez; al cambiar de sistema destino, la fila se re-renderizaba con el mismo `key` antes y después de que llegara el nuevo mapeo, así que el input quedaba mostrando el valor del sistema anterior (en blanco para Bodegas/Productos recién agregados). Corregido con un `useEffect` que resincroniza el valor cuando cambia el prop `codigoDestino`.

Probado de punta a punta contra PostgreSQL real: producto/bodega creados y mapeados a WORDOFFICE, documento de compra y documento de venta (cada uno con una línea de detalle) aprobados y exportados — ambos `.xlsx` descargados y verificados columna por columna (Tipo Documento FC/FV correcto, Documento Número vacío en compras y real en ventas, Pref/No Dto Ext con el número del proveedor, Producto/Bodega/FormaPago con sus `codigoDestino` mapeados, `parametrosAdaptador` inyectados correctamente); documento pasó a `EXPORTADO` en ambos casos. Suite de unit tests (mapper con datos reales, extracción de líneas XML, agrupación de `plantillaTabular.js`, adaptador con verificación byte-exacta de las 58/57 columnas reales): 76/76 pasando. Verificado también en navegador real: Inventario, Mapeo (bodegas/productos), líneas de detalle en `DocumentoDetallePage`, y el formulario de Exportaciones con los campos de WordOffice. `npm run build`/`npm run lint` del frontend limpios.

## Información que el usuario debe aportar antes de continuar con Siigo

Para Siigo (WordOffice ya se resolvió en Fase 14):
1. Documentación/manual oficial del formato de importación.
2. Plantilla oficial de importación (archivo modelo).
3. Al menos un archivo de ejemplo real ya importado exitosamente.
4. Reglas de validación propias del destino (campos obligatorios, catálogos cerrados, longitudes).

Sin estos insumos el adaptador de Siigo no se inicia; el roadmap continúa con las demás fases (Bancos/cartera, OCR, IA, etc.) sin quedar bloqueado en su totalidad.

## Nota sobre Fase 15 (parcial: Cartera y Cuentas por pagar)

A diferencia de todas las fases anteriores, esta no tenía ningún diseño previo — ni tablas en `database.md`, ni endpoints en `api.md`, ni notas de arquitectura. Solo dos placeholders sembrados hace tiempo (`documentos.tipo_documento` con `EXTRACTO_BANCARIO`, `exportaciones.tipo_informacion` con `BANCOS`). Confirmado con el usuario: no había una sección del brief original que rescatar, así que se diseñó desde cero con prácticas contables colombianas estándar. Al ser tres subsistemas distintos empaquetados en una sola fase del roadmap ("Bancos, cartera y cuentas por pagar"), el usuario decidió acotar esta pasada a **Cartera + Cuentas por pagar** — Bancos (cuentas bancarias, extractos, conciliación) queda pendiente, por eso la fase se marca como parcial y no completa.

Cartera y Cuentas por pagar son el mismo concepto con dirección opuesta (dinero que entra vs. que sale), igual que Compras/Ventas (Fase 9) son la misma bandeja de `Documentos` con `tipoDocumento` fijo: una sola tabla `pagos` (modelos nuevos `Pago`/`PagoDocumento`, ver `database.md` §10) con un campo `tipo` (`PAGO`/`RECAUDO`), un único módulo `backend/src/modules/pagos/` montado en `/api/pagos`, y un componente de frontend compartido (`PagosPorTipo.jsx`) del que `CuentasPorPagarPage.jsx`/`CarteraPage.jsx` son wrappers de pocas líneas — mismo patrón que `DocumentosPorTipo.jsx`/`ComprasPage.jsx`/`VentasPage.jsx`.

El saldo pendiente de un documento no se guarda como columna (se desincronizaría) — se calcula siempre en el momento: `documento.total - Σ(valor_aplicado de pagos REGISTRADO)`. Reglas de negocio (en el service, no en el motor de validación de documentos porque no son reglas de calidad de un documento sino de la operación de pago): el tercero del pago debe coincidir con el de cada documento aplicado; `PAGO` solo aplica a `FACTURA_COMPRA` y `RECAUDO` solo a `FACTURA_VENTA`; el documento debe estar `APROBADO`/`LISTO_PARA_EXPORTAR`/`EXPORTADO`; la suma de lo aplicado en un pago debe ser exactamente igual a su valor; lo aplicado a un documento nunca puede superar su total (sobrepago → 409). Anular un pago es un soft-delete (`estado→ANULADO`, no se borra `pago_documentos`) — mismo espíritu que `RECHAZADO` en `Documento`, nunca se destruye el historial.

Frontend: `CuentasPorPagarPage`/`CarteraPage` (antes placeholders) pasan a implementación real — KPIs (pendiente, vencido, cantidad de documentos en cada uno), tabla de documentos elegibles con saldo/estado (`PENDIENTE`/`PARCIAL`/`PAGADO`, más un badge `VENCIDO` si aplica), un modal para registrar el pago/recaudo (permite aplicar a varios documentos del mismo tercero a la vez, el valor total se deriva de la suma de lo aplicado en vez de pedirse aparte, para no chocar con la validación del backend), e historial con opción de anular. `/bancos` pasó a implementación real en la segunda pasada (ver nota siguiente).

Probado de punta a punta contra PostgreSQL real: sobre un documento `FACTURA_COMPRA` `EXPORTADO` existente (840.000) — pago parcial (500.000) → `PARCIAL` con saldo 340.000; segundo pago (340.000) → `PAGADO` con saldo 0; intento de sobrepago (1.000 adicionales) → 409; anular el segundo pago → vuelve a `PARCIAL` con saldo 340.000; anular dos veces el mismo pago → 409. Repetido con éxito sobre una `FACTURA_VENTA` (recaudo completo), incluyendo el rechazo (400) de aplicar `tipo=PAGO` a una factura de venta. Suite de unit tests (cálculo puro de saldo/estado/vencido): 85/85 pasando. `npm run build`/`npm run lint` del frontend limpios. Verificado también en navegador real (Claude in Chrome): login, sidebar con Cartera/Cuentas por pagar ya reales, registrar un pago desde el modal, ver el documento pasar a `PAGADO` en vivo, y el historial actualizado — en ambos módulos.

## Nota sobre la segunda pasada de Fase 15 (catálogo de cuentas bancarias)

Alcance acotado con el usuario: solo catálogo de cuentas bancarias + vínculo opcional con `Pago`/`Recaudo` (Fase 15, primera pasada). Extractos bancarios e importación/conciliación quedan pendientes — si se construyen más adelante, será con una plantilla propia de ContaAssist (fecha/descripción/valor/débito-crédito, mismo criterio que la plantilla CSV/XLSX de documentos de Fase 7), confirmado con el usuario, porque cada banco tiene su propio formato de extracto y no hay uno único que adoptar sin inventarlo.

Modelo nuevo `CuentaBancaria` (`database.md` §10): `banco`, `numeroCuenta`, `tipoCuenta` (`AHORROS`/`CORRIENTE`), `saldoInicial`, `moneda`. `Pago` gana `cuentaBancariaId` (nullable). El saldo de la cuenta sigue el mismo criterio que el saldo pendiente de un documento — no se guarda como columna, se calcula: `saldoInicial + Σ(valor de pagos REGISTRADO de esa cuenta, RECAUDO suma, PAGO resta)`. Nuevo módulo `backend/src/modules/bancos/`, endpoint `/api/bancos/cuentas` (listar con saldo, crear).

Frontend: `BancosPage` (antes placeholder) reutiliza `TablaCatalogo` (mismo componente que Configuración → Catálogos contables e Inventario) para el catálogo de cuentas; `ModalRegistrarPago.jsx` gana un select opcional de cuenta bancaria, e `HistorialPagos.jsx` una columna que la muestra.

Probado de punta a punta contra PostgreSQL real: cuenta bancaria creada con saldo inicial 1.000.000; recaudo de 45.000 vinculado a la cuenta → saldo sube a 1.045.000; anular el recaudo → saldo vuelve a 1.000.000; intento de registrar un pago con una `cuentaBancariaId` inexistente → 404. Suite de unit tests (suma de movimientos por cuenta, RECAUDO/PAGO con signo correcto, cuentas separadas): 90/90 pasando. `npm run build`/`npm run lint` del frontend limpios. Verificado también en navegador real: sidebar con Bancos ya real, cuenta creada visible con su saldo, y el select de cuenta bancaria disponible en el modal de registrar pago/recaudo.

## Nota sobre Fase 16 (OCR)

Motor elegido con el usuario: **Tesseract local** (`tesseract.js`), sin servicio en la nube ni API key ni costo por documento — corre en el propio backend. Alcance de esta pasada: **imágenes JPG/PNG**. OCR de PDF escaneado sin capa de texto (el caso donde `pdfParser.js` ya reporta "no tiene texto extraíble") queda pendiente porque requeriría convertir cada página a imagen primero (una dependencia nativa adicional tipo poppler/canvas) — no se adelantó esa pieza sin necesidad real.

Mismo principio que el parser de PDF de Fase 7 y el riesgo ya documentado en `architecture.md` ("la extracción se marca siempre como 'requiere revisión humana'"): `ocrParser.js` **no** intenta adivinar número/fecha/NIT/totales con regex sobre el texto reconocido — solo expone el texto crudo en el mismo panel de revisión que ya existía para PDFs (`documento.textoExtraido`), con la confianza del reconocimiento en las observaciones. No hizo falta ningún cambio de frontend: `DocumentoDetallePage` ya mostraba `textoExtraido` desde Fase 7.

**Bug real de la librería encontrado y corregido antes de que llegara a producción:** `tesseract.js` en Node usa `worker_threads` por debajo; cuando el buffer no es una imagen válida, la promesa de `recognize()` se rechaza correctamente, pero la librería **además** relanza el mismo error dentro de su manejador interno de mensajes (`node_modules/tesseract.js/src/createWorker.js`, bloque `status === 'reject'`) si no se le pasa la opción `errorHandler` — eso tumbaba el proceso completo con una excepción no atrapada, sin importar el `try/catch` alrededor de `recognize()`. Se corrigió pasando `errorHandler: () => {}` a `createWorker`, verificado con un test que antes crasheaba `node --test` y ahora pasa. Reproduce exactamente la clase de riesgo por la que este proyecto ya evita expresiones regulares "adivinando" datos: un archivo con contenido inesperado debe ser un resultado fallido, no una excepción — igual que el bug real de CSV malformado en Fase 7.

Probado de punta a punta contra PostgreSQL real: imagen real con el texto "FACTURA No 12345" subida vía `/api/cargas` → documento creado con `textoExtraido` = "FACTURA No 12345", observaciones con la confianza real del reconocimiento (96%), y las reglas de validación bloqueantes (`CAMPO_OBLIGATORIO_FALTANTE`, `TERCERO_NO_IDENTIFICADO`, etc.) fallando correctamente porque ningún campo se completó automáticamente. Verificado también en navegador real: el panel de revisión muestra el texto reconocido igual que con un PDF. Suite de unit tests (reconocimiento real contra una imagen fixture, y que un buffer inválido no crashea el proceso): 92/92 pasando.

## Nota sobre Fase 17 (IA) y la tercera pasada de Fase 15 (extractos y conciliación)

**Fase 17 (IA) queda bloqueada, no se avanzó nada de código.** Se acordó con el usuario el alcance (sugerencias de IA sobre el texto de OCR/PDF en la pantalla de revisión de un documento, siempre con confirmación humana — nunca auto-aprobar) y el proveedor (Anthropic), pero el usuario no tiene todavía una `ANTHROPIC_API_KEY` real para usar. Fase 18 (Nuevos adaptadores) también sigue bloqueada por la misma razón estructural que Siigo: necesita documentación/plantilla/ejemplo real de un sistema destino concreto, que tampoco se ha aportado. Mientras se consiguen esos insumos, el usuario pidió completar el resto pendiente de Fase 15 (extractos bancarios y conciliación).

Modelos nuevos `Extracto`/`ExtractoLinea` (`database.md` §10): la plantilla propia de ContaAssist para extractos (`fecha, descripcion, debito, credito`) sigue el mismo criterio que la plantilla CSV/XLSX de documentos de Fase 7 — cada banco tiene su propio formato de extracto, así que no hay uno que adoptar sin arriesgarse a leer mal los datos de alguno real; se define uno propio. `backend/src/modules/bancos/extractoParser.js` (nuevo) nunca lanza ante un archivo corrupto, mismo criterio que `csvParser.js`/`xlsxParser.js`.

Conciliación (`backend/src/modules/bancos/bancos.service.js`): el sistema solo **sugiere** candidatos de pago para cada línea sin conciliar (misma cuenta, tipo correcto según el lado del movimiento — débito↔`PAGO`, crédito↔`RECAUDO` —, valor con tolerancia de 1 peso, fecha con tolerancia de 5 días) — el usuario siempre confirma manualmente cuál corresponde, igual que el resto del sistema nunca auto-decide (mismo principio que OCR/IA: "requiere revisión humana"). `conciliado` no se guarda como columna: una línea está conciliada cuando `pago_id` no es NULL, mismo criterio de "calculado, no almacenado" que el saldo de cuenta/documento. Desconciliar es reversible.

Frontend: `BancosPage` gana una sección "Extractos bancarios" (subir CSV/XLSX por cuenta, historial de extractos importados); nueva `ExtractoDetallePage` (`/bancos/extractos/:id`) muestra cada línea con su estado de conciliación y, si aplica, los pagos sugeridos como botones de un clic.

Probado de punta a punta contra PostgreSQL real: extracto de 3 líneas importado (una con match exacto a un pago real, dos sin match) → la línea con match trae exactamente 1 sugerencia y las otras 0; conciliar → línea marcada con el pago correcto; conciliar de nuevo la misma línea → 409; desconciliar → vuelve a mostrar la sugerencia. Verificado también en navegador real: importar el archivo, ver el resultado, y conciliar/desconciliar desde `ExtractoDetallePage`. Suite de unit tests (parser de extracto: débito/crédito válidos, ambos a la vez, ninguno, fecha inválida sin descartar otras filas, XLSX real, nunca lanza): 99/99 pasando. `npm run build`/`npm run lint` del frontend limpios.
