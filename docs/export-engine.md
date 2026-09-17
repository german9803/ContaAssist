# Export Engine

## Flujo de exportación (sección 16)

```
1. Usuario selecciona: Empresa, Período (fecha inicio/fin), Tipo de información, Sistema destino
2. Export-engine consulta documentos candidatos:
   documentos WHERE empresa_id = X AND fecha_emision BETWEEN periodo
                AND tipo_informacion = Y AND estado IN (APROBADO, LISTO_PARA_EXPORTAR)
3. Validación final (bloqueante):
   - todos los documentos tienen mapeo resuelto para el sistema destino
   - ninguno está en estado ERROR, DUPLICADO o RECHAZADO dentro del lote
   - se re-ejecutan las reglas BLOQUEANTE del validation-engine (por si cambió algo desde la aprobación)
4. Se muestra resumen:
   ✓ N documentos listos
   ⚠ M documentos pendientes (excluidos automáticamente, listados por número/tercero)
   Si hay errores críticos (mapeo faltante en documentos que el usuario intentó forzar) → se bloquea el botón "Generar archivo"
5. Al confirmar:
   - transformation-engine.transformar(documentos, mapeos)
   - adapter.generarArchivo(registros) → Buffer (ExcelJS para xlsx/csv, PDFKit si se requiere comprobante)
   - se almacena el archivo generado
   - se crea el registro `exportacion` + `exportacion_documentos`
   - los documentos incluidos pasan a estado EXPORTADO
   - se registra en auditoría: GENERAR_EXPORTACION
```

## Reglas de bloqueo

- Un documento con una regla `BLOQUEANTE` en falla nunca se incluye en una exportación, sin importar su estado.
- Si el usuario intenta exportar un período sin documentos elegibles, el sistema lo indica explícitamente (no genera un archivo vacío silenciosamente).
- La exportación es idempotente respecto al documento: un documento ya `EXPORTADO` no se vuelve a incluir en una nueva exportación del mismo tipo/período (evita duplicar el registro en el sistema contable). Reexportar un documento ya exportado requiere una acción explícita ("reexportar"), auditada por separado.

## Historial (sección 17)

Cada fila de `exportaciones` conserva: usuario, empresa, fecha, sistema destino, tipo, cantidad, archivo generado, versión del formato usada y estado. El campo `version_formato` permite detectar si una exportación antigua se generó con una versión de adaptador distinta a la actual, útil cuando el sistema destino cambia su plantilla.

## Formatos de salida (sección 20)

- **Excel (.xlsx):** `ExcelJS` — usado tanto para el adaptador "Excel" genérico como para reportes exportables (sección 19).
- **CSV:** generación propia (delimitador y encoding configurables por el adaptador CSV, ya que distintos sistemas destino pueden exigir separadores distintos).
- **PDF:** `PDFKit` — reservado para comprobantes o reportes en PDF, no para el archivo de importación en sí (los sistemas contables destino no importan PDF).
