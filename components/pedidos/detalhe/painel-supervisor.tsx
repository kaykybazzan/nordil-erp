"use client"

import { useState } from "react"
import { ShieldCheck, ShieldX, Loader2 } from "lucide-react"
import type { Pedido } from "@/types/domain"

interface PainelSupervisorProps {
  pedido: Pedido
  onAutorizar: () => void
  onBloquear: (motivo: string) => void
}

export function PainelSupervisor({ pedido: _pedido, onAutorizar, onBloquear }: PainelSupervisorProps) {
  const [motivo, setMotivo] = useState("")
  const [loading, setLoading] = useState(false)
  const [acao, setAcao] = useState<"autorizar" | "bloquear" | null>(null)

  async function handleAutorizar() {
    setAcao("autorizar")
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    onAutorizar()
  }

  async function handleBloquear() {
    if (!motivo.trim()) return
    setAcao("bloquear")
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    onBloquear(motivo.trim())
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <h3 className="mb-1 text-sm font-semibold text-foreground">Decisão do supervisor necessária</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Este pedido escalou para decisão de supervisor. Analise as pendências antes de decidir.
      </p>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-foreground">
          Motivo do bloqueio (obrigatório para bloquear)
        </label>
        <textarea
          rows={2}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Justifique o bloqueio..."
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleAutorizar}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-[hsl(var(--success))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {loading && acao === "autorizar" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          Autorizar
        </button>
        <button
          type="button"
          onClick={handleBloquear}
          disabled={loading || !motivo.trim()}
          className="flex items-center gap-1.5 rounded-lg border border-destructive/50 bg-destructive/8 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/15 disabled:opacity-50 transition-colors"
        >
          {loading && acao === "bloquear" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldX className="h-4 w-4" />
          )}
          Bloquear pedido
        </button>
      </div>
    </div>
  )
}
