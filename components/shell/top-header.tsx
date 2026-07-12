'use client'

import { Menu as MenuIcon, Search, Bell, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserProfile } from '@/lib/shell-config'
import { ProfileMenu } from './profile-menu'

export type Crumb = { key: string; label: string }

export function TopHeader({
  profile,
  crumbs,
  onOpenMobileNav,
  onOpenSearch,
  onOpenNotifications,
  notificationCount,
}: {
  profile: UserProfile
  crumbs: Crumb[]
  onOpenMobileNav: () => void
  onOpenSearch: () => void
  onOpenNotifications: () => void
  notificationCount: number
}) {
  const isFull = profile.header === 'full'

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3 sm:px-4">
      {/* Mobile nav trigger */}
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Abrir menu"
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 lg:hidden"
      >
        <MenuIcon className="size-5" />
      </button>

      {/* Breadcrumb — deep screens only */}
      <nav aria-label="Trilha de navegação" className="min-w-0 flex-1">
        {crumbs.length > 1 ? (
          <ol className="flex items-center gap-1 text-sm">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1
              return (
                <li key={c.key} className="flex min-w-0 items-center gap-1">
                  {i > 0 && (
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
                  )}
                  <span
                    className={cn(
                      'truncate',
                      last
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground',
                    )}
                    aria-current={last ? 'page' : undefined}
                  >
                    {c.label}
                  </span>
                </li>
              )
            })}
          </ol>
        ) : (
          <span className="truncate text-sm font-medium text-foreground">
            {crumbs[0]?.label}
          </span>
        )}
      </nav>

      {/* Full-header controls */}
      {isFull && (
        <>
          <button
            type="button"
            onClick={onOpenSearch}
            className={cn(
              'flex h-8 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-sm text-muted-foreground outline-none transition-colors',
              'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50',
            )}
            aria-label="Abrir busca global"
          >
            <Search className="size-4" />
            <span className="hidden md:inline">Buscar…</span>
            <kbd className="ml-4 hidden rounded border border-border px-1.5 font-mono text-[0.65rem] md:inline">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label={
              notificationCount > 0
                ? `Notificações, ${notificationCount} não lidas`
                : 'Notificações'
            }
            className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Bell className="size-[18px]" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-mono text-[0.6rem] leading-4 font-semibold text-destructive-foreground tabular-nums">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
        </>
      )}

      <div className={cn('h-6 w-px bg-border', isFull ? 'mx-1' : 'ml-auto mr-1')} />

      <ProfileMenu profile={profile} />
    </header>
  )
}
