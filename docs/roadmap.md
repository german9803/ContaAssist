# Roadmap

Cada fase deja una base funcional para la siguiente. No se avanza a la siguiente fase con pruebas pendientes o documentación desactualizada.

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Arquitectura y documentación | **Completa** |
| 2 | Configuración inicial del proyecto (frontend Vite+React+Tailwind, backend Express, Prisma + PostgreSQL, estructura de carpetas) | **Completa** |
| 3 | Autenticación (JWT, login, roles base) | **Completa** — probada de punta a punta contra PostgreSQL local |
| 4 | Empresas, usuarios y roles (multiempresa funcional) | **Completa** — probada de punta a punta contra PostgreSQL local |
| 5 | Dashboard | Pendiente |
| 6 | Centro de carga (subida de archivos, registro de cargas) | Pendiente |
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

## Información que el usuario debe aportar antes de Fase 14

Para **cada** sistema contable (WordOffice, Siigo):
1. Documentación/manual oficial del formato de importación.
2. Plantilla oficial de importación (archivo modelo).
3. Al menos un archivo de ejemplo real ya importado exitosamente.
4. Reglas de validación propias del destino (campos obligatorios, catálogos cerrados, longitudes).

Sin este insumo la Fase 14 no se inicia para ese sistema; el roadmap continúa con las demás fases (Excel/CSV, bancos/cartera, etc.) sin quedar bloqueado en su totalidad.
