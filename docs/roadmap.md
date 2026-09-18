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
| 10 | Terceros | Pendiente |
| 11 | Mapeo de datos | Pendiente |
| 12 | Motor de transformación (interfaz de adaptador) | Pendiente |
| 13 | Motor de exportación (adaptadores Excel/CSV, sin bloqueos externos) | Pendiente |
| 14 | Primer adaptador de software contable real (WordOffice o Siigo) | **Bloqueada** — requiere documentación/plantilla/ejemplo oficial (ver `transformation-engine.md`) |
| 15 | Bancos, cartera y cuentas por pagar | Pendiente |
| 16 | OCR | Pendiente |
| 17 | IA | Pendiente |
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

## Información que el usuario debe aportar antes de Fase 14

Para **cada** sistema contable (WordOffice, Siigo):
1. Documentación/manual oficial del formato de importación.
2. Plantilla oficial de importación (archivo modelo).
3. Al menos un archivo de ejemplo real ya importado exitosamente.
4. Reglas de validación propias del destino (campos obligatorios, catálogos cerrados, longitudes).

Sin este insumo la Fase 14 no se inicia para ese sistema; el roadmap continúa con las demás fases (Excel/CSV, bancos/cartera, etc.) sin quedar bloqueado en su totalidad.
