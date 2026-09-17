# Seguridad

## Autenticación y sesión
- JWT de acceso de vida corta + refresh token; `password_hash` con bcrypt (costo ≥ 12).
- Rate limiting en `/api/auth/login` para mitigar fuerza bruta.

## Autorización y multiempresa
- Cada request resuelve `empresa_id` verificando la relación `usuario_empresa_rol` del usuario autenticado — nunca se confía en un `empresa_id` enviado por el cliente sin validarlo contra esa tabla.
- Autorización por rol a nivel de middleware (`ADMINISTRADOR`, `AUXILIAR_CONTABLE`, `CONTADOR`, `CONSULTA`), con el catálogo `permisos`/`rol_permisos` ya modelado para granularidad futura sin migrar el esquema.
- `CONSULTA` bloqueado a nivel de middleware en todos los verbos de escritura (POST/PATCH/DELETE), no solo ocultado en el frontend.

## Archivos
- Validación de tipo real por contenido (magic bytes / MIME detection), no solo por extensión.
- Límite de tamaño por archivo y por carga.
- Nombre de archivo saneado antes de almacenar; ruta de almacenamiento generada por el servidor, nunca a partir del nombre original del usuario (evita path traversal).
- `hash_sha256` para detectar reintentos de carga del mismo archivo.

## Base de datos
- Prisma ORM con consultas parametrizadas — sin concatenación de SQL en ningún punto del código.
- Índices y constraints de unicidad descritos en `database.md` reforzados también a nivel de aplicación (mensajes de error claros en vez de depender solo del error de la BD).

## Configuración y secretos
- Variables sensibles (cadena de conexión, secreto JWT, credenciales) solo en variables de entorno, nunca en el repositorio.
- `.env.example` documenta las variables requeridas sin valores reales.
- CORS restringido a los orígenes del frontend conocidos (no `*`).

## Auditoría
- Toda modificación relevante sobre `documentos`, aprobación/rechazo, y generación de exportaciones queda registrada en `auditoria` con usuario, fecha, campo, valor anterior y nuevo (sección 23).
- La tabla de auditoría es append-only.

## Manejo de errores
- Los mensajes de error hacia el cliente no exponen detalles internos (stack traces, nombres de tablas, rutas de archivos del servidor); el detalle completo se registra solo en logs del servidor.
