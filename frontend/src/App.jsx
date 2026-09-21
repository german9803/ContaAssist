import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { RegistroPage } from './pages/RegistroPage.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { PlaceholderPage } from './pages/PlaceholderPage.jsx'
import { CentroCargaPage } from './pages/CentroCargaPage.jsx'
import { DocumentosPage } from './pages/DocumentosPage.jsx'
import { DocumentoDetallePage } from './pages/DocumentoDetallePage.jsx'
import { ComprasPage } from './pages/ComprasPage.jsx'
import { VentasPage } from './pages/VentasPage.jsx'
import { TercerosPage } from './pages/TercerosPage.jsx'
import { CuentasPorPagarPage } from './pages/CuentasPorPagarPage.jsx'
import { CarteraPage } from './pages/CarteraPage.jsx'
import { BancosPage } from './pages/BancosPage.jsx'
import { ExtractoDetallePage } from './pages/ExtractoDetallePage.jsx'
import { MapeoPage } from './pages/MapeoPage.jsx'
import { InventarioPage } from './pages/InventarioPage.jsx'
import { ExportacionesPage } from './pages/ExportacionesPage.jsx'
import { ConfiguracionPage } from './pages/ConfiguracionPage.jsx'
import { MODULOS } from './lib/navegacion.js'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegistroPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/centro-carga" element={<CentroCargaPage />} />
          <Route path="/documentos" element={<DocumentosPage />} />
          <Route path="/documentos/:id" element={<DocumentoDetallePage />} />
          <Route path="/compras" element={<ComprasPage />} />
          <Route path="/ventas" element={<VentasPage />} />
          <Route path="/terceros" element={<TercerosPage />} />
          <Route path="/cuentas-por-pagar" element={<CuentasPorPagarPage />} />
          <Route path="/cartera" element={<CarteraPage />} />
          <Route path="/bancos" element={<BancosPage />} />
          <Route path="/bancos/extractos/:id" element={<ExtractoDetallePage />} />
          <Route path="/mapeo" element={<MapeoPage />} />
          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="/exportaciones" element={<ExportacionesPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />

          {MODULOS.filter((m) => !m.implementado).map(({ path, label, fase, nota }) => (
            <Route key={path} path={path} element={<PlaceholderPage titulo={label} fase={fase} nota={nota} />} />
          ))}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
