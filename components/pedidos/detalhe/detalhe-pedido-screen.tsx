"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MapPin, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { MOCK_PEDIDOS } from "@/lib/mock-pedidos"
import { MOCK_CLIENTES } from "@/lib/mock-clientes"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"
import { MOCK_PRODUTOS } from "@/lib/mock-produtos"
import { useAuth } from "@/lib/auth-context"
import { podeAcessarDevolucoes } from "@/lib/policies"
import { StatusBadgePedido } from "@/components/pedidos/shared/status-badge"
import { TimelineEventos } from "@/components/pedidos/detalhe/timeline-eventos"
import { PainelRevisao } from "@/components/pedidos/detalhe/painel-revisao"
import { PainelSupervisor } from "@/components/pedidos/detalhe/painel-supervisor"
import { SolicitarDevolucaoForm } from "@/components/devolucoes/solicitar-devolucao-form"
import type { Pedido, StatusItemPedido } from "@/types/domain"

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
function formatDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

const ITEM_STATUS_LABEL: Record<StatusItemPedido, string> = {
  PENDENTE: "Pendente",
  PENDENTE_ESTOQUE: "Sem estoque",
  SEPARADO: "Separado",
  CANCELADO: "Cancelado",
}
const ITEM_STATUS_COLOR: Record<StatusItemPedido, string> = {
  PENDENTE: "text-muted-foreground bg-muted/60",
  PENDENTE_ESTOQUE: "text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10",
  SEPARADO: "text-[hsl(var(--success))] bg-[hsl(var(--success))]/10",
  CANCELADO: "text-destructive bg-destructive/10",
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}

interface DetalhePedidoScreenProps {
  pedidoId: string
}

