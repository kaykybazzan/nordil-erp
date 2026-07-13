"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  PackageX,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MOCK_PEDIDOS } from "@/lib/mock-pedidos"
import { MOCK_CLIENTES } from "@/lib/mock-clientes"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"
import { carregarInventarios } from "@/lib/mock-inventario"
import { StatusBadgePedido } from "@/components/pedidos/shared/status-badge"
import type { Pedido, StatusPedido } from "@/types/domain"

function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function isAtrasado(pedido: Pedido): boolean {
  if (pedido.status === "ENTREGUE" || pedido.status === "CANCELADO") return false
  if (pedido.pendencia !== "NENHUMA") return true
  const diffH = (Date.now() - new Date(pedido.statusAlteradoEm).getTime()) / (1000 * 60 * 60)
  return diffH > 48
}

const STATUS_ATIVOS: StatusPedido[] = [
  "CRIADO",
  "RESERVADO",
  "EM_SEPARACAO",
  "EM_CONFERENCIA",
  "CONFERIDO",
  "EXPEDIDO",
]

// ── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  variant?: "default" | "warning" | "danger" | "success"
  onClick?: () => void
}

function KpiCard({ label, value, sub, icon, variant = "default", onClick }: KpiCardProps) {
  const colorMap = {
    default: "text-primary",
    warning: "text-[hsl(var(--warning))]",
    danger: "text-destructive",
    success: "text-[hsl(var(--success))]",
  }
  const bgMap = {
    default: "bg-primary/8",
    warning: "bg-[hsl(var(--warning))]/10",
    danger: "bg-destructive/10",
    success: "bg-[hsl(var(--success))]/10",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-left transition-shadow",
        onClick && "hover:shadow-sm cursor-pointer",
        !onClick && "cursor-default",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", bgMap[variant])}>
          <span className={cn("h-4 w-4", colorMap[variant])}>{icon}</span>
        </span>
      </div>
      <div>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </div>
    </button>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-64 rounded-xl lg:col-span-3" />
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DashboardScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(t)
  }, [])

  // ── Derived data ────────────────────────────────────────────────────────
  const pedidosAtivos = MOCK_PEDIDOS.filter((p) => STATUS_ATIVOS.includes(p.status))
  const pedidosAtrasados = MOCK_PEDIDOS.filter(isAtrasado)
  const receitaMes = MOCK_PEDIDOS.filter(
    (p) => p.status !== "CANCELADO",
  ).reduce((acc, p) => acc + p.valorTotal, 0)

  const inventarios = carregarInventarios()
  const rupturas = inventarios
    .filter((i) => i.status === "zerado" || i.status === "baixo")
    .map((i) => ({ ...i, disponivel: Math.max(0, i.estoqueFisico - i.reservado) }))

  // 5 pedidos mais recentes (qualquer status exceto cancelado)
  const pedidosRecentes = [...MOCK_PEDIDOS]
    .filter((p) => p.status !== "CANCELADO")
    .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
    .slice(0, 6)

  const getCliente = (id: string) =>
    MOCK_CLIENTES.find((c) => c.id === id)?.nome ?? "—"
  const getVendedor = (id: string) =>
    MOCK_USUARIOS.find((u) => u.id === id)?.nome.split(" ")[0] ?? "—"

  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-6 p-6">
      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Pedidos ativos"
          value={pedidosAtivos.length}
          sub="em aberto agora"
          icon={<ShoppingCart className="h-4 w-4" />}
          onClick={() => router.push("/pedidos")}
        />
        <KpiCard
          label="Receita do mês"
          value={formatBRL(receitaMes)}
          sub="todos os pedidos não cancelados"
          icon={<TrendingUp className="h-4 w-4" />}
          variant="success"
        />
        <KpiCard
          label="Pedidos atrasados"
          value={pedidosAtrasados.length}
          sub={pedidosAtrasados.length === 0 ? "nenhum em atraso" : "requerem atenção"}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={pedidosAtrasados.length > 0 ? "warning" : "default"}
          onClick={() => router.push("/pedidos")}
        />
        <KpiCard
          label="Rupturas de estoque"
          value={rupturas.length}
          sub={rupturas.length === 0 ? "estoque normalizado" : "itens críticos"}
          icon={<PackageX className="h-4 w-4" />}
          variant={rupturas.length > 0 ? "danger" : "default"}
          onClick={() => router.push("/estoque")}
        />
      </div>

      {/* ── Tabelas ───────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Pedidos recentes */}
        <div className="flex flex-col rounded-xl border border-border bg-card lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Pedidos recentes</h2>
            <button
              type="button"
              onClick={() => router.push("/pedidos")}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Pedido
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Cliente
                  </th>
                  <th className="hidden px-3 py-2.5 text-left text-xs font-medium text-muted-foreground sm:table-cell">
                    Vendedor
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {pedidosRecentes.map((pedido) => (
                  <tr
                    key={pedido.id}
                    onClick={() => router.push(`/pedidos/${pedido.id}`)}
                    className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-5 py-3">
                      <span className="font-medium text-foreground">#{pedido.numero}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatDataCurta(pedido.criadoEm)}
                      </span>
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-3 text-muted-foreground">
                      {getCliente(pedido.clienteId)}
                    </td>
                    <td className="hidden px-3 py-3 text-muted-foreground sm:table-cell">
                      {getVendedor(pedido.vendedorId)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadgePedido
                        status={pedido.status}
                        pendencia={pedido.pendencia}
                        size="sm"
                      />
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-foreground">
                      {formatBRL(pedido.valorTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Estoque crítico */}
        <div className="flex flex-col rounded-xl border border-border bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Estoque crítico</h2>
            <button
              type="button"
              onClick={() => router.push("/estoque")}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Ver estoque <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {rupturas.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
              <CheckCircle2 className="h-8 w-8 text-[hsl(var(--success))]" />
              <p className="text-sm font-medium text-foreground">Estoque normalizado</p>
              <p className="text-xs text-muted-foreground">Nenhum item abaixo do mínimo.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {rupturas.slice(0, 6).map((item) => (
                <div
                  key={item.produtoId}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.produto.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.produto.skuInterno}</p>
                  </div>
                  <div className="ml-3 flex-shrink-0 text-right">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        item.status === "zerado"
                          ? "text-destructive"
                          : "text-[hsl(var(--warning))]",
                      )}
                    >
                      {item.disponivel}
                      <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                        /{item.produto.unidadeMedida}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">mín {item.estoqueMinimo}</p>
                  </div>
                </div>
              ))}
              {rupturas.length > 6 && (
                <div className="px-5 py-3 text-center text-xs text-muted-foreground">
                  +{rupturas.length - 6} itens
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Resumo de status ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Pedidos por status</h2>
        <div className="flex flex-wrap gap-3">
          {(
            [
              { status: "CRIADO" as const, label: "Criado", icon: <Clock className="h-3.5 w-3.5" /> },
              { status: "RESERVADO" as const, label: "Reservado", icon: <ShoppingCart className="h-3.5 w-3.5" /> },
              { status: "EM_SEPARACAO" as const, label: "Em separação", icon: <ShoppingCart className="h-3.5 w-3.5" /> },
              { status: "EM_CONFERENCIA" as const, label: "Em conferência", icon: <ShoppingCart className="h-3.5 w-3.5" /> },
              { status: "CONFERIDO" as const, label: "Conferido", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
              { status: "EXPEDIDO" as const, label: "Expedido", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
              { status: "ENTREGUE" as const, label: "Entregue", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
              { status: "CANCELADO" as const, label: "Cancelado", icon: <XCircle className="h-3.5 w-3.5" /> },
            ] as const
          ).map(({ status, label }) => {
            const count = MOCK_PEDIDOS.filter((p) => p.status === status).length
            return (
              <button
                key={status}
                type="button"
                onClick={() => router.push("/pedidos")}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm hover:bg-muted/80 transition-colors"
              >
                <StatusBadgePedido status={status} pendencia="NENHUMA" size="sm" />
                <span className="font-semibold text-foreground">{count}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
