# Adaptador WordOffice

## Fuente oficial (Fase 14, 2026-09-18)

El usuario aportó 5 archivos reales de importación a WordOffice, ya usados con éxito por su empresa (El Castillo del Cerdo PC San Martin SAS):

| Archivo | Tipo WordOffice | Filas | Uso en este adaptador |
|---|---|---|---|
| `DocumentosComprasEncabezados24-31_AGOSTO.xls` | `FC` (compras) | 49 | Fuente de `COLUMNAS_COMPRAS` en `mapper.js` |
| `ventas.xls` | `FV` (ventas) | 1654 | Fuente de `COLUMNAS_VENTAS` en `mapper.js` |
| `InterfaceWorldOffice.01-07_SEPTIEMBRE.xls` | `DMC` (nota crédito compra) | 18 | Confirma que `DMC` comparte el layout de `FV` (57 columnas, mismos encabezados) — no se construyó un adaptador para `DMC`, solo se usó para verificar el layout |
| `ComprobanteEgresoEncabezados18-23_AGOSTO CE.xls` | `CE` | 56 | Fuera de alcance (tesorería, Fase 15) |
| `ReciboCajaEncabezados31_AGOSTO.xls` | `RC` | 111 | Fuera de alcance (tesorería, Fase 15) |

Las columnas de `mapper.js` se generaron **programáticamente** leyendo los encabezados reales (no se transcribieron a mano) para eliminar errores de conteo/transcripción — ver el script usado en la sesión de implementación si se necesita reproducir la extracción contra un archivo nuevo.

## Por qué solo compras y ventas

WordOffice resuelve la cuenta contable de cada línea a partir del **producto** — la interfaz de compras/ventas es un movimiento de inventario (producto+bodega+cantidad+valor unitario por línea), no un asiento contable. Por eso Fase 14 tuvo que construir primero una base mínima de inventario en ContaAssist (`Producto`, `Bodega`, `DocumentoDetalle`, `MapeoProducto`, `MapeoBodega`) antes de poder generar este archivo con datos reales.

## Supuestos documentados (no verificables con los datos de ejemplo)

- **`Detalle: IVA` como porcentaje, no valor.** En ambos archivos reales esta columna es `0.0` en el 100% de las filas (el negocio vende carne, exenta de IVA en Colombia), así que no hay evidencia para decidir entre porcentaje y valor absoluto. Se implementó como **porcentaje** (`documento_detalles.porcentaje_iva`), consistente con cómo el resto de ContaAssist modela IVA. **Verificar en la primera importación real con un producto gravado.**
- **`Encab: Tercero Interno` es un parámetro de exportación, no un dato del documento.** Es constante por lote en ambos archivos (1019103885 en todo el de compras, 1057489487 en todo el de ventas) — parece ser un usuario/serie interna de WordOffice. Se pide como `parametrosAdaptador.terceroInterno` (obligatorio) al generar la exportación, no se deriva de ningún campo de `Documento`.
- **`Detalle: Nota` y `Detalle: Centro costos` también son constantes por lote** (`"COMPRA DE CERDO"` / `"Interface Tecno Carnes"` y `"PC SAN MARTIN SAS"` respectivamente, iguales en todas las filas del archivo). Se exponen como `parametrosAdaptador.notaLinea` y `parametrosAdaptador.centroCostosTexto`, ambos opcionales (vacíos si no se especifican) — no se fabrica un valor de negocio que ContaAssist no conoce.
- **`Encab: Documento Número` en COMPRAS se deja vacío.** Confirmado con el usuario: es un consecutivo que WordOffice controla internamente al importar, no algo que ContaAssist deba fijar. El número real de la factura del proveedor (lo único que ContaAssist conoce, extraído del XML) va en `Encab: Pref Dto Ext`/`Encab: No. Dto Ext`. En VENTAS sí es el consecutivo propio de la venta (`documento.numeroDocumento`), porque ahí no existe un "documento externo".
- **`.xlsx` en vez de `.xls`.** Los archivos reales son `.xls` (binario legado), pero el usuario confirmó que WordOffice también acepta `.xlsx`. Se generó con ExcelJS (igual que los adaptadores Excel/CSV de Fase 13) porque la librería del stack no puede escribir `.xls`. **Si la primera importación real falla por el formato de archivo, es la primera hipótesis a revisar.**
- **`Detalle: Vencimiento` en ventas sin fecha explícita se asume igual a la fecha de emisión** (venta de contado, mismo criterio que muestra el archivo real). En compras, si no hay `fechaVencimiento`, se deja vacío en vez de inventar un plazo.
- Las columnas `Personalizado*`, `Verificado`, `Anulado`, `Sucursal`, `Clasificación`, `Importacion` y `Detalle : Código Centro Costos` están vacías en el 100% de las filas de ambos archivos reales — se dejan vacías siempre.

## Qué falta (fuera de alcance de Fase 14)

- Adaptador para `DMC` (nota crédito de compra) — mismo layout que ventas, no se construyó por no ser prioridad del usuario en esta fase.
- Tesorería (`CE`/`RC`, comprobantes de egreso/recibos de caja) — pertenece a Bancos/Cartera (Fase 15), que no existe como módulo de negocio en ContaAssist todavía.
- Kardex, existencias y costeo de inventario reales — Fase 14 solo construyó el catálogo mínimo (producto/bodega/detalle) para poder describir un documento línea por línea, no un módulo de inventario completo.
