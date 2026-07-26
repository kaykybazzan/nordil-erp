"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Clock,
  Package,
  AlertTriangle,
  PackageX,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingDown,
  Timer,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MOCK_PEDIDOS } from "@/lib/mock-pedidos"
import { carregarInventarios } from "@/lib/mock-inventario"
import type { Usuario } from "@/types/domain"

// ── helpers ──────────────────────────────────────────────────────────────────

function hoje(): string {
  return new Date().toISOString().slice(0, 10)
}

function isAtrasado(statusAlteradoEm: string, limiteHoras: number): boolean {
  const diffH = (Date.now() - new Date(statusAlteradoEm).getTime()) / (1000 * 60 * 60)
  return diffH > limiteHoras
}

// ── tipos ─────────────────────────────────────────────────────────────────────

interface KpiData {
  label: string
  value: number
  variant: "default" | "warning" | "danger" | "success" | "neutral"
  icon: React.ReactNode
  tooltip: string
  href: string
  /** quando true, "0" é positivo (ex: atrasados = 0 = bom) */
  zeroIsGood?: boolean
  error?: boolean
}

interface AlertaItem {
  id: string
  severidade: "critica" | "alta" | "media"
  texto: string
  href: string
}

interface ProdutividadeEtapa {
  etapa: string
  count: number
  tempoMedioHoras: number
}

// ── dados derivados ───────────────────────────────────────────────────────────

function calcularKpis(): KpiData[] {
  const pedidos = MOCK_PEDIDOS
  const invs = carregarInventarios()
  const dataHoje = hoje()

  const aguardandoSeparacao = pedidos.filter((p) => p.status === "RESERVADO").length
  const emSeparacao = pedidos.filter((p) => p.status === "EM_SEPARACAO").length
  const atrasados = pedidos.filter((p) => {
    if (p.status === "ENTREGUE" || p.status === "CANCELADO") return false
    if (p.pendencia !== "NENHUMA") return true
    if (p.status === "RESERVADO") return isAtrasado(p.statusAlteradoEm, 24)
    if (p.status === "EM_SEPARACAO") return isAtrasado(p.statusAlteradoEm, 48)
    return false
  }).length
  const abaixoDoMinimo = invs.filter((i) => i.status === "zerado" || i.status === "baixo").length
  const entreguesHoje = pedidos.filter(
    (p) => p.status === "ENTREGUE" && p.statusAlteradoEm.slice(0, 10) === dataHoje,
  ).length
  const canceladosHoje = pedidos.filter(
    (p) => p.status === "CANCELADO" && p.statusAlteradoEm.slice(0, 10) === dataHoje,
  ).length

  return [
    {
      label: "Aguardando separação",
      value: aguardandoSeparacao,
      variant: aguardandoSeparacao > 0 ? "warning" : "default",
      icon: <Clock className="h-4 w-4" />,
      tooltip:
        "Pedidos no status RESERVADO que ainda não iniciaram a separação física.",
      href: "/pedidos?status=RESERVADO",
    },
    {
      label: "Em separação",
      value: emSeparacao,
      variant: emSeparacao > 0 ? "default" : "neutral",
      icon: <Package className="h-4 w-4" />,
      tooltip:
        "Pedidos com separação iniciada e ainda não finalizados (status EM_SEPARACAO).",
      href: "/pedidos?status=EM_SEPARACAO",
    },
    {
      label: "Atrasados",
      value: atrasados,
      variant: atrasados > 0 ? "danger" : "success",
      icon: <AlertTriangle className="h-4 w-4" />,
      tooltip:
        "Atrasados: pedidos reservados há mais de 24h sem iniciar separação, ou em separação há mais de 48h sem conferência, ou com pendência ativa.",
      href: "/pedidos?atrasados=true",
      zeroIsGood: true,
    },
    {
      label: "Produtos abaixo do mínimo",
      value: abaixoDoMinimo,
      variant: abaixoDoMinimo > 0 ? "danger" : "success",
      icon: <PackageX className="h-4 w-4" />,
      tooltip:
        "Produtos com estoque disponível (físico menos reservas) igual ou abaixo do mínimo configurado.",
      href: "/estoque?status=critico",
      zeroIsGood: true,
    },
    {
      label: "Entregues hoje",
      value: entreguesHoje,
      variant: "success",
      icon: <CheckCircle2 className="h-4 w-4" />,
      tooltip: "Pedidos que tiveram o status alterado para ENTREGUE no dia de hoje.",
      href: `/pedidos?status=ENTREGUE&data=${dataHoje}`,
    },
    {
      label: "Cancelados hoje",
      value: canceladosHoje,
      variant: canceladosHoje > 0 ? "warning" : "neutral",
      icon: <XCircle className="h-4 w-4" />,
      tooltip: "Pedidos cancelados no dia de hoje.",
      href: `/pedidos?status=CANCELADO&data=${dataHoje}`,
      zeroIsGood: true,
    },
  ]
}

