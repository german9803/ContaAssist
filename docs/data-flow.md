# Flujo de datos y estados

## Estados de una carga (`cargas.estado`)

```
RECIBIDO → PROCESANDO → PROCESADO
                 └──► ERROR
```

## Estados de un archivo (`archivos_origen.estado`)

```
RECIBIDO → PROCESANDO → PROCESADO
                 └──► ERROR
```

## Estados de un documento (`documentos.estado`)

Estado principal del ciclo de vida de cada documento contable:

```
RECIBIDO
   ↓
PROCESANDO
   ↓
PROCESADO
   ↓
PENDIENTE_REVISION
   ↓
APROBADO
   ↓
LISTO_PARA_EXPORTAR
   ↓
EXPORTADO
```

Estados laterales, alcanzables desde cualquier punto del flujo principal salvo `EXPORTADO`:

```
ERROR        — falló la extracción o el documento quedó inconsistente
DUPLICADO    — coincide con un documento ya existente (mismo tercero+número+tipo)
RECHAZADO    — un contador/auxiliar decide que el documento no debe procesarse
```

Reglas de transición:

- `PROCESADO → PENDIENTE_REVISION` es automático si el validation-engine devuelve al menos una regla `BLOQUEANTE` en falla, o si el documento requiere clasificación contable que no pudo sugerirse.
- `PROCESADO → APROBADO` directo solo es posible si todas las reglas bloqueantes pasaron y la empresa tiene configurada auto-aprobación (por defecto, desactivada: toda la información pasa por revisión humana al menos una vez).
- `APROBADO → LISTO_PARA_EXPORTAR` requiere que el mapeo (cuenta, tercero, forma de pago) esté resuelto para el sistema destino elegido.
- `DUPLICADO` y `RECHAZADO` son estados terminales: no participan en exportación. Quedan visibles en Documentos/Reportes para trazabilidad.
- Ningún documento pasa a `EXPORTADO` fuera del export-engine (no se marca manualmente).

## Flujo extremo a extremo (ejemplo: 200 facturas de proveedor)

```
1. Auxiliar sube 200 PDF al Centro de Carga
   → se crea 1 registro `carga`, 200 registros `archivo_origen` (estado RECIBIDO)

2. Cada archivo se encola para procesamiento
   → archivo_origen.estado = PROCESANDO
   → se ejecuta el parser de PDF correspondiente

3. Por cada archivo procesado exitosamente:
   → se crea 1 `documento` (estado PROCESADO) con sus `documento_detalles`,
     `documento_impuestos`, `documento_retenciones`
   → si el parser falla: archivo_origen.estado = ERROR, no se crea documento

4. Validation-engine evalúa cada documento
   → se registran filas en `documento_validaciones`
   → si hay regla BLOQUEANTE en falla o falta clasificación: documento.estado = PENDIENTE_REVISION
   → si coincide con un documento existente: documento.estado = DUPLICADO

5. Auxiliar revisa los documentos en PENDIENTE_REVISION
   → corrige campos, sugiere/asigna cuenta y centro de costo
   → aprueba (estado = APROBADO) o rechaza (estado = RECHAZADO)

6. Sistema resuelve mapeo para el sistema destino configurado
   → si todas las referencias mapean correctamente: estado = LISTO_PARA_EXPORTAR
   → si falta una equivalencia: permanece en APROBADO y se lista como pendiente de mapeo

7. Auxiliar/contador genera la exportación (empresa + período + tipo + destino)
   → validación final (ver export-engine.md)
   → transformation-engine aplica el adaptador del sistema destino
   → export-engine genera el archivo físico y crea el registro `exportacion`
   → los documentos incluidos pasan a estado EXPORTADO
```
