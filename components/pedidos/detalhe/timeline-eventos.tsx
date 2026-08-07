"use client"

import { useEffect, useState } from "react"
import { CircleDot, ShoppingCart, Package, ClipboardCheck, Truck, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PedidoEvento } from "@/types/domain"
import { actionObterUsuarios } from "@/lib/actions/usuarios"

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

const TIPO_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  PEDIDO_CRIADO:         { icon: <ShoppingCart className="h-3.5 w-3.5" />, color: "text-primary",                         bg: "bg-primary/12" },
  ESTOQUE_RESERVADO:     { icon: <Package className="h-3.5 w-3.5" />,      color: "text-[hsl(var(--success))]",           bg: "bg-[hsl(var(--success))]/12" },
  EM_SEPARACAO:          { icon: <Package className="h-3.5 w-3.5" />,      color: "text-[hsl(var(--warning))]",           bg: "bg-[hsl(var(--warning))]/12" },
  EM_CONFERENCIA:        { icon: <ClipboardCheck className="h-3.5 w-3.5" />,color: "text-primary",                        bg: "bg-primary/12" },
  CONFERIDO:             { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-[hsl(var(--success))]",           bg: "bg-[hsl(var(--success))]/12" },
  EXPEDIDO:              { icon: <Truck className="h-3.5 w-3.5" />,        color: "text-primary",                         bg: "bg-primary/12" },
  ENTREGUE:              { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-[hsl(var(--success))]",           bg: "bg-[hsl(var(--success))]/12" },
  CANCELADO:             { icon: <XCircle className="h-3.5 w-3.5" />,      color: "text-destructive",                     bg: "bg-destructive/12" },
  PENDENCIA_REGISTRADA:  { icon: <AlertTriangle className="h-3.5 w-3.5" />,color: "text-[hsl(var(--warning))]",           bg: "bg-[hsl(var(--warning))]/12" },
  PENDENCIA_RESOLVIDA:   { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-[hsl(var(--success))]",           bg: "bg-[hsl(var(--success))]/12" },
  AGUARDANDO_REVISAO:    { icon: <Clock className="h-3.5 w-3.5" />,        color: "text-[hsl(var(--warning))]",           bg: "bg-[hsl(var(--warning))]/12" },
  AGUARDANDO_SUPERVISOR: { icon: <Clock className="h-3.5 w-3.5" />,        color: "text-[hsl(var(--warning))]",           bg: "bg-[hsl(var(--warning))]/12" },
}

const DEFAULT_META = { icon: <CircleDot className="h-3.5 w-3.5" />, color: "text-muted-foreground", bg: "bg-muted" }

interface TimelineEventosProps {
  eventos: PedidoEvento[]
}

export function TimelineEventos({ eventos }: TimelineEventosProps) {
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([])

  useEffect(() => {
    actionObterUsuarios().then((resultado) => {
      if (resultado.ok && resultado.data) {
        setUsuarios(resultado.data)
      }
    })
  }, [])

  const sorted = [...eventos].sort(
    (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime(),
  )

  return (
    <div className="space-y-0">
      {sorted.map((evt, idx) => {
        const meta = TIPO_META[evt.tipo] ?? DEFAULT_META
        const usuario = usuarios.find((u) => u.id === evt.usuarioId)
        const isLast = idx === sorted.length - 1

        return (
          <div key={evt.id} className="flex gap-4">
            {/* linha vertical */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
                  meta.bg, meta.color,
                )}
              >
                {meta.icon}
              </span>
              {!isLast && <div className="w-px flex-1 bg-border/60 my-1" />}
            </div>

            {/* conteúdo */}
            <div className={cn("pb-5 min-w-0", isLast && "pb-0")}>
              <p className="text-sm text-foreground leading-snug">{evt.descricao}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDataHora(evt.dataHora)}
                {usuario && (
                  <span className="ml-2 text-muted-foreground/70">— {usuario.nome}</span>
                )}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
