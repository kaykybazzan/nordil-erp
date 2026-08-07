"use client"

import {
  Clock,
  PackageCheck,
  AlertTriangle,
  PackageX,
  CheckCircle2,
  XCircle,
  TrendingUp,
  GaugeCircle,
  PieChart as PieChartIcon,
  Activity,
  Receipt,
  Bell,
} from "lucide-react"

import { useCurrentUser } from "@/lib/auth-context"
import { useKpi } from "@/lib/use-kpi"
import { actionObterPedidos } from "@/lib/actions/pedidos"
import { listarProdutos } from "@/lib/actions/produtos"
import { actionCarregarInventarios } from "@/lib/actions/estoque"
import {
  getAguardandoSeparacao,
  getEmSeparacao,
  getAtrasados,
  getEntreguesHoje,
  getCanceladosHoje,
  getEntreguesOntem,
  getCanceladosOntem,
  calcularDelta,
  getProdutosAbaixoMinimo,
  getGargalo,
  getProdutividadePorEtapa,
  getAlertas,
  getPedidosPorStatus,
  getPedidosCriadosUltimosDias,
  getAtividadeRecente,
  getResumoPeriodo,
  STATUS_LABELS,
} from "@/lib/dashboard"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { AlertList } from "@/components/dashboard/alert-list"
import { StatusDonutChart } from "@/components/dashboard/status-donut-chart"
import { TendenciaChart } from "@/components/dashboard/tendencia-chart"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { ResumoPeriodo } from "@/components/dashboard/resumo-periodo"

