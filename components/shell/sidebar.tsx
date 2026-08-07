'use client'

import { Tooltip } from '@base-ui/react/tooltip'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/lib/shell-config'

export function Sidebar({
  nav,
  company,
  collapsed,
  onToggleCollapse,
  showCollapseButton = true,
  loading = false,
}: {
  nav: NavItem[]
  company: string
  collapsed: boolean
  onToggleCollapse?: () => void
  showCollapseButton?: boolean
  loading?: boolean
}) {
  const pathname = usePathname()
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-sidebar-border',
          collapsed ? 'justify-center px-0' : 'gap-2.5 px-4',
        )}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <span className="text-[15px] font-bold tracking-tight">N</span>
        </div>
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-sidebar-accent-foreground">
              {company}
            </span>
            <span className="truncate text-[0.68rem] text-sidebar-foreground/70">
              Sistema de Depósito
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto p-2"
        aria-label="Navegação principal"
      >
        {loading ? (
          <ul className="flex flex-col gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="px-1">
                <div className="h-9 animate-pulse rounded-md bg-sidebar-accent/60" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {nav.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href
              const link = (
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex w-full items-center rounded-md text-sm font-medium outline-none transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                    collapsed ? 'h-9 justify-center' : 'h-9 gap-2.5 px-2.5',
                    active
                      ? 'bg-sidebar-primary/15 text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-sidebar-primary"
                    />
                  )}
                  <Icon className="size-[18px] shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )

              return (
                <li key={item.key}>
                  {collapsed ? (
                    <Tooltip.Root>
                      <Tooltip.Trigger render={link} />
                      <Tooltip.Portal>
                        <Tooltip.Positioner side="right" sideOffset={8}>
                          <Tooltip.Popup className="rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md data-[starting-style]:opacity-0 data-[ending-style]:opacity-0">
                            {item.label}
                          </Tooltip.Popup>
                        </Tooltip.Positioner>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  ) : (
                    link
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </nav>

      {/* Collapse toggle */}
      {showCollapseButton && onToggleCollapse && (
        <div className="shrink-0 border-t border-sidebar-border p-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className={cn(
              'flex h-9 w-full items-center rounded-md text-sm font-medium text-sidebar-foreground outline-none transition-colors',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              collapsed ? 'justify-center' : 'gap-2.5 px-2.5',
            )}
          >
            {collapsed ? (
              <PanelLeft className="size-[18px] shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="size-[18px] shrink-0" />
                <span>Recolher</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
