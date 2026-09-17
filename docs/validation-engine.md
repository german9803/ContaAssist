# Validation Engine

Componente independiente de los controladores. Ninguna regla de validación se escribe directamente en una ruta HTTP o en un servicio de negocio de otro módulo.

## Diseño: registro de reglas (Rule Registry)

```
interface ReglaValidacion {
  codigo: string;                 // coincide con reglas_validacion.codigo
  severidad: 'BLOQUEANTE' | 'ADVERTENCIA';
  aplicaA(documento): boolean;    // filtro opcional (ej. solo FACTURA_COMPRA)
  evaluar(documento, contexto): ResultadoValidacion;
}

interface ResultadoValidacion {
  resultado: 'OK' | 'FALLA';
  mensaje?: string;
}
```

El motor recibe un `documento` + su `contexto` (terceros conocidos, documentos previos de la empresa, catálogo de cuentas) y ejecuta todas las reglas activas aplicables, guardando cada resultado en `documento_validaciones`.

```
ValidationEngine.ejecutar(documento, contexto):
  reglas = RuleRegistry.obtenerActivas().filter(r => r.aplicaA(documento))
  para cada regla:
    resultado = regla.evaluar(documento, contexto)
    guardar documento_validaciones(documento, regla, resultado)
  si alguna regla BLOQUEANTE falló → documento.estado = PENDIENTE_REVISION
```

Agregar una regla nueva = crear un archivo que implemente `ReglaValidacion` y registrarlo; no se toca el motor ni los controladores.

## Reglas iniciales (Fase 8)

| Código | Severidad | Descripción |
|---|---|---|
| `NIT_INVALIDO` | BLOQUEANTE | Identificación del tercero no cumple el algoritmo de dígito de verificación (NIT) o formato válido |
| `DUPLICADO_DOCUMENTO` | BLOQUEANTE | Mismo tercero + número + tipo de documento ya existe en la empresa |
| `CAMPO_OBLIGATORIO_FALTANTE` | BLOQUEANTE | Número, fecha, tercero o total ausentes tras la extracción |
| `FECHA_INVALIDA` | BLOQUEANTE | Fecha de emisión futura o fuera del período contable abierto |
| `TOTAL_DESCUADRADO` | BLOQUEANTE | subtotal + impuestos − retenciones ≠ total (con tolerancia de redondeo) |
| `IMPUESTO_INCONSISTENTE` | ADVERTENCIA | El porcentaje del impuesto detectado no corresponde a ningún impuesto del catálogo |
| `TERCERO_NO_IDENTIFICADO` | BLOQUEANTE | No fue posible resolver el tercero a un registro existente ni crear uno nuevo automáticamente |
| `CUENTA_NO_ASIGNADA` | ADVERTENCIA | El documento no tiene cuenta contable sugerida ni asignada |
| `CENTRO_COSTO_REQUERIDO` | ADVERTENCIA | La empresa exige centro de costo y el documento no lo tiene |
| `FORMA_PAGO_FALTANTE` | ADVERTENCIA | No se identificó forma de pago |

Las reglas `BLOQUEANTE` impiden pasar a `APROBADO` sin corrección; las `ADVERTENCIA` se muestran en revisión pero no bloquean.

## Extensibilidad

- Reglas por empresa: `reglas_validacion` puede activarse/desactivarse por empresa mediante una tabla de configuración futura (no requerida en Fase 8, pero el diseño de `aplicaA(documento)` ya lo permite pasando la empresa en el contexto).
- Reglas específicas de un sistema destino (ej. WordOffice exige centro de costo siempre) se agregan como reglas condicionadas al `sistema_destino` configurado, sin modificar las reglas genéricas.