export default function DashboardPage() {
  const currentUser = useCurrentUser()
  const isSupervisor = currentUser.role === "SUPERVISOR"

  const pedidosKpi = useKpi(async () => {
    const resultado = await actionObterPedidos()
    return resultado.ok ? resultado.data : []
  }, [])
  const carregandoPedidos = pedidosKpi.status === "loading"

  const aguardando = useKpi(() => getAguardandoSeparacao(pedidosKpi.value ?? []).length, [pedidosKpi.value])
  const emSeparacao = useKpi(() => getEmSeparacao(pedidosKpi.value ?? []).length, [pedidosKpi.value])
  const atrasados = useKpi(() => getAtrasados(pedidosKpi.value ?? []).length, [pedidosKpi.value])
  const entreguesHoje = useKpi(() => getEntreguesHoje(pedidosKpi.value ?? []).length, [pedidosKpi.value])
  const canceladosHoje = useKpi(() => getCanceladosHoje(pedidosKpi.value ?? []).length, [pedidosKpi.value])
  const entreguesOntem = useKpi(() => getEntreguesOntem(pedidosKpi.value ?? []).length, [pedidosKpi.value])
  const canceladosOntem = useKpi(() => getCanceladosOntem(pedidosKpi.value ?? []).length, [pedidosKpi.value])
  const gargalo = useKpi(() => getGargalo(pedidosKpi.value ?? []), [pedidosKpi.value])
  const produtividade = useKpi(() => getProdutividadePorEtapa(pedidosKpi.value ?? []), [pedidosKpi.value])

  // Só "hoje" tem base de comparação honesta ("ontem" é o mesmo tipo de recorte).
  // KPIs de estado atual (Aguardando/Em separação/Atrasados) não ganham delta —
  // exigiria snapshot histórico que o sistema não guarda.
  const deltaEntregues =
    entreguesHoje.value != null && entreguesOntem.value != null
      ? calcularDelta(entreguesHoje.value, entreguesOntem.value)
      : undefined
  const deltaCancelados =
    canceladosHoje.value != null && canceladosOntem.value != null
      ? calcularDelta(canceladosHoje.value, canceladosOntem.value)
      : undefined

  const statusDistribuicao = useKpi(() => getPedidosPorStatus(pedidosKpi.value ?? []), [pedidosKpi.value])
  const tendencia7dias = useKpi(() => getPedidosCriadosUltimosDias(pedidosKpi.value ?? [], 7), [pedidosKpi.value])
  const atividadeRecente = useKpi(() => getAtividadeRecente(pedidosKpi.value ?? [], 8), [pedidosKpi.value])
  const resumoPeriodo = useKpi(() => getResumoPeriodo(pedidosKpi.value ?? [], 7), [pedidosKpi.value])

  const abaixoMinimo = useKpi(
    async () => {
      const [prodResult, invResult] = await Promise.all([
        listarProdutos(),
        actionCarregarInventarios(),
      ])
      if (!prodResult.ok || !prodResult.data || !invResult.ok || !invResult.data) return 0
      return getProdutosAbaixoMinimo(prodResult.data, invResult.data).length
    },
    [],
  )

  const alertas = useKpi(
    async () => {
      const [prodResult, invResult] = await Promise.all([
        listarProdutos(),
        actionCarregarInventarios(),
      ])
      if (!prodResult.ok || !prodResult.data || !invResult.ok || !invResult.data) return []
      return getAlertas(pedidosKpi.value ?? [], prodResult.data, invResult.data)
    },
    [pedidosKpi.value],
  )

  return (
      <div className="flex h-full min-h-0 flex-col gap-4">
        {/* KPIs — iguais para Admin e Supervisor */}
        <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label="Aguardando separação"
            value={aguardando.value ?? 0}
            status={aguardando.status}
            href="/pedidos?status=RESERVADO"
            icon={Clock}
            tone="info"
            criterio="Pedidos com reserva de estoque confirmada que ainda não iniciaram separação."
          />
          <KpiCard
            label="Em separação"
            value={emSeparacao.value ?? 0}
            status={emSeparacao.status}
            href="/pedidos?status=EM_SEPARACAO"
            icon={PackageCheck}
            tone="info"
            criterio="Pedidos com separação em andamento."
          />
          <KpiCard
            label="Atrasados"
            value={atrasados.value ?? 0}
            status={atrasados.status}
            href="/pedidos?atrasado=true"
            icon={AlertTriangle}
            tone="danger"
            criterio="Pedidos reservados há mais de 24h sem iniciar separação, ou em separação há mais de 48h sem conferência."
          />
          <KpiCard
            label="Produtos abaixo do mínimo"
            value={abaixoMinimo.value ?? 0}
            status={abaixoMinimo.status}
            href="/estoque?abaixoMinimo=true"
            icon={PackageX}
            tone="danger"
            criterio="Produtos ativos cujo estoque disponível (físico − reservado) está abaixo do estoque mínimo cadastrado."
          />
          <KpiCard
            label="Entregues hoje"
            value={entreguesHoje.value ?? 0}
            status={entreguesHoje.status}
            href="/pedidos?status=ENTREGUE&periodo=hoje"
            icon={CheckCircle2}
            tone="success"
            delta={deltaEntregues}
            criterio="Pedidos que passaram para o status Entregue durante o dia de hoje."
          />
          <KpiCard
            label="Cancelados hoje"
            value={canceladosHoje.value ?? 0}
            status={canceladosHoje.status}
            href="/pedidos?status=CANCELADO&periodo=hoje"
            icon={XCircle}
            tone="warning"
            delta={deltaCancelados}
            criterio="Pedidos cancelados durante o dia de hoje."
          />
        </div>

        {/* Visão do funil + alertas + atividade */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
          <div className="flex min-h-0 flex-col rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              Pedidos por status
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {carregandoPedidos ? (
                <div className="flex items-center gap-6">
                  <div className="h-[150px] w-[150px] shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="flex flex-1 flex-col gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                </div>
              ) : (
                <StatusDonutChart dados={statusDistribuicao.value ?? []} />
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
              <Bell className="h-4 w-4 text-muted-foreground" />
              Alertas
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <AlertList alertas={alertas.value ?? []} status={alertas.status} />
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Atividade recente
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {carregandoPedidos ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-8 w-full animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : (
                <ActivityFeed itens={atividadeRecente.value ?? []} />
              )}
            </div>
          </div>
        </div>

        {/* Tendência de volume + resumo do período */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex min-h-0 flex-col rounded-lg border border-border bg-card p-4 lg:col-span-2">
            <div className="mb-3 flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Pedidos criados nos últimos 7 dias
            </div>
            <div className="min-h-0 flex-1">
              {carregandoPedidos ? (
                <div className="h-full w-full animate-pulse rounded bg-muted" />
              ) : (
                <TendenciaChart dados={tendencia7dias.value ?? []} />
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              Resumo dos últimos 7 dias
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {carregandoPedidos ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : (
                <ResumoPeriodo
                  dados={
                    resumoPeriodo.value ?? {
                      totalPedidos: 0,
                      totalFaturado: 0,
                      itensMovimentados: 0,
                      clientesAtendidos: 0,
                    }
                  }
                />
              )}
            </div>
          </div>
        </div>

        {/* Extras — só Supervisor */}
        {isSupervisor && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <GaugeCircle className="h-4 w-4 text-muted-foreground" />
                Gargalo atual
              </div>
              {gargalo.status === "loading" ? (
                <div className="h-5 w-48 animate-pulse rounded bg-muted" />
              ) : gargalo.status === "error" || !gargalo.value ? (
                <p className="text-sm text-muted-foreground">
                  {gargalo.status === "error"
                    ? "Não foi possível calcular."
                    : "Nenhuma etapa com pedidos parados."}
                </p>
              ) : (
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{STATUS_LABELS[gargalo.value.status]}</span>{" "}
                  concentra o maior volume de pedidos parados agora ({gargalo.value.quantidade}{" "}
                  {gargalo.value.quantidade === 1 ? "pedido" : "pedidos"}).
                </p>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Produtividade por etapa
              </div>
              {produtividade.status === "loading" ? (
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                </div>
              ) : produtividade.status === "error" ? (
                <p className="text-sm text-muted-foreground">Não foi possível calcular.</p>
              ) : produtividade.value && produtividade.value.length > 0 ? (
                <ul className="flex flex-col gap-2 text-sm">
                  {produtividade.value.map((etapa) => (
                    <li key={etapa.status} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{STATUS_LABELS[etapa.status]}</span>
                      <span className="tabular-nums text-foreground">
                        {etapa.tempoMedioHoras < 1
                          ? "< 1h"
                          : `${Math.round(etapa.tempoMedioHoras)}h em média`}{" "}
                        <span className="text-muted-foreground">({etapa.quantidade})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Sem pedidos em andamento no momento.</p>
              )}
            </div>
          </div>
        )}
      </div>
  )
}
