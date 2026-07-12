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

export type Role =
  | 'admin'
  | 'supervisor'
  | 'vendedor'
  | 'estoquista'
  | 'separador'
  | 'conferente'
  | 'expedicao'

export type HeaderVariant = 'full' | 'minimal'

export type NavItem = {
  key: string
  label: string
  icon: LucideIcon
}

export type UserProfile = {
  role: Role
  roleLabel: string
  name: string
  email: string
  company: string
  header: HeaderVariant
  nav: NavItem[]
}

export const PROFILES: Record<Role, UserProfile> = {
  admin: {
    role: 'admin',
    roleLabel: 'Administrador',
    name: 'Helena Duarte',
    email: 'helena.duarte@nordil.com.br',
    company: 'Nordil Distribuição',
    header: 'full',
    nav: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { key: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
      { key: 'clientes', label: 'Clientes', icon: Users },
      { key: 'produtos', label: 'Produtos', icon: Package },
      { key: 'estoque', label: 'Estoque', icon: Warehouse },
      { key: 'usuarios', label: 'Usuários', icon: UserCog },
      { key: 'auditoria', label: 'Auditoria', icon: ScrollText },
      { key: 'configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
  supervisor: {
    role: 'supervisor',
    roleLabel: 'Supervisor',
    name: 'Marcos Rangel',
    email: 'marcos.rangel@nordil.com.br',
    company: 'Nordil Distribuição',
    header: 'full',
    nav: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { key: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
      { key: 'estoque', label: 'Estoque', icon: Warehouse },
      { key: 'devolucoes', label: 'Devoluções', icon: RotateCcw },
      { key: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    ],
  },
  vendedor: {
    role: 'vendedor',
    roleLabel: 'Vendedor',
    name: 'Tânia Alves',
    email: 'tania.alves@nordil.com.br',
    company: 'Nordil Distribuição',
    header: 'full',
    nav: [
      { key: 'novo-pedido', label: 'Novo pedido', icon: FilePlus },
      { key: 'meus-pedidos', label: 'Meus pedidos', icon: ClipboardList },
      { key: 'clientes', label: 'Clientes', icon: Users },
    ],
  },
  estoquista: {
    role: 'estoquista',
    roleLabel: 'Estoquista',
    name: 'Bruno Teixeira',
    email: 'bruno.teixeira@nordil.com.br',
    company: 'Nordil Distribuição',
    header: 'full',
    nav: [
      { key: 'estoque', label: 'Estoque', icon: Warehouse },
      { key: 'entrada', label: 'Entrada', icon: ArrowDownToLine },
      { key: 'inventario', label: 'Inventário', icon: ListChecks },
    ],
  },
  separador: {
    role: 'separador',
    roleLabel: 'Separador',
    name: 'Diego Nunes',
    email: 'diego.nunes@nordil.com.br',
    company: 'Nordil Distribuição',
    header: 'minimal',
    nav: [{ key: 'separacao', label: 'Separação', icon: ClipboardList }],
  },
  conferente: {
    role: 'conferente',
    roleLabel: 'Conferente',
    name: 'Priscila Gomes',
    email: 'priscila.gomes@nordil.com.br',
    company: 'Nordil Distribuição',
    header: 'minimal',
    nav: [{ key: 'conferencia', label: 'Conferência', icon: ClipboardCheck }],
  },
  expedicao: {
    role: 'expedicao',
    roleLabel: 'Expedição',
    name: 'Rafael Pires',
    email: 'rafael.pires@nordil.com.br',
    company: 'Nordil Distribuição',
    header: 'minimal',
    nav: [{ key: 'expedicao', label: 'Expedição', icon: Truck }],
  },
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}
