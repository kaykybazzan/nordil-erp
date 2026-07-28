"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardCheck, CheckCircle2, AlertTriangle, X } from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"
import { MOCK_CLIENTES } from "@/lib/mock-clientes"
import { MOCK_PRODUTOS } from "@/lib/mock-produtos"
import { StatusBadgePedido } from "@/components/pedidos/shared/status-badge"
import { usePedidosStore } from "@/lib/pedidos-store"
import { useCurrentUser } from "@/lib/auth-context"

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
function formatData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}

export function ConferenciaScreen() {
  const router = useRouter()
  const currentUser = useCurrentUser()

  const todosPedidos = usePedidosStore((s) => s.pedidos)
  const confirmarConferencia = usePedidosStore((s) => s.confirmarConferencia)
  const registrarDivergenciaConferencia = usePedidosStore(
    (s) => s.registrarDivergenciaConferencia,
  )

  const [loading, setLoading] = useState(true)
  const [conferindoId, setConferindoId] = useState<string | null>(null)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [divergencia, setDivergencia] = useState("")
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(t)
  }, [])

  const pedidos = todosPedidos.filter((p) => p.status === "EM_CONFERENCIA")
  const pedidoConferindo = pedidos.find((p) => p.id === conferindoId)

  function abrirConferencia(pedido: (typeof pedidos)[number]) {
    const initial: Record<string, boolean> = {}
    pedido.itens.forEach((i) => { initial[i.id] = false })
    setChecklist(initial)
    setDivergencia("")
    setConferindoId(pedido.id)
  }

  function toggleItem(itemId: string) {
    setChecklist((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  const todosConferidos = pedidoConferindo
    ? pedidoConferindo.itens
        .filter((i) => i.status !== "CANCELADO")
        .every((i) => checklist[i.id])
    : false

  async function confirmarConferenciaHandler() {
    if (!conferindoId) return
    const resultado = await confirmarConferencia(conferindoId)
    if (!resultado.ok) {
      showToast(resultado.error || "Erro ao confirmar conferência")
      return
    }
    setConferindoId(null)
    showToast("Conferência confirmada. Pedido pronto para expedição.")
  }

  async function registrarDivergenciaHandler() {
    if (!conferindoId || !divergencia.trim()) return
    const resultado = await registrarDivergenciaConferencia(conferindoId, divergencia.trim())
    if (!resultado.ok) {
      showToast(resultado.error || "Erro ao registrar divergência")
      return
    }
    setConferindoId(null)
    showToast("Divergência registrada. Pedido sinalizado para revisão.")
  }

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <ClipboardCheck className="h-10 w-10 text-muted-foreground" />
        <p className="text-base font-medium text-foreground">Nenhum pedido em conferência</p>
        <p className="text-sm text-muted-foreground">Os pedidos separados aparecerão aqui.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Conferência</h1>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {pedidos.map((pedido) => {
        const cliente = MOCK_CLIENTES.find((c) => c.id === pedido.clienteId)
        return (
          <div
            key={pedido.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">#{pedido.numero}</span>
                <StatusBadgePedido status={pedido.status} pendencia={pedido.pendencia} size="sm" />
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {cliente?.nome} · {formatData(pedido.criadoEm)} · {pedido.itens.length} iten(s)
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-col items-end gap-2">
              <p className="text-sm font-medium text-foreground">{formatBRL(pedido.valorTotal)}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/pedidos/${pedido.id}`)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Ver detalhes
                </button>
                <button
                  type="button"
                  onClick={() => abrirConferencia(pedido)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Conferir
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Modal de conferência */}
      <Dialog.Root open={!!conferindoId} onOpenChange={(open) => { if (!open) setConferindoId(null) }}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-xl">
            {pedidoConferindo && (
              <>
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <Dialog.Title className="text-base font-semibold text-foreground">
                      Conferência — Pedido #{pedidoConferindo.numero}
                    </Dialog.Title>
                    <p className="text-sm text-muted-foreground">
                      Marque todos os itens conferidos antes de confirmar.
                    </p>
                  </div>
                  <Dialog.Close className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors">
                    <X className="h-4 w-4" />
                  </Dialog.Close>
                </div>

                {/* Checklist */}
                <div className="mb-5 max-h-60 space-y-2 overflow-y-auto">
                  {pedidoConferindo.itens.map((item) => {
                    const produto = MOCK_PRODUTOS.find((p) => p.id === item.produtoId)
                    const disabled = item.status === "CANCELADO"
                    return (
                      <label
                        key={item.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 transition-colors",
                          checklist[item.id] && "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/5",
                          disabled && "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checklist[item.id] ?? false}
                          onChange={() => !disabled && toggleItem(item.id)}
                          disabled={disabled}
                          className="h-4 w-4 accent-[hsl(var(--success))]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {produto?.nome ?? item.produtoId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantidade} {produto?.unidadeMedida}
                          </p>
                        </div>
                        {checklist[item.id] && (
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[hsl(var(--success))]" />
                        )}
                      </label>
                    )
                  })}
                </div>

                {/* Divergência */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-xs font-medium text-foreground">
                    Registrar divergência (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={divergencia}
                    onChange={(e) => setDivergencia(e.target.value)}
                    placeholder="Descreva a divergência encontrada..."
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={confirmarConferenciaHandler}
                    disabled={!todosConferidos}
                    className="flex items-center gap-1.5 rounded-lg bg-[hsl(var(--success))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmar conferência
                  </button>
                  {divergencia.trim() && (
                    <button
                      type="button"
                      onClick={registrarDivergenciaHandler}
                      className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--warning))]/50 bg-[hsl(var(--warning))]/8 px-4 py-2 text-sm font-medium text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/15 transition-colors"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Registrar divergência
                    </button>
                  )}
                </div>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {toast && (
        <div className="pointer-events-none fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}