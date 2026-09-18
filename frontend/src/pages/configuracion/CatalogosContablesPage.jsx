import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { TablaCatalogo } from '../../components/configuracion/TablaCatalogo.jsx'

export function CatalogosContablesPage() {
  const { empresaId, empresaActual } = useAuth()
  const [cuentas, setCuentas] = useState(null)
  const [centros, setCentros] = useState(null)
  const [formas, setFormas] = useState(null)

  const puedeEditar = ['ADMINISTRADOR', 'AUXILIAR_CONTABLE', 'CONTADOR'].includes(empresaActual?.rolCodigo)

  function cargarCuentas() {
    api.listarCuentasContables().then(setCuentas)
  }
  function cargarCentros() {
    api.listarCentrosCosto().then(setCentros)
  }
  function cargarFormas() {
    api.listarFormasPago().then(setFormas)
  }

  useEffect(() => {
    cargarCuentas()
    cargarCentros()
    cargarFormas()
  }, [empresaId])

  return (
    <div className="space-y-4">
      <TablaCatalogo
        titulo="Cuentas contables"
        columnas={[
          { campo: 'codigo', etiqueta: 'Código' },
          { campo: 'nombre', etiqueta: 'Nombre' },
          { campo: 'naturaleza', etiqueta: 'Naturaleza' },
        ]}
        filas={cuentas}
        puedeEditar={puedeEditar}
        valoresIniciales={{ codigo: '', nombre: '', naturaleza: 'DEBITO' }}
        camposFormulario={[
          { nombre: 'codigo', etiqueta: 'Código' },
          { nombre: 'nombre', etiqueta: 'Nombre' },
          { nombre: 'naturaleza', etiqueta: 'Naturaleza', opciones: ['DEBITO', 'CREDITO'] },
        ]}
        onCrear={async (form) => {
          await api.crearCuentaContable(form)
          cargarCuentas()
        }}
      />

      <TablaCatalogo
        titulo="Centros de costo"
        columnas={[
          { campo: 'codigo', etiqueta: 'Código' },
          { campo: 'nombre', etiqueta: 'Nombre' },
        ]}
        filas={centros}
        puedeEditar={puedeEditar}
        valoresIniciales={{ codigo: '', nombre: '' }}
        camposFormulario={[
          { nombre: 'codigo', etiqueta: 'Código' },
          { nombre: 'nombre', etiqueta: 'Nombre' },
        ]}
        onCrear={async (form) => {
          await api.crearCentroCosto(form)
          cargarCentros()
        }}
      />

      <TablaCatalogo
        titulo="Formas de pago"
        columnas={[
          { campo: 'codigo', etiqueta: 'Código' },
          { campo: 'nombre', etiqueta: 'Nombre' },
        ]}
        filas={formas}
        puedeEditar={puedeEditar}
        valoresIniciales={{ codigo: '', nombre: '' }}
        camposFormulario={[
          { nombre: 'codigo', etiqueta: 'Código' },
          { nombre: 'nombre', etiqueta: 'Nombre' },
        ]}
        onCrear={async (form) => {
          await api.crearFormaPago(form)
          cargarFormas()
        }}
      />
    </div>
  )
}
