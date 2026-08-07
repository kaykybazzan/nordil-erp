"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardCheck, CheckCircle2, AlertTriangle, X, Plus, Minus } from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"
import { StatusBadgePedido } from "@/components/pedidos/shared/status-badge"
import { usePedidosStore } from "@/lib/pedidos-store"
import { useClientesStore } from "@/lib/clientes-store"
import { useProdutosStore } from "@/lib/produtos-store"
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

  const filaConferencia = usePedidosStore((s) => s.filaConferencia)
  const conferenciaAtual = usePedidosStore((s) => s.conferenciaAtual)
  const carregarFilaConferencia = usePedidosStore((s) => s.carregarFilaConferencia)
  const iniciarConferencia = usePedidosStore((s) => s.iniciarConferencia)
  const registrarItemConferencia = usePedidosStore((s) => s.registrarItemConferencia)
  const finalizarConferencia = usePedidosStore((s) => s.finalizarConferencia)

  const clientesStore = useClientesStore((s) => s.clientes)
  const carregarClientes = useClientesStore((s) => s.carregarClientes)
  const produtosStore = useProdutosStore((s) => s.produtos)
  const carregarProdutos = useProdutosStore((s) => s.carregarProdutos)

  const [loading, setLoading] = useState(true)  
  const [quantidades, setQuantidades] = useState<Record<string, number>>({})
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    Promise.all([carregarFilaConferencia(), carregarClientes(), carregarProdutos()]).then(() => {
      setLoading(false)
    })
  }, [carregarFilaConferencia, carregarClientes, carregarProdutos])

  useEffect(() => {
    if (conferenciaAtual) {
      const initial: Record<string, number> = {}
      conferenciaAtual.itens.forEach((item) => {
        initial[item.id] = item.quantidadeConferida ?? item.quantidadeSeparada
      })
      setQuantidades(initial)
    } else {
      setQuantidades({})
    }
  }, [conferenciaAtual])

  function abrirConferencia(pedidoId: string) {
    iniciarConferencia(pedidoId)
  }

  function fecharConferencia() {
    setQuantidades({})
  }

  function incrementarQuantidade(itemId: string) {
    setQuantidades((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }))
  }

  function decrementarQuantidade(itemId: string) {
    setQuantidades((prev) => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] || 0) - 1) }))
  }

  function setQuantidadeManual(itemId: string, valor: string) {
    const num = parseInt(valor, 10)
    if (!isNaN(num) && num >= 0) {
      setQuantidades((prev) => ({ ...prev, [itemId]: num }))
    }
  }

  const todosConferidos = conferenciaAtual
    ? conferenciaAtual.itens.every((item) => quantidades[item.id] !== undefined)
    : false

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  if (filaConferencia.length === 0) {
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
          {filaConferencia.length} pedido{filaConferencia.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filaConferencia.map((pedido) => {
        const cliente = clientesStore.find((c) => c.id === pedido.clienteId)
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
                  onClick={() => abrirConferencia(pedido.id)}
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
      <Dialog.Root open={!!conferenciaAtual} onOpenChange={(open) => { if (!open) fecharConferencia() }}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-xl">
            {conferenciaAtual && (
              <>
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <Dialog.Title className="text-base font-semibold text-foreground">
                      Conferência — Pedido #{filaConferencia.find((p) => p.id === conferenciaAtual.pedidoId)?.numero ?? conferenciaAtual.pedidoId}
                    </Dialog.Title>
                    <p className="text-sm text-muted-foreground">
                      Informe a quantidade conferida de cada item.
                    </p>
                  </div>
                  <Dialog.Close className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors">
                    <X className="h-4 w-4" />
                  </Dialog.Close>
                </div>

                {/* Lista de itens com quantidade */}
                <div className="mb-5 max-h-60 space-y-2 overflow-y-auto">
                  {conferenciaAtual.itens.map((item) => {
                    const produto = produtosStore.find((p) => p.id === item.produtoId)
                    const quantidadeAtual = quantidades[item.id] ?? item.quantidadeSeparada
                    const divergente = quantidadeAtual !== item.quantidadeSeparada
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5",
                          divergente && "border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/5",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {produto?.nome ?? item.produtoId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Separado: {item.quantidadeSeparada} {produto?.unidadeMedida}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => decrementarQuantidade(item.id)}
                            className="rounded-md border border-border bg-background px-2 py-1 text-muted-foreground hover:bg-muted transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            value={quantidadeAtual}
                            onChange={(e) => setQuantidadeManual(item.id, e.target.value)}
                            className="w-16 rounded-md border border-border bg-background px-2 py-1 text-center text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                          <button
                            type="button"
                            onClick={() => incrementarQuantidade(item.id)}
                            className="rounded-md border border-border bg-background px-2 py-1 text-muted-foreground hover:bg-muted transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      for (const item of conferenciaAtual.itens) {
                        const quantidade = quantidades[item.id]
                        if (quantidade !== undefined) {
                          await registrarItemConferencia({
                            conferenciaId: conferenciaAtual.id,
                            conferenciaItemId: item.id,
                            quantidadeConferida: quantidade,
                          })
                        }
                      }
                      await finalizarConferencia(conferenciaAtual.id)
                      showToast("Conferência concluída com sucesso.")
                    }}
                    disabled={!todosConferidos}
                    className="flex items-center gap-1.5 rounded-lg bg-[hsl(var(--success))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Finalizar conferência
                  </button>
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