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
| 7 | Documentos y procesamiento (parsers, modelo interno) | Pendiente |
| 8 | Motor de validaciones | Pendiente |
| 9 | Compras y ventas (módulos de negocio sobre `documentos`) | Pendiente |
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

## Información que el usuario debe aportar antes de Fase 14

Para **cada** sistema contable (WordOffice, Siigo):
1. Documentación/manual oficial del formato de importación.
2. Plantilla oficial de importación (archivo modelo).
3. Al menos un archivo de ejemplo real ya importado exitosamente.
4. Reglas de validación propias del destino (campos obligatorios, catálogos cerrados, longitudes).

Sin este insumo la Fase 14 no se inicia para ese sistema; el roadmap continúa con las demás fases (Excel/CSV, bancos/cartera, etc.) sin quedar bloqueado en su totalidad.
