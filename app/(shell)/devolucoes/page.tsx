"use client"

import { useMemo, useState } from "react"
import { useCurrentUser } from "@/lib/auth-context"
import { useDevolucoesStore } from "@/lib/devolucoes-store"
import { usePedidosStore } from "@/lib/pedidos-store"
import { podeAcessarDevolucoes, podeGerenciarDevolucao } from "@/lib/policies"
import { MOCK_CLIENTES } from "@/lib/mock-clientes"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"
import type { StatusDevolucao, MotivoDevolucao, Devolucao } from "@/types/domain"
import { PeriodoFiltro, periodoUltimos30Dias } from "@/components/relatorios/periodo-filtro"
import { Autocomplete } from "@/components/ui/autocomplete"
import { DataTable, type DataTableColumn, type DataTableSort } from "@/components/ui/data-table"
import { DevolucaoDetalheDrawer } from "@/components/devolucoes/devolucao-detalhe-drawer"

const STATUS_OPTIONS: { value: StatusDevolucao | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "SOLICITADA", label: "Solicitada" },
  { value: "CONCLUIDA", label: "Concluída" },
  { value: "CANCELADA", label: "Cancelada" },
]

const MOTIVO_LABELS: Record<MotivoDevolucao, string> = {
  PRODUTO_AVARIADO: "Produto avariado",
  PRODUTO_INCORRETO: "Produto incorreto",
  DEFEITO: "Defeito",
  DESISTENCIA_CLIENTE: "Desistência do cliente",
  EXCESSO_COMPRA: "Excesso de compra",
  OUTRO: "Outro",
}

const formatarData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

const formatarDataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

type DevolucaoComDados = Devolucao & {
  numeroPedido: number
  clienteNome: string
  solicitadoPorNome: string
}

