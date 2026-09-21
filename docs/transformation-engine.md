# Transformation Engine y Motor de Adaptadores

## Interfaz común de adaptador

Todo sistema destino implementa la misma interfaz; el core solo conoce esta interfaz, nunca los detalles internos de WordOffice o Siigo.

```
interface AccountingSystemAdapter {
  codigo: string;                 // coincide con sistemas_destino.codigo
  versionFormato: string;

  validarPrerequisitos(documentos, mapeos): ErrorAdaptador[];
     // ej.: "documento X no tiene código de tercero mapeado a este destino"

  transformar(documentos, mapeos): RegistroDestino[];
     // documento interno + mapeos → estructura propia del destino

  generarArchivo(registros: RegistroDestino[], parametros?: object): Buffer;
     // aplica el formato físico exacto (columnas, orden, encabezados, encoding)
     // `parametros` (Fase 14): constantes de exportación que el adaptador
     // necesita pero que no viven en ningún documento (ej. WordOffice exige
     // un "tercero interno" fijo por lote) — export-engine las recibe del
     // usuario al generar y las pasa tal cual, EXCEL/CSV las ignoran.
}
```

`transformation-engine` orquesta: resuelve el adaptador según `sistemas_destino.codigo`, llama `validarPrerequisitos`, luego `transformar`. `export-engine` es quien invoca `generarArchivo` y persiste el resultado.

## Estructura en código

```
/adapters
   /wordoffice
       adapter.ts
       mapper.ts        // reglas específicas de mapeo de campos
       README.md        // fuente de la documentación oficial usada
   /siigo
       adapter.ts
       mapper.ts
       README.md
   /excel
       adapter.ts        // formato propio, libre, definido por ContaAssist
   /csv
       adapter.ts
```

Cada carpeta de adaptador incluye su propio `README.md` citando la fuente oficial (manual, plantilla, versión) que se usó para construirlo — trazabilidad exigida por la sección 30.

## Regla dura: no inventar formatos

Antes de escribir el adaptador de WordOffice o Siigo se requiere, como mínimo:

1. Documentación oficial del formato de importación (manual del proveedor).
2. Plantilla oficial de importación (archivo modelo vacío).
3. Al menos un archivo de ejemplo real, ya importado exitosamente por el cliente, para verificar contra un caso real.
4. Reglas de validación propias del destino (campos obligatorios, longitudes máximas, catálogos cerrados de códigos, etc.).

Si falta alguno de estos insumos, el adaptador **no se construye**: se documenta como pendiente en la tabla de abajo y se prioriza otra fase del roadmap mientras se consigue la información.

## Estado del motor (Fase 12)

El motor (`backend/src/transformation-engine/`) y la interfaz de adaptador ya están implementados: `registry.js` (registro de adaptadores por `sistemas_destino.codigo`, vacío hasta que la Fase 13/14 agregue el primero) y `engine.js`, con dos funciones:

- `resolverPrerequisitosExportacion({ empresaId, usuarioId, sistemaDestinoCodigo, documentoIds })` — paso 6 de `data-flow.md`: carga los documentos (`APROBADO`/`LISTO_PARA_EXPORTAR`) y el mapeo de la empresa para ese destino, llama `adaptador.validarPrerequisitos`, y pasa a `LISTO_PARA_EXPORTAR` (con auditoría) los que no tienen errores; el resto queda en `APROBADO` y se reporta agrupado por documento.
- `transformarParaExportar({ empresaId, sistemaDestinoCodigo, documentoIds })` — exige que los documentos ya estén `LISTO_PARA_EXPORTAR`, llama `adaptador.transformar` y devuelve los registros en memoria, sin generar archivo ni persistir (eso es `export-engine`, Fase 13).

