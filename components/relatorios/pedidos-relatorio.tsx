"use client"

import { useEffect, useMemo, useState } from "react"
import { useCurrentUser } from "@/lib/auth-context"
import { useKpi } from "@/lib/use-kpi"
import { calcularIndicadoresPedidos } from "@/lib/relatorios-pedidos"
import { listarClientes } from "@/lib/actions/clientes"
import { actionObterUsuarios } from "@/lib/actions/usuarios"
import type { StatusPedido } from "@/types/domain"
import { PeriodoFiltro, periodoUltimos30Dias } from "@/components/relatorios/periodo-filtro"
import { IndicadorCard } from "@/components/relatorios/indicador-card"
import { Autocomplete } from "@/components/ui/autocomplete"
import { DataTable, type DataTableColumn, type DataTableSort } from "@/components/ui/data-table"

// TODO: confirmar contra types/domain.ts — lista inferida da conversa de modelagem,
// não conferida diretamente no enum StatusPedido real.
const STATUS_OPTIONS: { value: StatusPedido; label: string }[] = [
    { value: "CRIADO", label: "Criado" },
    { value: "RESERVADO", label: "Reservado" },
    { value: "EM_CONFERENCIA", label: "Em conferência" },
    { value: "CONFERIDO", label: "Conferido" },
    { value: "EXPEDIDO", label: "Expedido" },
    { value: "ENTREGUE", label: "Entregue" },
    { value: "CANCELADO", label: "Cancelado" },
]

const formatarMoeda = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

const formatarData = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("pt-BR") : "—"

const formatarHoras = (h: number | null) =>
    h === null ? "" : `${h.toFixed(1)}h`

