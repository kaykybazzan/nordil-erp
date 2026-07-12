'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { PROFILES, type Role } from '@/lib/shell-config'
import { cn } from '@/lib/utils'

const ROLE_ORDER: Role[] = [
  'admin',
  'supervisor',
  'vendedor',
  'estoquista',
  'separador',
  'conferente',
  'expedicao',
]

export default function Page() {
  const [role, setRole] = useState<Role>('admin')

  return (
    <>
      <AppShell key={role} profile={PROFILES[role]} />

      {/* Demo-only role switcher — not part of the shell */}
      <div className="fixed bottom-3 left-1/2 z-[60] -translate-x-1/2">
        <div className="flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-1 overflow-x-auto rounded-lg border border-border bg-popover/95 p-1 shadow-lg shadow-black/10 backdrop-blur">
          <span className="px-2 text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
            Perfil
          </span>
          {ROLE_ORDER.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50',
                r === role
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {PROFILES[r].roleLabel}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
