// app/dashboard/page.tsx
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
} from "lucide-react"

import { useCurrentUser } from "@/lib/auth-context"
import { useKpi } from "@/lib/use-kpi"
import { MOCK_PEDIDOS } from "@/lib/mock-pedidos"
import { MOCK_PRODUTOS } from "@/lib/mock-produtos"
import { MOCK_INVENTARIO } from "@/lib/mock-inventario"
import {
  getAguardandoSeparacao,
  getEmSeparacao,
  getAtrasados,
  getEntreguesHoje,
  getCanceladosHoje,
  getProdutosAbaixoMinimo,
  getGargalo,
  getProdutividadePorEtapa,
  getAlertas,
  STATUS_LABELS,
} from "@/lib/dashboard"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { AlertList } from "@/components/dashboard/alert-list"

export default function DashboardPage() {
  const currentUser = useCurrentUser()
  const isSupervisor = currentUser.role === "SUPERVISOR"

  const aguardando = useKpi(() => getAguardandoSeparacao(MOCK_PEDIDOS).length, [])
  const emSeparacao = useKpi(() => getEmSeparacao(MOCK_PEDIDOS).length, [])
  const atrasados = useKpi(() => getAtrasados(MOCK_PEDIDOS).length, [])
  const abaixoMinimo = useKpi(
    () => getProdutosAbaixoMinimo(MOCK_PRODUTOS, MOCK_INVENTARIO).length,
    [],
  )
  const entreguesHoje = useKpi(() => getEntreguesHoje(MOCK_PEDIDOS).length, [])
  const canceladosHoje = useKpi(() => getCanceladosHoje(MOCK_PEDIDOS).length, [])

  const alertas = useKpi(() => getAlertas(MOCK_PEDIDOS, MOCK_PRODUTOS, MOCK_INVENTARIO), [])

  const gargalo = useKpi(() => getGargalo(MOCK_PEDIDOS), [])
  const produtividade = useKpi(() => getProdutividadePorEtapa(MOCK_PEDIDOS), [])

  return (
      <div className="flex flex-col gap-6">
        {/* KPIs — iguais para Admin e Supervisor */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Aguardando separação"
            value={aguardando.value ?? 0}
            status={aguardando.status}
            href="/pedidos?status=RESERVADO"
            icon={Clock}
            criterio="Pedidos com reserva de estoque confirmada que ainda não iniciaram separação."
          />
          <KpiCard
            label="Em separação"
            value={emSeparacao.value ?? 0}
            status={emSeparacao.status}
            href="/pedidos?status=EM_SEPARACAO"
            icon={PackageCheck}
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
            criterio="Pedidos que passaram para o status Entregue durante o dia de hoje."
          />
          <KpiCard
            label="Cancelados hoje"
            value={canceladosHoje.value ?? 0}
            status={canceladosHoje.status}
            href="/pedidos?status=CANCELADO&periodo=hoje"
            icon={XCircle}
            criterio="Pedidos cancelados durante o dia de hoje."
          />
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

        {/* Alertas */}
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Alertas</h2>
          <AlertList alertas={alertas.value ?? []} status={alertas.status} />
        </div>
      </div>
  )
}