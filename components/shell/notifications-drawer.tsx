'use client'

import { Dialog } from '@base-ui/react/dialog'
import Link from 'next/link'
import { X, PackageCheck, AlertTriangle, RotateCcw, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Notificacao, NotificacaoTom } from '@/lib/notifications'

const TONE: Record<NotificacaoTom, { icon: typeof PackageCheck; className: string }> = {
  success: { icon: PackageCheck, className: 'text-success' },
  warning: { icon: AlertTriangle, className: 'text-warning' },
  danger: { icon: AlertTriangle, className: 'text-destructive' },
  info: { icon: RotateCcw, className: 'text-info' },
}

function formatNotifTime(iso: string): string {
  const data = new Date(iso)
  const agora = new Date()
  const mesmoDia =
    data.getFullYear() === agora.getFullYear() &&
    data.getMonth() === agora.getMonth() &&
    data.getDate() === agora.getDate()

  if (mesmoDia) {
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const ontem = new Date(agora)
  ontem.setDate(ontem.getDate() - 1)
  const foiOntem =
    data.getFullYear() === ontem.getFullYear() &&
    data.getMonth() === ontem.getMonth() &&
    data.getDate() === ontem.getDate()

  return foiOntem ? 'Ontem' : data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function NotificationsDrawer({
  open,
  onOpenChange,
  notificacoes,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  notificacoes: Notificacao[]
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-foreground/25',
            'transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
          )}
        />
        <Dialog.Popup
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-[min(22rem,100vw)] flex-col bg-card text-card-foreground shadow-xl shadow-black/20 outline-none',
            'transition-transform duration-200 data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full',
          )}
        >
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <Dialog.Title className="text-sm font-semibold text-foreground">
              Notificações
            </Dialog.Title>
            <Dialog.Close
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label="Fechar notificações"
            >
              <X className="size-4" />
            </Dialog.Close>
          </header>

          <Dialog.Description className="sr-only">
            Lista de notificações recentes relevantes para o seu papel no sistema.
          </Dialog.Description>

          <div className="flex-1 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                <Bell className="size-6 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Nenhuma notificação por enquanto.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notificacoes.map((n) => {
                  const tone = TONE[n.tom]
                  const Icon = tone.icon
                  return (
                    <li key={n.id}>
                      <Link
                        href={n.href}
                        onClick={() => onOpenChange(false)}
                        className="flex gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
                      >
                        <Icon className={cn('mt-0.5 size-4 shrink-0', tone.className)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-sm font-medium text-foreground">
                              {n.titulo}
                            </p>
                            <span className="shrink-0 font-mono text-[0.68rem] text-muted-foreground">
                              {formatNotifTime(n.dataHora)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {n.detalhe}
                          </p>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}