function calcularAlertas(): AlertaItem[] {
  const pedidos = MOCK_PEDIDOS
  const invs = carregarInventarios()
  const alertas: AlertaItem[] = []

  // Pedidos com pendência crítica
  const comPendencia = pedidos.filter(
    (p) => p.pendencia !== "NENHUMA" && p.status !== "ENTREGUE" && p.status !== "CANCELADO",
  )
  if (comPendencia.length > 0) {
    alertas.push({
      id: "pendencias",
      severidade: "critica",
      texto: `${comPendencia.length} ${comPendencia.length === 1 ? "pedido com pendência crítica" : "pedidos com pendência crítica"} — requerem intervenção imediata.`,
      href: "/pedidos?pendencia=true",
    })
  }

  // Produtos zerados
  const zerados = invs.filter((i) => i.status === "zerado")
  if (zerados.length > 0) {
    alertas.push({
      id: "zerados",
      severidade: "critica",
      texto: `${zerados.length} ${zerados.length === 1 ? "produto sem estoque" : "produtos sem estoque"} — separação pode ser bloqueada.`,
      href: "/estoque?status=zerado",
    })
  }

  // Pedidos aguardando separação há mais de 24h
  const aguardandoAtrasados = pedidos.filter(
    (p) => p.status === "RESERVADO" && isAtrasado(p.statusAlteradoEm, 24),
  )
  if (aguardandoAtrasados.length > 0) {
    alertas.push({
      id: "reservados-atrasados",
      severidade: "alta",
      texto: `${aguardandoAtrasados.length} ${aguardandoAtrasados.length === 1 ? "pedido reservado há mais de 24h" : "pedidos reservados há mais de 24h"} sem iniciar separação.`,
      href: "/pedidos?status=RESERVADO&atrasados=true",
    })
  }

  // Produtos com estoque baixo
  const baixo = invs.filter((i) => i.status === "baixo")
  if (baixo.length > 0) {
    alertas.push({
      id: "estoque-baixo",
      severidade: "media",
      texto: `${baixo.length} ${baixo.length === 1 ? "produto com estoque abaixo do mínimo" : "produtos com estoque abaixo do mínimo"} — solicite reposição.`,
      href: "/estoque?status=baixo",
    })
  }

  // Pedidos em separação há mais de 48h
  const separacaoAtrasada = pedidos.filter(
    (p) => p.status === "EM_SEPARACAO" && isAtrasado(p.statusAlteradoEm, 48),
  )
  if (separacaoAtrasada.length > 0) {
    alertas.push({
      id: "separacao-atrasada",
      severidade: "alta",
      texto: `${separacaoAtrasada.length} ${separacaoAtrasada.length === 1 ? "pedido em separação há mais de 48h" : "pedidos em separação há mais de 48h"} sem avançar para conferência.`,
      href: "/pedidos?status=EM_SEPARACAO&atrasados=true",
    })
  }

  // Ordenar: critica → alta → media
  const ordem = { critica: 0, alta: 1, media: 2 }
  return alertas.sort((a, b) => ordem[a.severidade] - ordem[b.severidade])
}

