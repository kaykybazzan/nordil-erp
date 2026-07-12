'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Tooltip } from '@base-ui/react/tooltip'
import { cn } from '@/lib/utils'
import type { UserProfile } from '@/lib/shell-config'
import { Sidebar } from './shell/sidebar'
import { TopHeader, type Crumb } from './shell/top-header'
import { CommandPalette } from './shell/command-palette'
import { NotificationsDrawer } from './shell/notifications-drawer'

const COLLAPSE_KEY = 'wms.sidebar.collapsed'
const INITIAL_NOTIFICATIONS = 3

export function AppShell({
  profile,
  children,
  initialActiveKey,
}: {
  profile: UserProfile
  children?: ReactNode
  initialActiveKey?: string
}) {
  const resolveInitialKey = () =>
    (initialActiveKey && profile.nav.some((n) => n.key === initialActiveKey)
      ? initialActiveKey
      : profile.nav[0]?.key) ?? ''

  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifCount, setNotifCount] = useState(INITIAL_NOTIFICATIONS)
  const [profileReady, setProfileReady] = useState(false)
  const [activeKey, setActiveKey] = useState(resolveInitialKey)
  const [detailOpen, setDetailOpen] = useState(false)

  const isFull = profile.header === 'full'

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

  // Reset per-profile state when the active profile changes (demo switcher).
  useEffect(() => {
    setActiveKey(resolveInitialKey())
    setDetailOpen(false)
    setNotifCount(INITIAL_NOTIFICATIONS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  const openNotifications = useCallback(() => {
    setNotifOpen(true)
    setNotifCount(0) // badge clears once the drawer is opened
  }, [])

  // Keyboard shortcuts: Cmd/Ctrl+K (search, full header only), Cmd/Ctrl+B (collapse).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const key = e.key.toLowerCase()
      if (key === 'k' && isFull) {
        e.preventDefault()
        setSearchOpen((o) => !o)
      } else if (key === 'b') {
        e.preventDefault()
        toggleCollapse()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFull, toggleCollapse])

  const activeItem = useMemo(
    () => profile.nav.find((n) => n.key === activeKey) ?? profile.nav[0],
    [profile.nav, activeKey],
  )

  const crumbs: Crumb[] = useMemo(() => {
    const base: Crumb[] = [
      { key: activeItem?.key ?? 'root', label: activeItem?.label ?? '' },
    ]
    if (detailOpen) base.push({ key: 'detail', label: '#5231' })
    return base
  }, [activeItem, detailOpen])

  function selectNav(key: string) {
    setActiveKey(key)
    setDetailOpen(false)
    setMobileNavOpen(false)
  }

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
            profile={profile}
            activeKey={activeKey}
            onSelect={selectNav}
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
                profile={profile}
                activeKey={activeKey}
                onSelect={selectNav}
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
            profile={profile}
            crumbs={crumbs}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            onOpenSearch={() => setSearchOpen(true)}
            onOpenNotifications={openNotifications}
            notificationCount={notifCount}
          />

          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children ?? (
              <PlaceholderContent
                title={activeItem?.label ?? ''}
                canOpenDetail={isFull && activeItem?.key === 'pedidos'}
                detailOpen={detailOpen}
                onOpenDetail={() => setDetailOpen(true)}
                onCloseDetail={() => setDetailOpen(false)}
              />
            )}
          </main>
        </div>

        {isFull && (
          <>
            <CommandPalette
              open={searchOpen}
              onOpenChange={setSearchOpen}
              profile={profile}
            />
            <NotificationsDrawer open={notifOpen} onOpenChange={setNotifOpen} />
          </>
        )}
      </div>
    </Tooltip.Provider>
  )
}

function PlaceholderContent({
  title,
  canOpenDetail,
  detailOpen,
  onOpenDetail,
  onCloseDetail,
}: {
  title: string
  canOpenDetail: boolean
  detailOpen: boolean
  onOpenDetail: () => void
  onCloseDetail: () => void
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-dashed border-border bg-card/40">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm font-medium text-foreground">
          {detailOpen ? `${title} — detalhe #5231` : title}
        </p>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-balance">
          Área de conteúdo do módulo. As telas do sistema serão renderizadas
          aqui, dentro do shell persistente.
        </p>
        {canOpenDetail &&
          (detailOpen ? (
            <button
              type="button"
              onClick={onCloseDetail}
              className="mt-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Voltar à lista
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenDetail}
              className="mt-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Abrir pedido #5231 (ver breadcrumb)
            </button>
          ))}
      </div>
    </div>
  )
}