export function DetalhePedidoScreen({ pedidoId }: DetalhePedidoScreenProps) {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [devolucaoDrawerAberto, setDevolucaoDrawerAberto] = useState(false)
  const toastTimer = useRef<number | null>(null)

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    const t = setTimeout(() => {
      const found = MOCK_PEDIDOS.find((p) => p.id === pedidoId)
      if (found) setPedido({ ...found })
      else setNotFound(true)
      setLoading(false)
    }, 700)
    return () => clearTimeout(t)
  }, [pedidoId])

  function handleAprovar() {
    if (!pedido) return
    setPedido((p) => p ? { ...p, status: "RESERVADO" } : p)
    showToast("Pedido aprovado e enviado para separação.")
  }
  function handleRejeitar(motivo: string) {
    if (!pedido) return
    setPedido((p) => p ? { ...p, status: "CANCELADO", motivoCancelamento: motivo } : p)
    showToast("Pedido rejeitado.")
  }
  function handleAutorizar() {
    if (!pedido) return
    setPedido((p) => p ? { ...p, status: "RESERVADO" } : p)
    showToast("Pedido autorizado pelo supervisor.")
  }
  function handleBloquear(motivo: string) {
    if (!pedido) return
    setPedido((p) => p ? { ...p, status: "CANCELADO", motivoCancelamento: motivo } : p)
    showToast("Pedido bloqueado pelo supervisor.")
  }

  const isSupervisor = currentUser.role === "SUPERVISOR" || currentUser.role === "ADMIN"

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  if (notFound || !pedido) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <FileText className="h-10 w-10 text-muted-foreground" />
        <p className="text-base font-medium text-foreground">Pedido não encontrado</p>
        <button
          type="button"
          onClick={() => router.push("/pedidos")}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Voltar para Pedidos
        </button>
      </div>
    )
  }

  const cliente = MOCK_CLIENTES.find((c) => c.id === pedido.clienteId)
  const vendedor = MOCK_USUARIOS.find((u) => u.id === pedido.vendedorId)

  const subtotal = pedido.itens.reduce(
    (acc, item) => acc + item.precoUnitario * item.quantidade * (1 - item.desconto / 100),
    0,
  )

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/pedidos")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Pedido #{pedido.numero}
            </h1>
            <p className="text-sm text-muted-foreground">
              Criado em {formatDataHora(pedido.criadoEm)}
            </p>
          </div>
        </div>
        <StatusBadgePedido status={pedido.status} pendencia={pedido.pendencia} />
      </div>

      {/* Painel de revisão / supervisor */}
      {pedido.status === "CRIADO" && isSupervisor && (
        <PainelRevisao pedido={pedido} onAprovar={handleAprovar} onRejeitar={handleRejeitar} />
      )}
      {pedido.status === "RESERVADO" && pedido.pendencia === "RUPTURA_ESTOQUE" && isSupervisor && (
        <PainelSupervisor pedido={pedido} onAutorizar={handleAutorizar} onBloquear={handleBloquear} />
      )}

      {/* Botão Solicitar devolução */}
      {pedido.status === "ENTREGUE" && podeAcessarDevolucoes(currentUser) && (
        <button
          type="button"
          onClick={() => setDevolucaoDrawerAberto(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Solicitar devolução
        </button>
      )}

      {/* Informações gerais */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cliente
          </p>
          <p className="font-medium text-foreground">{cliente?.nome ?? pedido.clienteId}</p>
          <p className="text-sm text-muted-foreground">{cliente?.documento}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Vendedor
          </p>
          <p className="font-medium text-foreground">{vendedor?.nome ?? pedido.vendedorId}</p>
          <p className="text-sm text-muted-foreground">{vendedor?.email}</p>
        </div>
      </div>

      {/* Endereço de entrega */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Endereço de entrega
          </p>
        </div>
        <p className="text-sm text-foreground">
          {pedido.endereco.logradouro}, {pedido.endereco.numero}
        </p>
        <p className="text-sm text-muted-foreground">
          {pedido.endereco.bairro} — {pedido.endereco.cidade}/{pedido.endereco.uf} · CEP {pedido.endereco.cep}
        </p>
      </div>

      {/* Itens */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Itens do pedido</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground">Produto</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Qtd</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Preço unit.</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Desconto</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Subtotal</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {pedido.itens.map((item) => {
                const produto = MOCK_PRODUTOS.find((p) => p.id === item.produtoId)
                const subtotalItem =
                  item.precoUnitario * item.quantidade * (1 - item.desconto / 100)
                return (
                  <tr key={item.id} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{produto?.nome ?? item.produtoId}</p>
                      <p className="text-xs text-muted-foreground">{produto?.skuInterno}</p>
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {item.quantidade} {produto?.unidadeMedida}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {formatBRL(item.precoUnitario)}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {item.desconto > 0 ? `${item.desconto}%` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-foreground">
                      {formatBRL(subtotalItem)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          ITEM_STATUS_COLOR[item.status],
                        )}
                      >
                        {ITEM_STATUS_LABEL[item.status]}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/30">
                <td colSpan={4} className="px-5 py-3 text-right text-sm font-semibold text-foreground">
                  Total
                </td>
                <td className="px-3 py-3 text-right text-base font-bold text-foreground">
                  {formatBRL(subtotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Observação */}
      {pedido.observacao && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Observação
          </p>
          <p className="text-sm text-foreground">{pedido.observacao}</p>
        </div>
      )}

      {/* Motivo cancelamento */}
      {pedido.status === "CANCELADO" && pedido.motivoCancelamento && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-destructive/80">
            Motivo do cancelamento
          </p>
          <p className="text-sm text-foreground">{pedido.motivoCancelamento}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-5 text-sm font-semibold text-foreground">Histórico do pedido</h2>
        <TimelineEventos eventos={pedido.eventos} />
      </div>

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}

      <SolicitarDevolucaoForm
        open={devolucaoDrawerAberto}
        pedido={pedido}
        onOpenChange={setDevolucaoDrawerAberto}
        onSuccess={() => showToast("Devolução solicitada com sucesso.")}
      />
    </div>
  )
}
