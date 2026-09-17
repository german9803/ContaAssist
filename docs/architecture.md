# Arquitectura — ContaAssist

## A. Estado actual del repositorio

Inspección realizada el 2026-09-17:

- El directorio `/Users/germancastillogaona/Documents/GERMAN/ContaAssist` está **vacío**.
- No es un repositorio Git (`git status` no aplica, no existe `.git`).
- No hay `package.json`, `.env`, código fuente, ni configuración previa.
- No hay tecnologías instaladas ni dependencias que preservar.
- No existen archivos de ejemplo, plantillas ni documentación previa de WordOffice/Siigo.

**Conclusión:** este es un proyecto nuevo. No hay riesgo de sobrescribir trabajo existente. Se parte de cero siguiendo las fases definidas en `roadmap.md`.

## Visión general

ContaAssist es una capa intermedia de preparación contable:

```
RECIBIR → EXTRAER → NORMALIZAR → VALIDAR → REVISAR → MAPEAR → TRANSFORMAR → EXPORTAR → IMPORTAR
```

No contabiliza ni reemplaza un sistema contable. Su salida es **información validada y transformada, lista para importar** al sistema destino (WordOffice, Siigo, Excel/CSV, u otros futuros).

## Diagrama de arquitectura

```
                         FUENTES
        ┌───────┬───────┬───────┬───────┬───────────┐
        │  PDF  │  XML  │ Excel │  CSV  │ Imágenes  │ Entrada manual
        └───┬───┴───┬───┴───┬───┴───┬───┴─────┬─────┘
            └───────┴───────┴───────┴─────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │   CENTRO DE CARGA   │  (upload, storage, registro de carga)
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │   INGESTA / EXTRACCIÓN │ (parsers por tipo de archivo)
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │    NORMALIZACIÓN    │ (modelo interno unificado)
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │  VALIDATION ENGINE  │ (reglas extensibles)
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │   REVISIÓN HUMANA   │ (edición, aprobación, rechazo)
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │       MAPEO         │ (equivalencias por empresa/destino)
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │ TRANSFORMATION ENGINE│ (modelo interno → modelo destino)
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │   EXPORT ENGINE     │ (generación de archivo + historial)
                 └──────────┬──────────┘
                            ▼
                  MOTOR DE ADAPTADORES
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        WordOffice       Siigo      Excel/CSV      [futuro]
```

Transversal a todo el flujo: **Autenticación/Autorización**, **Multiempresa**, **Auditoría**.

## Principios de diseño

1. **Modelo interno independiente del destino.** Ningún módulo de ingesta/validación conoce el formato de WordOffice o Siigo.
2. **Adaptadores aislados.** Cada sistema destino es un plugin que implementa una interfaz común (`transformation-engine`), sin modificar el núcleo.
3. **Reglas de validación desacopladas de los controladores.** Viven en un `validation-engine` con reglas registrables.
4. **Multiempresa por diseño.** Todo registro relevante lleva `empresa_id`; el aislamiento se hace a nivel de base de datos y de middleware de autorización, no solo en el frontend.
5. **Trazabilidad.** Todo cambio sobre un documento queda en auditoría (usuario, fecha, campo, valor anterior/nuevo).
6. **No inventar formatos de destino.** Un adaptador solo se construye con documentación oficial, plantillas o archivos de ejemplo reales; si falta información, queda como pendiente (ver `transformation-engine.md`).

## Estructura de carpetas propuesta (monorepo)

```
contaassist/
├── frontend/                  React + Vite
├── backend/
│   ├── src/
│   │   ├── modules/            (empresas, usuarios, terceros, documentos, cargas, exportaciones, reportes)
│   │   ├── document-processing/ (parsers PDF/XML/Excel/CSV/imágenes)
│   │   ├── validation-engine/
│   │   ├── transformation-engine/
│   │   ├── adapters/
│   │   │   ├── wordoffice/
│   │   │   ├── siigo/
│   │   │   ├── excel/
│   │   │   └── csv/
│   │   ├── export-engine/
│   │   ├── authentication/
│   │   ├── audit/
│   │   ├── ai/                 (placeholder, Fase 16-17)
│   │   └── shared/              (modelo interno, tipos, utils)
│   └── prisma/                  (schema.prisma, migrations)
├── database/                    (scripts SQL, seeds)
└── docs/
```

Esta separación evita lo que el brief pide prevenir: lógica de negocio en componentes React, SQL mezclado con rutas, controladores sobrecargados.

## Riesgos técnicos identificados

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Construir un adaptador sin documentación oficial completa | Exportaciones rechazadas por el sistema destino | Regla dura: no construir sin manual/plantilla/ejemplo real (sección 30) |
| Fuga de datos entre empresas (multiempresa) | Crítico — confidencialidad | `empresa_id` obligatorio + verificación en middleware de autorización en cada query, no solo en el frontend |
| OCR/extracción de PDF con baja precisión | Datos incorrectos pasan a validación | Extracción se marca siempre como "requiere revisión humana" hasta validar precisión por proveedor |
| Duplicidad de documentos (mismo NIT+número+fecha) | Doble importación al contable | Regla de validación de duplicados obligatoria antes de aprobar |
| Cambios de formato del sistema destino sin aviso | Exportaciones rotas en producción | Versionar cada adaptador (`version del formato`) y registrar la versión usada en cada exportación |
| Archivos maliciosos en Centro de Carga | Seguridad | Validación de tipo MIME real (no solo extensión), límite de tamaño, escaneo antes de procesar |
| Crecimiento de reglas de validación como código no mantenible | Deuda técnica | Reglas como unidades independientes registradas en un registry, no si/else en controladores |
