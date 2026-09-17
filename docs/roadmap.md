# Roadmap

Cada fase deja una base funcional para la siguiente. No se avanza a la siguiente fase con pruebas pendientes o documentación desactualizada.

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Arquitectura y documentación | **Completa** |
| 2 | Configuración inicial del proyecto (frontend Vite+React+Tailwind, backend Express, Prisma + SQL Server, estructura de carpetas) | **Completa** |
| 3 | Autenticación (JWT, login, roles base) | **Código completo — pendiente prueba end-to-end** (falta BD SQL Server accesible; ver nota abajo) |
| 4 | Empresas, usuarios y roles (multiempresa funcional) | Pendiente |
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

El módulo de autenticación (`backend/src/authentication/`) está implementado y cubierto por pruebas unitarias (`npm test`: hashing, JWT, middlewares de autorización — 13/13 OK), pero **no se ha probado contra una base de datos real** porque este entorno no tenía Docker ni SQL Server. Falta instalar Docker Desktop manualmente (requiere contraseña interactiva de macOS) y levantar un contenedor de SQL Server/Azure SQL Edge para: aplicar `prisma migrate dev`, correr `prisma:seed` y probar el flujo de login de punta a punta.

## Información que el usuario debe aportar antes de Fase 14

Para **cada** sistema contable (WordOffice, Siigo):
1. Documentación/manual oficial del formato de importación.
2. Plantilla oficial de importación (archivo modelo).
3. Al menos un archivo de ejemplo real ya importado exitosamente.
4. Reglas de validación propias del destino (campos obligatorios, catálogos cerrados, longitudes).

Sin este insumo la Fase 14 no se inicia para ese sistema; el roadmap continúa con las demás fases (Excel/CSV, bancos/cartera, etc.) sin quedar bloqueado en su totalidad.
