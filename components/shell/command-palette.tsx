'use client'

import { useMemo, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Search, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserProfile } from '@/lib/shell-config'

export function CommandPalette({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: UserProfile
}) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return profile.nav
    return profile.nav.filter((n) => n.label.toLowerCase().includes(q))
  }, [query, profile.nav])

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setQuery('')
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[1px]',
            'transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
          )}
        />
        <Dialog.Popup
          className={cn(
            'fixed top-[18vh] left-1/2 z-50 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2',
            'overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl shadow-black/20 outline-none',
            'transition-[transform,opacity] data-[starting-style]:-translate-y-1 data-[starting-style]:opacity-0 data-[ending-style]:-translate-y-1 data-[ending-style]:opacity-0',
          )}
        >
          <Dialog.Title className="sr-only">Busca global</Dialog.Title>
          <Dialog.Description className="sr-only">
            Pesquise módulos, pedidos, clientes e produtos.
          </Dialog.Description>

          <div className="flex items-center gap-2.5 border-b border-border px-3.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pedidos, clientes, produtos…"
              className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              aria-label="Buscar"
            />
            <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground sm:block">
              ESC
            </kbd>
          </div>

          <div className="max-h-[46vh] overflow-y-auto p-1.5">
            {results.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {'Nenhum resultado para '}
                <span className="font-mono text-foreground">{query}</span>
              </p>
            ) : (
              <>
                <p className="px-2.5 pt-1.5 pb-1 text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
                  Módulos
                </p>
                {results.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        console.log('[v0] palette navigate:', item.key)
                        onOpenChange(false)
                        setQuery('')
                      }}
                      className={cn(
                        'group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground outline-none',
                        'hover:bg-muted focus-visible:bg-muted',
                      )}
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="flex-1">{item.label}</span>
                      <CornerDownLeft className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