function calcularProdutividadeSupervisor(): ProdutividadeEtapa[] {
  const pedidos = MOCK_PEDIDOS.filter(
    (p) => p.status !== "CANCELADO" && p.status !== "ENTREGUE",
  )

  const etapas: { status: string; label: string }[] = [
    { status: "RESERVADO", label: "Aguardando separação" },
    { status: "EM_SEPARACAO", label: "Separação" },
    { status: "EM_CONFERENCIA", label: "Conferência" },
    { status: "CONFERIDO", label: "Aguardando expedição" },
    { status: "EXPEDIDO", label: "Em trânsito" },
  ]

  return etapas.map(({ status, label }) => {
    const grupo = pedidos.filter((p) => p.status === status)
    const tempoTotal = grupo.reduce((acc, p) => {
      const h = (Date.now() - new Date(p.statusAlteradoEm).getTime()) / (1000 * 60 * 60)
      return acc + h
    }, 0)
    return {
      etapa: label,
      count: grupo.length,
      tempoMedioHoras: grupo.length > 0 ? Math.round(tempoTotal / grupo.length) : 0,
    }
  })
}

// ── sub-componentes ───────────────────────────────────────────────────────────

const VARIANT_COLOR: Record<KpiData["variant"], { text: string; iconBg: string; iconText: string }> = {
  default:  { text: "text-foreground",                   iconBg: "bg-primary/10",       iconText: "text-primary"      },
  warning:  { text: "text-warning-foreground",           iconBg: "bg-warning/15",       iconText: "text-warning"      },
  danger:   { text: "text-destructive",                  iconBg: "bg-destructive/10",   iconText: "text-destructive"  },
  success:  { text: "text-success",                      iconBg: "bg-success/10",       iconText: "text-success"      },
  neutral:  { text: "text-muted-foreground",             iconBg: "bg-muted",            iconText: "text-muted-foreground" },
}

interface KpiCardProps extends KpiData {
  onNavigate: (href: string) => void
}

function KpiCard({ label, value, variant, icon, tooltip, href, zeroIsGood, error, onNavigate }: KpiCardProps) {
  const effectiveVariant: KpiData["variant"] = error ? "neutral" : variant
  const colors = VARIANT_COLOR[effectiveVariant]
  const displayValue = error ? "—" : value

  // srLabel combina valor e rótulo para leitores de tela (spec item 29)
  const srLabel = error
    ? `${label}: erro ao carregar`
    : `${displayValue} ${label}`

  return (
    <button
      type="button"
      onClick={() => onNavigate(href)}
      aria-label={srLabel}
      title={tooltip}
      className={cn(
        "group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-5 text-left",
        "transition-all duration-150 hover:border-border/80 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {/* Linha superior: rótulo + ícone */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium leading-tight text-muted-foreground">
          {label}
        </span>
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", colors.iconBg)}>
          <span className={colors.iconText}>{icon}</span>
        </span>
      </div>

      {/* Valor */}
      <div className="flex items-end justify-between gap-1">
        <span
          className={cn(
            "tabular-nums text-3xl font-semibold leading-none tracking-tight",
            error ? "text-muted-foreground" : colors.text,
          )}
          aria-hidden="true"
        >
          {displayValue}
        </span>
        {error && (
          <span title="Erro ao carregar este indicador">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        )}
        {!error && zeroIsGood && value === 0 && (
          <CheckCircle2 className="mb-0.5 h-4 w-4 text-success" aria-hidden="true" />
        )}
      </div>

      {/* Indicador de navegação */}
      <ChevronRight
        className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
    </button>
  )
}

// ── alerta ────────────────────────────────────────────────────────────────────

const ALERTA_CONFIG = {
  critica: {
    icon: <AlertCircle className="h-4 w-4" />,
    bar: "bg-destructive",
    iconColor: "text-destructive",
    bg: "bg-destructive/5",
    border: "border-destructive/20",
  },
  alta: {
    icon: <AlertTriangle className="h-4 w-4" />,
    bar: "bg-warning",
    iconColor: "text-warning",
    bg: "bg-warning/5",
    border: "border-warning/20",
  },
  media: {
    icon: <TrendingDown className="h-4 w-4" />,
    bar: "bg-info",
    iconColor: "text-info",
    bg: "bg-info/5",
    border: "border-info/20",
  },
} as const

function AlertaRow({ alerta, onNavigate }: { alerta: AlertaItem; onNavigate: (href: string) => void }) {
  const config = ALERTA_CONFIG[alerta.severidade]
  return (
    <button
      type="button"
      onClick={() => onNavigate(alerta.href)}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left",
        "transition-all duration-150 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        config.bg,
        config.border,
      )}
    >
      <span className={cn("mt-0.5 shrink-0", config.iconColor)}>{config.icon}</span>
      <span className="flex-1 text-sm text-foreground">{alerta.texto}</span>
      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
    </button>
  )
}

