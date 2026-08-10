'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { Dialog } from '@base-ui/react/dialog'
import { Tooltip } from '@base-ui/react/tooltip'
import { cn } from '@/lib/utils'
import type { Usuario } from '@/types/domain'
import { getNavForUsuario, getHeaderVariant, type NavItem } from '@/lib/shell-config'
import { Sidebar } from './shell/sidebar'
import { TopHeader, type Crumb } from './shell/top-header'
import { NotificationsDrawer } from './shell/notifications-drawer'
import { useKpi } from '@/lib/use-kpi'
import { actionObterPedidos } from '@/lib/actions/pedidos'
import { listarProdutos } from '@/lib/actions/produtos'
import { actionCarregarInventarios } from '@/lib/actions/estoque'
import { actionListarDevolucoes } from '@/lib/actions/devolucoes'
import { getNotificacoes } from '@/lib/notifications'

const COLLAPSE_KEY = 'wms.sidebar.collapsed'

export function AppShell({
  usuario,
  children,
}: {
  usuario: Usuario
  children?: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [profileReady, setProfileReady] = useState(false)

  const notificacoesKpi = useKpi(async () => {
  const [pedidosRes, produtosRes, inventariosRes, devolucoesRes] = await Promise.all([
    actionObterPedidos(),
    listarProdutos(),
    actionCarregarInventarios(),
    actionListarDevolucoes({ status: "SOLICITADA" }),
  ])

  const pedidos = pedidosRes.ok ? pedidosRes.data ?? [] : []
  const produtos = produtosRes.ok ? produtosRes.data ?? [] : []
  const inventarios = inventariosRes.ok ? inventariosRes.data ?? [] : []
  const devolucoes = devolucoesRes.ok ? devolucoesRes.data ?? [] : []

  return getNotificacoes(usuario, pedidos, produtos, inventarios, devolucoes)
}, [usuario])

  const notificacoes = notificacoesKpi.value ?? []

  useEffect(() => {
    if (!notifOpen) setNotifCount(notificacoes.length)
  }, [notificacoes, notifOpen])

  const pathname = usePathname()
  const nav = useMemo(() => getNavForUsuario(usuario), [usuario])
  const headerVariant = useMemo(() => getHeaderVariant(usuario), [usuario])
  const isFull = headerVariant === 'full'

  // Resolve initial collapse preference: stored value wins, else by viewport.
  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_KEY)
    if (stored !== null) {
      setCollapsed(stored === '1')
    } else {
      // Notebook (<1280px) starts collapsed; large desktop starts expanded.
      setCollapsed(window.innerWidth < 1280)
    }
    const t = window.setTimeout(() => setProfileReady(true), 550)
    return () => window.clearTimeout(t)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  const openNotifications = useCallback(() => {
    setNotifOpen(true)
    setNotifCount(0)
  }, [])

  // Keyboard shortcuts: Cmd/Ctrl+B (collapse).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const key = e.key.toLowerCase()
      if (key === 'b') {
        e.preventDefault()
        toggleCollapse()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleCollapse])

  const activeItem = useMemo(() => {
  // Match exato primeiro (ex: pathname === '/pedidos')
  const exact = nav.find((n: NavItem) => n.href === pathname)
  if (exact) return exact

  // Match por prefixo pra rotas aninhadas (ex: '/pedidos/1011' -> item 'Pedidos')
  // Ordena por href mais longo primeiro pra evitar que '/' capture tudo antes de rotas mais específicas.
  const byPrefix = [...nav]
    .sort((a, b) => b.href.length - a.href.length)
    .find((n: NavItem) => n.href !== '/' && pathname.startsWith(n.href + '/'))

  return byPrefix ?? nav[0]
}, [nav, pathname])

  const crumbs: Crumb[] = useMemo(() => {
    const base: Crumb[] = [
      { key: activeItem?.key ?? 'root', label: activeItem?.label ?? '' },
    ]
    return base
  }, [activeItem])

  return (
    <Tooltip.Provider delay={300}>
      <div className="flex h-dvh w-full overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            'hidden shrink-0 border-r border-sidebar-border transition-[width] duration-200 ease-out lg:block',
            collapsed ? 'w-16' : 'w-[220px]',
          )}
        >
          <Sidebar
            nav={nav}
            company="Nordil Distribuição"
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
            loading={!profileReady}
          />
        </aside>

        {/* Mobile / tablet sidebar drawer */}
        <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <Dialog.Portal>
            <Dialog.Backdrop
              className={cn(
                'fixed inset-0 z-50 bg-foreground/25 lg:hidden',
                'transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
              )}
            />
            <Dialog.Popup
              className={cn(
                'fixed inset-y-0 left-0 z-50 w-[220px] outline-none lg:hidden',
                'transition-transform duration-200 data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full',
              )}
            >
              <Dialog.Title className="sr-only">Menu de navegação</Dialog.Title>
              <Dialog.Description className="sr-only">
                Navegue entre os módulos do sistema.
              </Dialog.Description>
              <Sidebar
                nav={nav}
                company="Nordil Distribuição"
                collapsed={false}
                showCollapseButton={false}
                loading={!profileReady}
              />
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Content column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader
            usuario={usuario}
            headerVariant={headerVariant}
            crumbs={crumbs}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            onOpenNotifications={openNotifications}
            notificationCount={notifCount}
          />

          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children ?? <PlaceholderContent title={activeItem?.label ?? ''} />}
          </main>
        </div>

        {isFull && (
          <NotificationsDrawer open={notifOpen} onOpenChange={setNotifOpen} notificacoes={notificacoes} />
        )}
      </div>
    </Tooltip.Provider>
  )
}
function PlaceholderContent({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-dashed border-border bg-card/40">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-balance">
          Área de conteúdo do módulo. As telas do sistema serão renderizadas
          aqui, dentro do shell persistente.
        </p>
      </div>
    </div>
  )
}

