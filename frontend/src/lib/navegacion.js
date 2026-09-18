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
  { path: '/terceros', label: 'Terceros', icon: Users, fase: 10 },
  { path: '/bancos', label: 'Bancos', icon: Landmark, fase: 15 },
  { path: '/cartera', label: 'Cartera', icon: Wallet, fase: 15 },
  { path: '/cuentas-por-pagar', label: 'Cuentas por pagar', icon: CreditCard, fase: 15 },
  { path: '/inventario', label: 'Inventario', icon: Package, fase: 15 },
  { path: '/mapeo', label: 'Mapeo de datos', icon: ArrowLeftRight, fase: 11 },
  { path: '/exportaciones', label: 'Exportaciones', icon: FileOutput, fase: 13 },
  { path: '/reportes', label: 'Reportes', icon: BarChart3, nota: 'Depende de que existan documentos (Fase 7) y exportaciones (Fase 13)' },
  { path: '/asistente-ia', label: 'Asistente IA', icon: Sparkles, fase: 17 },
  { path: '/configuracion', label: 'Configuración', icon: Settings, implementado: true },
]
