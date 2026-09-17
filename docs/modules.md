# Arquitectura de módulos

Describe cómo se relacionan los módulos del pipeline: Ingesta → Procesamiento → Validación → Revisión → Mapeo → Transformación → Exportación.

## Responsabilidad de cada módulo

| Módulo | Entrada | Salida | Responsabilidad |
|---|---|---|---|
| **Ingesta** (Centro de Carga) | Archivos (PDF/XML/Excel/CSV/imágenes) | `archivo_origen` + `carga` registrados | Recibir, almacenar, calcular hash, detectar archivo duplicado, encolar para procesamiento |
| **Procesamiento** (document-processing) | `archivo_origen` | `documento` normalizado (posiblemente incompleto) | Seleccionar el parser correcto por tipo de archivo y extraer campos al modelo interno |
| **Validación** (validation-engine) | `documento` | `documento_validaciones` | Ejecutar reglas registradas (duplicados, NIT, totales, impuestos, campos obligatorios) |
| **Revisión** (UI de revisión humana) | `documento` + resultados de validación | `documento` corregido, estado `APROBADO` o `RECHAZADO` | Permitir al auxiliar/contador editar, corregir, aprobar o rechazar |
| **Mapeo** | `documento` aprobado + tablas `mapeo_*` de la empresa | Referencias resueltas a códigos del sistema destino | Traducir cuenta/tercero/forma de pago interno a código del destino configurado |
| **Transformación** (transformation-engine) | `documento` mapeado | Estructura en el formato del adaptador destino | Aplicar el adaptador correspondiente (WordOffice, Siigo, Excel, CSV) |
| **Exportación** (export-engine) | Documentos transformados de un período/tipo | Archivo físico + registro `exportacion` | Validación final, generación del archivo, historial |

## Flujo entre módulos

```
Ingesta ──► Procesamiento ──► Validación ──┬──► (BLOQUEANTE) ──► Revisión obligatoria
                                            └──► (OK/ADVERTENCIA) ──► Revisión opcional
                                                          │
                                                          ▼
                                                     Aprobación
                                                          │
                                                          ▼
                                                        Mapeo
                                                          │
                                                          ▼
                                                   Transformación
                                                          │
                                                          ▼
                                                    Exportación
```

Cada módulo se implementa como un servicio independiente en `backend/src/`, sin conocer los detalles internos de los demás — se comunican mediante el modelo interno (`documento` y sus relaciones) y no comparten lógica de negocio entre sí. Los controladores/rutas HTTP solo orquestan llamadas a estos servicios; no contienen reglas de negocio.

## Por qué esta separación

- **Testeable por módulo:** el validation-engine se prueba con documentos de ejemplo sin necesitar archivos reales ni un adaptador de destino.
- **Reemplazable sin romper el resto:** se puede cambiar el parser de PDF (ej. agregar OCR) sin tocar validación, mapeo o exportación.
- **Escalable a nuevos destinos:** agregar un sistema contable nuevo solo implica un nuevo adaptador en `transformation-engine`, no tocar ingesta ni validación.
