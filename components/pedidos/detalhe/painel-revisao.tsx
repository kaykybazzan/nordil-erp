"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import type { Pedido } from "@/types/domain"

interface PainelRevisaoProps {
  pedido: Pedido
  onAprovar: () => void
  onRejeitar: (motivo: string) => void
}

export function PainelRevisao({ pedido: _pedido, onAprovar, onRejeitar }: PainelRevisaoProps) {
  const [motivo, setMotivo] = useState("")
  const [loading, setLoading] = useState(false)
  const [acao, setAcao] = useState<"aprovar" | "rejeitar" | null>(null)

  async function handleAprovar() {
    setAcao("aprovar")
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    onAprovar()
  }

  async function handleRejeitar() {
    if (!motivo.trim()) return
    setAcao("rejeitar")
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    onRejeitar(motivo.trim())
  }

  return (
    <div className="rounded-xl border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/5 p-5">
      <h3 className="mb-1 text-sm font-semibold text-foreground">Pedido aguardando revisão</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Este pedido requer aprovação antes de prosseguir para separação.
      </p>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-foreground">
          Motivo da rejeição (obrigatório para rejeitar)
        </label>
        <textarea
          rows={2}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Descreva o motivo..."
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleAprovar}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-[hsl(var(--success))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {loading && acao === "aprovar" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Aprovar pedido
        </button>
        <button
          type="button"
          onClick={handleRejeitar}
          disabled={loading || !motivo.trim()}
          className="flex items-center gap-1.5 rounded-lg border border-destructive/50 bg-destructive/8 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/15 disabled:opacity-50 transition-colors"
        >
          {loading && acao === "rejeitar" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          Rejeitar pedido
        </button>
      </div>
    </div>
  )
}
