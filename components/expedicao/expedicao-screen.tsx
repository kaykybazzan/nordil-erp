"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Truck, CheckCircle2, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { listarClientes } from "@/lib/actions/clientes"
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

export function ExpedicaoScreen() {
  const router = useRouter()
  const currentUser = useCurrentUser()

  const todosPedidos = usePedidosStore((s) => s.pedidos)
  const carregarPedidos = usePedidosStore((s) => s.carregarPedidos)
  const expedirPedido = usePedidosStore((s) => s.expedirPedido)
  const marcarEntregue = usePedidosStore((s) => s.marcarEntregue)

  const [loading, setLoading] = useState(true)
  const [transportadoras, setTransportadoras] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const [clientes, setClientes] = useState<any[]>([])

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    Promise.all([carregarPedidos(), listarClientes()]).then(() => {
      setLoading(false)
    })
  }, [carregarPedidos])

  const pedidos = todosPedidos.filter(
    (p) => p.status === "CONFERIDO" || p.status === "EXPEDIDO",
  )

  async function expedir(id: string) {
    const transp = transportadoras[id]?.trim()
    if (!transp) {
      showToast("Informe a transportadora antes de expedir.")
      return
    }
    const resultado = await expedirPedido(id, transp)
    if (!resultado.ok) {
      showToast(resultado.error || "Erro ao expedir pedido")
      return
    }
    await carregarPedidos()
    showToast("Pedido expedido com sucesso.")
  }

  async function marcarEntregueHandler(id: string) {
    const resultado = await marcarEntregue(id)
    if (!resultado.ok) {
      showToast(resultado.error || "Erro ao marcar entregue")
      return
    }
    await carregarPedidos()
    showToast("Entrega confirmada.")
  }

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <Package className="h-10 w-10 text-muted-foreground" />
        <p className="text-base font-medium text-foreground">Nenhum pedido para expedir</p>
        <p className="text-sm text-muted-foreground">Os pedidos conferidos aparecerão aqui.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Expedição</h1>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {pedidos.map((pedido) => {
        const cliente = clientes.find((c) => c.id === pedido.clienteId)
        const transp = transportadoras[pedido.id] ?? ""

        return (
          <div key={pedido.id} className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">#{pedido.numero}</span>
                  <StatusBadgePedido status={pedido.status} pendencia={pedido.pendencia} size="sm" />
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {cliente?.nome} · {formatData(pedido.criadoEm)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {pedido.endereco.cidade}/{pedido.endereco.uf}
                </p>
              </div>
              <p className="flex-shrink-0 text-sm font-medium text-foreground">
                {formatBRL(pedido.valorTotal)}
              </p>
            </div>

            {/* Transportadora / ações */}
            {pedido.status === "CONFERIDO" && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    Transportadora
                  </label>
                  <input
                    type="text"
                    value={transp}
                    onChange={(e) =>
                      setTransportadoras((prev) => ({ ...prev, [pedido.id]: e.target.value }))
                    }
                    placeholder="Ex.: Correios, LATAM Cargo..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/pedidos/${pedido.id}`)}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Detalhes
                  </button>
                  <button
                    type="button"
                    onClick={() => expedir(pedido.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Truck className="h-4 w-4" />
                    Expedir
                  </button>
                </div>
              </div>
            )}

            {pedido.status === "EXPEDIDO" && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  {pedido.transportadora && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Transportadora:</span>{" "}
                      {pedido.transportadora}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => marcarEntregueHandler(pedido.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-[hsl(var(--success))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Marcar como entregue
                </button>
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