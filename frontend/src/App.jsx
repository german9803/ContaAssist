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
import { EquipoPage } from './pages/configuracion/EquipoPage.jsx'
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
          <Route path="/configuracion" element={<EquipoPage />} />

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
