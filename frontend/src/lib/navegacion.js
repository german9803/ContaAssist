import {
  LayoutDashboard,
  UploadCloud,
  FileStack,
  ShoppingCart,
  Receipt,
  Users,
  Landmark,
  Wallet,
  CreditCard,
  Package,
  ArrowLeftRight,
  FileOutput,
  BarChart3,
  Sparkles,
  Settings,
} from 'lucide-react'

// Menú principal (sección 10 del brief). `implementado: false` renderiza un
// placeholder honesto en vez de simular una funcionalidad que no existe todavía.
export const MODULOS = [
  { path: '/', label: 'Inicio', icon: LayoutDashboard, implementado: true },
  { path: '/centro-carga', label: 'Centro de carga', icon: UploadCloud, implementado: true },
  { path: '/documentos', label: 'Documentos', icon: FileStack, implementado: true },
  { path: '/compras', label: 'Compras', icon: ShoppingCart, implementado: true },
  { path: '/ventas', label: 'Ventas', icon: Receipt, implementado: true },
  { path: '/terceros', label: 'Terceros', icon: Users, implementado: true },
  { path: '/bancos', label: 'Bancos', icon: Landmark, implementado: true },
  { path: '/cartera', label: 'Cartera', icon: Wallet, implementado: true },
  { path: '/cuentas-por-pagar', label: 'Cuentas por pagar', icon: CreditCard, implementado: true },
  { path: '/inventario', label: 'Inventario', icon: Package, implementado: true },
  { path: '/mapeo', label: 'Mapeo de datos', icon: ArrowLeftRight, implementado: true },
  { path: '/exportaciones', label: 'Exportaciones', icon: FileOutput, implementado: true },
  { path: '/reportes', label: 'Reportes', icon: BarChart3, nota: 'Depende de que existan documentos (Fase 7) y exportaciones (Fase 13)' },
  { path: '/asistente-ia', label: 'Asistente IA', icon: Sparkles, fase: 17 },
  { path: '/configuracion', label: 'Configuración', icon: Settings, implementado: true },
]