export function PedidosRelatorio() {
    const currentUser = useCurrentUser()

    const [periodo, setPeriodo] = useState(periodoUltimos30Dias())
    const [status, setStatus] = useState<StatusPedido | "">("")
    const [clienteId, setClienteId] = useState<string | null>(null)
    const [vendedorId, setVendedorId] = useState<string | null>(null)
    const [visibleCount, setVisibleCount] = useState(20)
    const [sort, setSort] = useState<DataTableSort | null>(null)
    const [usuarios, setUsuarios] = useState<{ id: string; nome: string; empresaId: string; funcao: string }[]>([])

    useEffect(() => {
        actionObterUsuarios().then((resultado) => {
            if (resultado.ok && resultado.data) {
                setUsuarios(resultado.data)
            }
        })
    }, [])

    const periodoInvalido = periodo.fim !== "" && periodo.inicio !== "" && periodo.fim < periodo.inicio

    const [clientes, setClientes] = useState<{ id: string; nome: string; empresaId: string }[]>([])

    useEffect(() => {
        listarClientes().then((resultado) => {
            if (resultado.ok && resultado.data) {
                setClientes(resultado.data)
            }
        })
    }, [])

    const clienteOptions = useMemo(
        () =>
            clientes.filter((c) => c.empresaId === currentUser.empresaId).map((c) => ({
                value: c.id,
                label: c.nome,
            })),
        [clientes, currentUser.empresaId],
    )

    const vendedorOptions = useMemo(
        () =>
            usuarios.filter(
                (u) => u.empresaId === currentUser.empresaId && u.funcao === "VENDAS",
            ).map((u) => ({ value: u.id, label: u.nome })),
        [usuarios, currentUser.empresaId],
    )

    const resultado = useKpi(
        async () => {
            if (periodoInvalido) return null
            return await calcularIndicadoresPedidos(
                currentUser.empresaId,
                new Date(periodo.inicio),
                new Date(periodo.fim),
                {
                    status: status || undefined,
                    clienteId: clienteId || undefined,
                    vendedorId: vendedorId || undefined,
                },
            )
        },
        [currentUser.empresaId, periodo.inicio, periodo.fim, status, clienteId, vendedorId],
    )

    const tabelaOrdenada = useMemo(() => {
        if (!resultado.value) return []
        const tabela = [...resultado.value.tabela]
        if (!sort) return tabela
        tabela.sort((a, b) => {
            let cmp = 0
            switch (sort.columnId) {
                case "numero":
                    cmp = a.numero - b.numero
                    break
                case "cliente":
                    cmp = a.cliente.localeCompare(b.cliente)
                    break
                case "vendedor":
                    cmp = a.vendedor.localeCompare(b.vendedor)
                    break
                case "status":
                    cmp = a.status.localeCompare(b.status)
                    break
                case "dataCriacao":
                    cmp = new Date(a.dataCriacao).getTime() - new Date(b.dataCriacao).getTime()
                    break
            }
            return sort.direction === "asc" ? cmp : -cmp
        })
        return tabela
    }, [resultado.value, sort])

    function handleSortChange(columnId: string) {
        setSort((prev) => {
            if (!prev || prev.columnId !== columnId) return { columnId, direction: "asc" }
            if (prev.direction === "asc") return { columnId, direction: "desc" }
            return null
        })
    }

    const tempoMedioExpedicao = useMemo(() => {
        if (!resultado.value) return null
        const tempos = resultado.value.tabela
            .map((l) => l.tempoCriacaoExpedicao)
            .filter((t): t is number => t !== null)
        if (tempos.length === 0) return null
        return tempos.reduce((acc, t) => acc + t, 0) / tempos.length
    }, [resultado.value])

    const columns: DataTableColumn<(typeof tabelaOrdenada)[number]>[] = [
        { id: "numero", header: "Nº Pedido", cell: (r) => r.numero, sortable: true },
        { id: "cliente", header: "Cliente", cell: (r) => r.cliente, sortable: true },
        { id: "vendedor", header: "Vendedor", cell: (r) => r.vendedor, sortable: true, hideOnTablet: true },
        { id: "status", header: "Status", cell: (r) => r.status, sortable: true },
        { id: "dataCriacao", header: "Data de criação", cell: (r) => formatarData(r.dataCriacao), sortable: true },
        { id: "dataExpedicao", header: "Data de expedição", cell: (r) => formatarData(r.dataExpedicao), hideOnTablet: true },
        { id: "tempo", header: "Criação → Expedição", cell: (r) => formatarHoras(r.tempoCriacaoExpedicao) },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3">
                <PeriodoFiltro value={periodo} onChange={setPeriodo} />
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Status
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as StatusPedido | "")}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                    >
                        <option value="">Todos</option>
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
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
                <Autocomplete
                    label="Vendedor"
                    options={vendedorOptions}
                    value={vendedorId}
                    onChange={setVendedorId}
                    placeholder="Buscar vendedor…"
                    className="w-56"
                />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <IndicadorCard label="Total de pedidos" comparacao={resultado.value?.indicadores.totalPedidos} isLoading={resultado.status === "loading"} />
                <IndicadorCard label="Cancelados" comparacao={resultado.value?.indicadores.cancelados} isLoading={resultado.status === "loading"} />
                <IndicadorCard label="Expedidos" comparacao={resultado.value?.indicadores.expedidos} isLoading={resultado.status === "loading"} />
                <IndicadorCard label="Ticket médio" comparacao={resultado.value?.indicadores.ticketMedio} formatar={formatarMoeda} isLoading={resultado.status === "loading"} />
                <IndicadorCard
                    label="Tempo médio de expedição"
                    valorEstatico={tempoMedioExpedicao ?? 0}
                    formatar={(v) => (tempoMedioExpedicao === null ? "—" : `${v.toFixed(1)}h`)}
                    isLoading={resultado.status === "loading"}
                    tooltip="Calculado apenas sobre pedidos que chegaram a ser expedidos."
                />
            </div>

            <DataTable
                columns={columns}
                data={tabelaOrdenada.slice(0, visibleCount)}
                getRowId={(r) => String(r.numero)}
                isLoading={resultado.status === "loading"}
                emptyState="Nenhum dado encontrado para os filtros selecionados."
                hasMore={visibleCount < tabelaOrdenada.length}
                onLoadMore={() => setVisibleCount((c) => c + 20)}
                sort={sort}
                onSortChange={handleSortChange}
            />
        </div>
    )
}