Si el `sistemas_destino.codigo` no tiene adaptador registrado, ambas funciones fallan con 501 — hoy eso pasa para los 4 destinos sembrados (WORDOFFICE/SIIGO/EXCEL/CSV), porque ningún adaptador concreto existe todavía. Verificado de punta a punta contra PostgreSQL real con un adaptador de prueba (no commiteado): documento con mapeo completo → `LISTO_PARA_EXPORTAR` → `transformar` produce el registro esperado; documento con una referencia sin mapear → se queda en `APROBADO` y se reporta como pendiente; `transformarParaExportar` rechaza (409) un documento que no llegó a `LISTO_PARA_EXPORTAR`; sistema destino sin adaptador → 501.

Fase 13 conectó el motor a `/api/exportaciones` vía `backend/src/export-engine/exportEngine.js`, con los dos primeros adaptadores reales registrados (`EXCEL`, `CSV` — ver nota de Fase 13 en `roadmap.md`). Fase 14 agregó el adaptador real de WordOffice (compras y ventas) — ver `backend/src/adapters/wordoffice/README.md` para la fuente oficial exacta y los supuestos documentados.

## Estado de los conectores (a la fecha de este documento)

| Sistema | Documentación oficial | Plantilla oficial | Archivo de ejemplo real | Estado |
|---|---|---|---|---|
| WordOffice | No aplica (formato de import por Excel, sin manual escrito aportado) | `backend/src/adapters/wordoffice/mapper.js` (columnas extraídas del archivo real) | 5 archivos reales del usuario (ver README del adaptador) | **Implementado** (Fase 14) para `FACTURA_COMPRA`/`FACTURA_VENTA`. Nota crédito de compra (`DMC`) y tesorería (`CE`/`RC`, Bancos/Cartera) quedan fuera de alcance |
| Siigo | ⚠ Pendiente de aportar | ⚠ Pendiente | ⚠ Pendiente | **Bloqueado** — no se ha aportado ningún insumo propio de Siigo |
| Excel | No aplica (formato propio) | `backend/src/adapters/formatoContaAssist.js` | No aplica | **Implementado** (Fase 13) |
| CSV | No aplica (formato propio, delimitado) | `backend/src/adapters/formatoContaAssist.js` | No aplica | **Implementado** (Fase 13) |

**Acción requerida del usuario antes de continuar con Siigo:** aportar manual/documentación oficial de importación, plantilla vigente, y al menos un archivo de ejemplo real ya cargado exitosamente al sistema. Sin esto, ese adaptador se pospone sin bloquear el resto del roadmap.

## Nota sobre Fase 14 (adaptador WordOffice)

WordOffice resuelve la cuenta contable de cada línea de compra/venta a partir del **producto**, no de un asiento de cabecera: su interfaz de importación es un movimiento de inventario por línea (producto+bodega+cantidad+valor unitario). El modelo de `Documento` hasta Fase 13 era solo de cabecera, así que esta fase tuvo que implementar primero la base de inventario que `docs/database.md` ya documentaba desde Fase 1 pero nunca se había construido: `Producto`, `Bodega`, `DocumentoDetalle`, `MapeoProducto`, `MapeoBodega`.

Fuentes de datos de línea disponibles hoy: el parser de XML (factura electrónica DIAN) extrae `cac:InvoiceLine` automáticamente; la plantilla propia de ContaAssist (CSV/XLSX) acepta columnas de línea opcionales (`producto_codigo`, `producto_descripcion`, `cantidad`, `valor_unitario`, `porcentaje_iva_linea`, `descuento`, `bodega_codigo`) y agrupa varias filas del mismo documento en líneas. PDF/imágenes/XLS siguen sin extracción de línea (gap documentado, igual que en Fase 7); un documento sin líneas simplemente no puede exportarse a WordOffice hasta que se le asignen manualmente desde `DocumentoDetallePage`.

`parametrosAdaptador` (nuevo, Fase 14): WordOffice exige `terceroInterno` (código de usuario/serie interna de WordOffice, constante por lote — no se deriva de ningún documento) y acepta opcionalmente `notaLinea`/`centroCostosTexto`. Se piden en el formulario de exportación y se validan en `export-engine`, no en el motor de transformación.
