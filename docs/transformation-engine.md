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

  generarArchivo(registros: RegistroDestino[]): Buffer;
     // aplica el formato físico exacto (columnas, orden, encabezados, encoding)
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

No hay endpoint ni UI todavía — el motor no se expone hasta que Fase 13 lo invoque desde `/api/exportaciones`.

## Estado de los conectores (a la fecha de este documento)

| Sistema | Documentación oficial | Plantilla oficial | Archivo de ejemplo real | Estado |
|---|---|---|---|---|
| WordOffice | ⚠ Pendiente de aportar | ⚠ Pendiente | ⚠ Pendiente | **Bloqueado** — no iniciar Fase 14 sin estos insumos |
| Siigo | ⚠ Pendiente de aportar | ⚠ Pendiente | ⚠ Pendiente | **Bloqueado** |
| Excel | No aplica (formato propio) | Se define en Fase 13 | No aplica | Disponible para implementar sin bloqueos externos |
| CSV | No aplica (formato propio, delimitado) | Se define en Fase 13 | No aplica | Disponible para implementar sin bloqueos externos |

**Acción requerida del usuario antes de la Fase 14:** aportar para WordOffice y para Siigo, cada uno por separado: manual/documentación oficial de importación, plantilla de importación vigente, y al menos un archivo de ejemplo real ya cargado exitosamente al sistema. Sin esto, esas fases se posponen sin bloquear el resto del roadmap (Excel/CSV sí pueden avanzar).