// ── produtividade (supervisor) ────────────────────────────────────────────────

function ProdutividadeEtapaRow({
  etapa,
  count,
  tempoMedioHoras,
  isGargalo,
}: ProdutividadeEtapa & { isGargalo: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-4 py-3",
        isGargalo ? "border-warning/30 bg-warning/5" : "border-border bg-card",
      )}
    >
      <div className="flex items-center gap-2">
        {isGargalo && <Timer className="h-3.5 w-3.5 text-warning" aria-hidden="true" />}
        <span className={cn("text-sm", isGargalo ? "font-semibold text-foreground" : "text-foreground")}>
          {etapa}
        </span>
        {isGargalo && (
          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">
            gargalo
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm tabular-nums">
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{count}</span> pedido{count !== 1 ? "s" : ""}
        </span>
        <span className="text-muted-foreground">
          {tempoMedioHoras}h médio
        </span>
      </div>
    </div>
  )
}

// ── skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 p-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-24 rounded" />
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
      </div>
    </div>
  )
}

// ── componente principal ──────────────────────────────────────────────────────

interface DashboardScreenProps {
  usuario?: Usuario
}

export function DashboardScreen({ usuario }: DashboardScreenProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(t)
  }, [])

  const isSupervisor = usuario?.role === "SUPERVISOR"

  const kpis = calcularKpis()
  const alertas = calcularAlertas()
  const alertasVisiveis = alertas.slice(0, 5)
  const alertasExtras = alertas.length - 5

  const produtividade = isSupervisor ? calcularProdutividadeSupervisor() : []
  const gargalo = isSupervisor
    ? produtividade.reduce(
        (max, e) => (e.count > max.count ? e : max),
        produtividade[0] ?? { etapa: "", count: 0, tempoMedioHoras: 0 },
      )
    : null

  function navegar(href: string) {
    router.push(href)
  }

  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-8 p-6">

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <section aria-label="Indicadores operacionais">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} onNavigate={navegar} />
          ))}
        </div>
      </section>

      {/* ── Alertas ───────────────────────────────────────────────────── */}
      <section aria-label="Alertas operacionais" aria-live="polite">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Alertas</h2>
          {alertas.length > 0 && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              {alertas.length}
            </span>
          )}
        </div>

        {alertas.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 px-5 py-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <p className="text-sm text-foreground">
              Nenhum alerta no momento — operação em dia.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {alertasVisiveis.map((alerta) => (
              <AlertaRow key={alerta.id} alerta={alerta} onNavigate={navegar} />
            ))}
            {alertasExtras > 0 && (
              <button
                type="button"
                onClick={() => navegar("/estoque?status=critico")}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-xs text-muted-foreground transition-colors hover:border-border/80 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Ver mais {alertasExtras} alerta{alertasExtras !== 1 ? "s" : ""}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Produtividade por etapa (Supervisor) ─────────────────────── */}
      {isSupervisor && (
        <section aria-label="Produtividade por etapa">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">Produtividade por etapa</h2>
          </div>
          <div className="space-y-2">
            {produtividade.map((etapa) => (
              <ProdutividadeEtapaRow
                key={etapa.etapa}
                {...etapa}
                isGargalo={gargalo?.etapa === etapa.etapa && etapa.count > 0}
              />
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
