'use client'

import { Dialog } from '@base-ui/react/dialog'
import { X, PackageCheck, AlertTriangle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

type NotificationTone = 'info' | 'warning' | 'success'

type Notification = {
  id: string
  tone: NotificationTone
  title: string
  detail: string
  time: string
}

const SAMPLE: Notification[] = [
  {
    id: '1',
    tone: 'success',
    title: 'Pedido #5231 conferido',
    detail: 'Liberado para expedição por Priscila G.',
    time: '09:42',
  },
  {
    id: '2',
    tone: 'warning',
    title: 'Estoque baixo — SKU 40021',
    detail: 'Saldo abaixo do mínimo (12 un.)',
    time: '09:15',
  },
  {
    id: '3',
    tone: 'info',
    title: 'Devolução #118 registrada',
    detail: 'Cliente Metalúrgica Sul — aguardando análise',
    time: 'Ontem',
  },
]

const TONE: Record<
  NotificationTone,
  { icon: typeof PackageCheck; className: string }
> = {
  success: { icon: PackageCheck, className: 'text-success' },
  warning: { icon: AlertTriangle, className: 'text-warning' },
  info: { icon: RotateCcw, className: 'text-info' },
}

export function NotificationsDrawer({
  open,
  onOpenChange,
  hasItems = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  hasItems?: boolean
}) {
  const items = hasItems ? SAMPLE : []

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
            Lista de notificações recentes do sistema.
          </Dialog.Description>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-muted-foreground">
                Nenhuma notificação por enquanto.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const tone = TONE[n.tone]
                  const Icon = tone.icon
                  return (
                    <li key={n.id} className="flex gap-3 px-4 py-3">
                      <Icon className={cn('mt-0.5 size-4 shrink-0', tone.className)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-medium text-foreground">
                            {n.title}
                          </p>
                          <span className="shrink-0 font-mono text-[0.68rem] text-muted-foreground">
                            {n.time}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {n.detail}
                        </p>
                      </div>
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