export default function DevolucoesPage() {
  const currentUser = useCurrentUser()
  const devolucoesStore = useDevolucoesStore()
  const pedidosStore = usePedidosStore()

  const [periodo, setPeriodo] = useState(periodoUltimos30Dias())
  const [status, setStatus] = useState<StatusDevolucao | "">("")
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [numeroPedido, setNumeroPedido] = useState<string>("")
  const [visibleCount, setVisibleCount] = useState(20)
  const [sort, setSort] = useState<DataTableSort | null>(null)
  const [devolucaoSelecionada, setDevolucaoSelecionada] = useState<Devolucao | null>(null)
  const [drawerAberto, setDrawerAberto] = useState(false)

  const periodoInvalido = periodo.fim !== "" && periodo.inicio !== "" && periodo.fim < periodo.inicio

  const podeGerenciar = podeGerenciarDevolucao(currentUser)

  const clienteOptions = useMemo(
    () =>
      MOCK_CLIENTES.filter((c) => c.empresaId === currentUser.empresaId).map((c) => ({
        value: c.id,
        label: c.nome,
      })),
    [currentUser.empresaId],
  )

  const devolucoesComDados = useMemo(() => {
    if (periodoInvalido) return []

    return devolucoesStore.devolucoes
      .filter((d) => {
        // Filter by empresaId
        if (d.empresaId !== currentUser.empresaId) return false

        // Filter by status
        if (status && d.status !== status) return false

        // Filter by periodo (solicitadoEm)
        const solicitadoEm = new Date(d.solicitadoEm)
        const inicio = periodo.inicio ? new Date(periodo.inicio) : null
        const fim = periodo.fim ? new Date(periodo.fim) : null

        if (inicio && solicitadoEm < inicio) return false
        if (fim && solicitadoEm > fim) return false

        // Filter by cliente (via pedido)
        if (clienteId) {
          const pedido = pedidosStore.pedidos.find((p) => p.id === d.pedidoId)
          if (!pedido || pedido.clienteId !== clienteId) return false
        }

        // Filter by numeroPedido
        if (numeroPedido) {
          const pedido = pedidosStore.pedidos.find((p) => p.id === d.pedidoId)
          if (!pedido || !pedido.numero.toString().includes(numeroPedido)) return false
        }

        return true
      })
      .map((d) => {
        const pedido = pedidosStore.pedidos.find((p) => p.id === d.pedidoId)
        const cliente = pedido ? MOCK_CLIENTES.find((c) => c.id === pedido.clienteId) : null
        const usuario = MOCK_USUARIOS.find((u) => u.id === d.solicitadoPor)

        return {
          ...d,
          numeroPedido: pedido?.numero ?? 0,
          clienteNome: cliente?.nome ?? pedido?.clienteId ?? "—",
          solicitadoPorNome: usuario?.nome ?? d.solicitadoPor,
        }
      })
  }, [
    devolucoesStore.devolucoes,
    currentUser.empresaId,
    status,
    periodo,
    periodoInvalido,
    clienteId,
    numeroPedido,
    pedidosStore.pedidos,
  ])

  const tabelaOrdenada = useMemo(() => {
    const tabela = [...devolucoesComDados]
    if (!sort) return tabela
    tabela.sort((a, b) => {
      let cmp = 0
      switch (sort.columnId) {
        case "numeroPedido":
          cmp = a.numeroPedido - b.numeroPedido
          break
        case "cliente":
          cmp = a.clienteNome.localeCompare(b.clienteNome)
          break
        case "status":
          cmp = a.status.localeCompare(b.status)
          break
        case "solicitadoEm":
          cmp = new Date(a.solicitadoEm).getTime() - new Date(b.solicitadoEm).getTime()
          break
      }
      return sort.direction === "asc" ? cmp : -cmp
    })
    return tabela
  }, [devolucoesComDados, sort])

  function handleSortChange(columnId: string) {
    setSort((prev) => {
      if (!prev || prev.columnId !== columnId) return { columnId, direction: "asc" }
      if (prev.direction === "asc") return { columnId, direction: "desc" }
      return null
    })
  }

  function handleRowClick(row: DevolucaoComDados) {
    setDevolucaoSelecionada(row)
    setDrawerAberto(true)
  }

  const columns: DataTableColumn<DevolucaoComDados>[] = [
    { id: "numeroPedido", header: "Nº Pedido", cell: (r) => r.numeroPedido, sortable: true },
    { id: "cliente", header: "Cliente", cell: (r) => r.clienteNome, sortable: true },
    { id: "status", header: "Status", cell: (r) => r.status, sortable: true },
    { id: "motivo", header: "Motivo", cell: (r) => MOTIVO_LABELS[r.motivo] ?? r.motivo },
    { id: "solicitadoEm", header: "Solicitado em", cell: (r) => formatarData(r.solicitadoEm), sortable: true },
    { id: "solicitadoPor", header: "Solicitado por", cell: (r) => r.solicitadoPorNome },
  ]

  // Access control
  if (!podeAcessarDevolucoes(currentUser)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="text-base font-medium text-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <PeriodoFiltro value={periodo} onChange={setPeriodo} />
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusDevolucao | "")}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <Autocomplete
          label="Cliente"
          options={clienteOptions}
          value={clienteId}
          onChange={setClienteId}
          placeholder="Buscar cliente…"
          className="w-56"
        />
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Nº Pedido
          <input
            type="text"
            value={numeroPedido}
            onChange={(e) => setNumeroPedido(e.target.value)}
            placeholder="Buscar por número…"
            className="h-9 w-40 rounded-md border border-input bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </label>
      </div>

      <DataTable
        columns={columns}
        data={tabelaOrdenada.slice(0, visibleCount)}
        getRowId={(r) => r.id}
        onRowClick={handleRowClick}
        emptyState="Nenhuma devolução encontrada para os filtros selecionados."
        hasMore={visibleCount < tabelaOrdenada.length}
        onLoadMore={() => setVisibleCount((c) => c + 20)}
        sort={sort}
        onSortChange={handleSortChange}
      />

      <DevolucaoDetalheDrawer
        open={drawerAberto}
        devolucao={devolucaoSelecionada}
        onOpenChange={setDrawerAberto}
      />
    </div>
  )
}
