import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Warehouse,
  UserCog,
  ScrollText,
  Settings,
  RotateCcw,
  BarChart3,
  FilePlus,
  ClipboardList,
  ArrowDownToLine,
  ListChecks,
  ClipboardCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import type { Usuario } from '@/types/domain'

export type HeaderVariant = 'full' | 'minimal'

export type NavItem = {
  key: string
  label: string
  icon: LucideIcon
  href: string
}

// Navigation configurations by function
const NAV_ADMIN: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { key: 'pedidos', label: 'Pedidos', icon: ShoppingCart, href: '/pedidos' },
  { key: 'clientes', label: 'Clientes', icon: Users, href: '/clientes' },
  { key: 'produtos', label: 'Produtos', icon: Package, href: '/produtos' },
  { key: 'estoque', label: 'Estoque', icon: Warehouse, href: '/estoque' },
  { key: 'devolucoes', label: 'Devoluções', icon: RotateCcw, href: '/devolucoes' },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3, href: '/relatorios' },
  { key: 'usuarios', label: 'Usuários', icon: UserCog, href: '/usuarios' },
  { key: 'auditoria', label: 'Auditoria', icon: ScrollText, href: '/auditoria' },
  { key: 'configuracoes', label: 'Configurações', icon: Settings, href: '/configuracoes' },
]

const NAV_SUPERVISOR: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { key: 'pedidos', label: 'Pedidos', icon: ShoppingCart, href: '/pedidos' },
  { key: 'estoque', label: 'Estoque', icon: Warehouse, href: '/estoque' },
  { key: 'devolucoes', label: 'Devoluções', icon: RotateCcw, href: '/devolucoes' },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3, href: '/relatorios' },
]

const NAV_ADMINISTRATIVO: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { key: 'pedidos', label: 'Pedidos', icon: ShoppingCart, href: '/pedidos' },
  { key: 'estoque', label: 'Estoque', icon: Warehouse, href: '/estoque' },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3, href: '/relatorios' },
]

const NAV_VENDEDOR: NavItem[] = [
  { key: 'novo-pedido', label: 'Novo pedido', icon: FilePlus, href: '/pedidos/novo' },
  { key: 'meus-pedidos', label: 'Meus pedidos', icon: ClipboardList, href: '/pedidos' },
  { key: 'clientes', label: 'Clientes', icon: Users, href: '/clientes' },
  { key: 'devolucoes', label: 'Devoluções', icon: RotateCcw, href: '/devolucoes' },
]

const NAV_ESTOQUISTA: NavItem[] = [
  { key: 'estoque', label: 'Estoque', icon: Warehouse, href: '/estoque' },
  { key: 'entrada', label: 'Entrada', icon: ArrowDownToLine, href: '/estoque/entrada' },
  { key: 'inventario', label: 'Inventário', icon: ListChecks, href: '/estoque/inventario' },
]

const NAV_SEPARADOR: NavItem[] = [
  { key: 'separacao', label: 'Separação', icon: ClipboardList, href: '/separacao' },
]

const NAV_CONFERENTE: NavItem[] = [
  { key: 'conferencia', label: 'Conferência', icon: ClipboardCheck, href: '/conferencia' },
]

const NAV_EXPEDICAO: NavItem[] = [
  { key: 'expedicao', label: 'Expedição', icon: Truck, href: '/expedicao' },
]

/**
 * Derives navigation items for a user based on their role and function.
 * ADMIN role always sees full navigation including "Usuários".
 * SUPERVISOR and OPERADOR see navigation based on their function,
 * but SUPERVISOR never sees "Usuários" regardless of function.
 */
export function getNavForUsuario(usuario: Usuario): NavItem[] {
  // ADMIN always sees everything
  if (usuario.role === 'ADMIN') {
    return NAV_ADMIN
  }

  // SUPERVISOR sees dedicated navigation
  if (usuario.role === 'SUPERVISOR') {
    return NAV_SUPERVISOR
  }

  // For OPERADOR users, derive navigation from function
  switch (usuario.funcao) {
    case 'VENDAS':
      return NAV_VENDEDOR
    case 'ESTOQUE':
      return NAV_ESTOQUISTA
    case 'SEPARACAO':
      return NAV_SEPARADOR
    case 'CONFERENCIA':
      return NAV_CONFERENTE
    case 'EXPEDICAO':
      return NAV_EXPEDICAO
    case 'ADMINISTRATIVO':
      return NAV_ADMINISTRATIVO
    default:
      return []
  }
}

/**
 * Derives header variant for a user based on their function.
 * Operational roles (SEPARACAO, CONFERENCIA, EXPEDICAO) get minimal header.
 * All others get full header.
 */
export function getHeaderVariant(usuario: Usuario): HeaderVariant {
  switch (usuario.funcao) {
    case 'SEPARACAO':
    case 'CONFERENCIA':
    case 'EXPEDICAO':
      return 'minimal'
    default:
      return 'full'
  }
}

/**
 * Gets role label for display purposes.
 */
export function getRoleLabel(usuario: Usuario): string {
  switch (usuario.role) {
    case 'ADMIN':
      return 'Administrador'
    case 'SUPERVISOR':
      return 'Supervisor'
    case 'OPERADOR':
      return 'Operador'
    default:
      return 'Usuário'
  }
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}
