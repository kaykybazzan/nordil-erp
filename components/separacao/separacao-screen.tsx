"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Package, CheckCircle2, ClipboardList, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePedidosStore } from "@/lib/pedidos-store"
import { useProdutosStore } from "@/lib/produtos-store"
import { useClientesStore } from "@/lib/clientes-store"
import { StatusBadgePedido } from "@/components/pedidos/shared/status-badge"
import type { Pedido, StatusItemPedido } from "@/types/domain"

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
function formatData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

const ITEM_STATUS_COLOR: Record<StatusItemPedido, string> = {
  PENDENTE:        "text-muted-foreground bg-muted/60",
  PENDENTE_ESTOQUE:"text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10",
  SEPARADO:        "text-[hsl(var(--success))] bg-[hsl(var(--success))]/10",
  EXPEDIDO:        "text-[hsl(var(--info))] bg-[hsl(var(--info))]/10",
  CANCELADO:       "text-destructive bg-destructive/10",
}
const ITEM_STATUS_LABEL: Record<StatusItemPedido, string> = {
  PENDENTE: "Pendente", PENDENTE_ESTOQUE: "Sem estoque", SEPARADO: "Separado", EXPEDIDO: "Expedido", CANCELADO: "Cancelado",
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}

export function SeparacaoScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [processandoId, setProcessandoId] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const pedidosStore = usePedidosStore((s) => s.pedidos)
  const carregarPedidos = usePedidosStore((s) => s.carregarPedidos)
  const iniciarSeparacaoAction = usePedidosStore((s) => s.iniciarSeparacao)
  const marcarItemSeparadoAction = usePedidosStore((s) => s.marcarItemSeparado)
  const concluirSeparacaoAction = usePedidosStore((s) => s.concluirSeparacao)

  const produtosStore = useProdutosStore((s) => s.produtos)
  const carregarProdutos = useProdutosStore((s) => s.carregarProdutos)

  const clientesStore = useClientesStore((s) => s.clientes)
  const carregarClientes = useClientesStore((s) => s.carregarClientes)

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    const t = setTimeout(async () => {
      await Promise.all([
        carregarPedidos(),
        carregarProdutos(),
        carregarClientes(),
      ])
      setLoading(false)
    }, 700)
    return () => clearTimeout(t)
  }, [carregarPedidos, carregarProdutos, carregarClientes])

  async function handleIniciarSeparacao(id: string) {
    setProcessandoId(id)
    const resultado = await iniciarSeparacaoAction(id)
    setProcessandoId(null)
    if (!resultado.ok) {
      showToast(resultado.error || "Erro ao iniciar separação")
      return
    }
    showToast("Separação iniciada.")
  }

  async function handleMarcarItemSeparado(pedidoId: string, itemId: string) {
    setProcessandoId(pedidoId)
    const resultado = await marcarItemSeparadoAction(pedidoId, itemId)
    setProcessandoId(null)
    if (!resultado.ok) {
      showToast(resultado.error || "Erro ao marcar item separado")
      return
    }
  }

  async function handleConcluirSeparacao(id: string) {
    setProcessandoId(id)
    const resultado = await concluirSeparacaoAction(id)
    setProcessandoId(null)
    if (!resultado.ok) {
      showToast(resultado.error || "Erro ao concluir separação")
      return
    }
    showToast("Separação concluída. Pedido enviado para conferência.")
    setExpandido(null)
  }

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  const pedidos = pedidosStore.filter((p) => p.status === "RESERVADO" || p.status === "EM_SEPARACAO")

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <ClipboardList className="h-10 w-10 text-muted-foreground" />
        <p className="text-base font-medium text-foreground">Nenhum pedido para separar</p>
        <p className="text-sm text-muted-foreground">Todos os pedidos já foram processados.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Separação</h1>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {pedidos.map((pedido) => {
        const cliente = clientesStore.find((c) => c.id === pedido.clienteId)
        const aberto = expandido === pedido.id
        const itensSeparaveis = pedido.itens.filter((i) => i.status !== "PENDENTE_ESTOQUE" && i.status !== "CANCELADO")
        const todosSeparados = itensSeparaveis.length > 0 && itensSeparaveis.every((i) => i.status === "SEPARADO")

        return (
          <div key={pedido.id} className="rounded-xl border border-border bg-card">
            {/* Cabeçalho do cartão */}
            <button
              type="button"
              onClick={() => setExpandido(aberto ? null : pedido.id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">#{pedido.numero}</span>
                  <StatusBadgePedido status={pedido.status} pendencia={pedido.pendencia} size="sm" />
                  {pedido.pendencia === "RUPTURA_ESTOQUE" && (
                    <span className="flex items-center gap-1 text-xs text-[hsl(var(--warning))]">
                      <AlertTriangle className="h-3 w-3" /> Ruptura
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {cliente?.nome ?? pedido.clienteId} · {formatData(pedido.criadoEm)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-foreground">{formatBRL(pedido.valorTotal)}</p>
                <p className="text-xs text-muted-foreground">{pedido.itens.length} iten(s)</p>
              </div>
            </button>

            {/* Itens expandidos */}
            {aberto && (
              <div className="border-t border-border/60 px-5 pb-4">
                <div className="mt-3 space-y-2">
                  {pedido.itens.map((item) => {
                    const produto = produtosStore.find((p) => p.id === item.produtoId)
                    const podeMarcar =
                      pedido.status === "EM_SEPARACAO" &&
                      item.status !== "PENDENTE_ESTOQUE" &&
                      item.status !== "SEPARADO" &&
                      item.status !== "CANCELADO"

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {produto?.nome ?? item.produtoId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantidade} {produto?.unidadeMedida}
                          </p>
                        </div>
                        <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              ITEM_STATUS_COLOR[item.status],
                            )}
                          >
                            {ITEM_STATUS_LABEL[item.status]}
                          </span>
                          {podeMarcar && (
                            <button
                              type="button"
                              onClick={() => handleMarcarItemSeparado(pedido.id, item.id)}
                              disabled={processandoId === pedido.id}
                              className="rounded-md bg-[hsl(var(--success))]/10 px-2 py-1 text-xs font-medium text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/20 transition-colors disabled:opacity-50"
                            >
                              Marcar separado
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Ações */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {pedido.status === "RESERVADO" && (
                    <button
                      type="button"
                      onClick={() => handleIniciarSeparacao(pedido.id)}
                      disabled={processandoId === pedido.id}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <Package className="h-4 w-4" />
                      Iniciar separação
                    </button>
                  )}
                  {pedido.status === "EM_SEPARACAO" && todosSeparados && (
                    <button
                      type="button"
                      onClick={() => handleConcluirSeparacao(pedido.id)}
                      disabled={processandoId === pedido.id}
                      className="flex items-center gap-1.5 rounded-lg bg-[hsl(var(--success))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Concluir separação
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => router.push(`/pedidos/${pedido.id}`)}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Ver pedido
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {toast && (
        <div className="pointer-events-none fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
