import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { TablaCatalogo } from '../components/configuracion/TablaCatalogo.jsx'

// Base mínima de inventario (Fase 14): solo lo necesario para describir un
// documento línea por línea y exportarlo a WordOffice — no es un módulo de
// inventario completo (sin existencias, kardex ni costeo, eso sigue en Fase 15/16).
export function InventarioPage() {
  const { empresaId, empresaActual } = useAuth()
  const [productos, setProductos] = useState(null)
  const [bodegas, setBodegas] = useState(null)

  const puedeEditar = ['ADMINISTRADOR', 'AUXILIAR_CONTABLE', 'CONTADOR'].includes(empresaActual?.rolCodigo)

  function cargarProductos() {
    api.listarProductos().then(setProductos)
  }
  function cargarBodegas() {
    api.listarBodegas().then(setBodegas)
  }

  useEffect(() => {
    cargarProductos()
    cargarBodegas()
  }, [empresaId])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Inventario</h1>
        <p className="text-sm text-slate-500">Catálogo de productos y bodegas usado para describir documentos línea por línea</p>
      </div>

      <TablaCatalogo
        titulo="Productos"
        columnas={[
          { campo: 'codigo', etiqueta: 'Código' },
          { campo: 'nombre', etiqueta: 'Nombre' },
          { campo: 'unidadMedida', etiqueta: 'Unidad de medida' },
        ]}
        filas={productos}
        puedeEditar={puedeEditar}
        valoresIniciales={{ codigo: '', nombre: '', unidadMedida: '' }}
        camposFormulario={[
          { nombre: 'codigo', etiqueta: 'Código' },
          { nombre: 'nombre', etiqueta: 'Nombre' },
          { nombre: 'unidadMedida', etiqueta: 'Unidad de medida' },
        ]}
        onCrear={async (form) => {
          await api.crearProducto(form)
          cargarProductos()
        }}
      />

      <TablaCatalogo
        titulo="Bodegas"
        columnas={[
          { campo: 'codigo', etiqueta: 'Código' },
          { campo: 'nombre', etiqueta: 'Nombre' },
        ]}
        filas={bodegas}
        puedeEditar={puedeEditar}
        valoresIniciales={{ codigo: '', nombre: '' }}
        camposFormulario={[
          { nombre: 'codigo', etiqueta: 'Código' },
          { nombre: 'nombre', etiqueta: 'Nombre' },
        ]}
        onCrear={async (form) => {
          await api.crearBodega(form)
          cargarBodegas()
        }}
      />
    </div>
  )
}
