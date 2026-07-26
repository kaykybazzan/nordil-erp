"use client"

import { useMemo, useState } from "react"
import { useCurrentUser } from "@/lib/auth-context"
import { useKpi } from "@/lib/use-kpi"
import { calcularIndicadoresOperacional } from "@/lib/relatorios-operacional"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"
import { PeriodoFiltro, periodoUltimos30Dias } from "@/components/relatorios/periodo-filtro"
import { IndicadorCard } from "@/components/relatorios/indicador-card"
import { Autocomplete } from "@/components/ui/autocomplete"
import { DataTable, type DataTableColumn, type DataTableSort } from "@/components/ui/data-table"

const formatarHoras = (h: number | null) => (h === null ? "" : `${h.toFixed(1)}h`)

export function OperacionalRelatorio() {
    const currentUser = useCurrentUser()

    const [periodo, setPeriodo] = useState(periodoUltimos30Dias())
    const [operadorId, setOperadorId] = useState<string | null>(null)
    const [visibleCount, setVisibleCount] = useState(20)
    const [sort, setSort] = useState<DataTableSort | null>(null)

    const periodoInvalido = periodo.fim !== "" && periodo.inicio !== "" && periodo.fim < periodo.inicio

    const operadorOptions = useMemo(
        () =>
            MOCK_USUARIOS.filter((u) => u.empresaId === currentUser.empresaId).map((u) => ({
                value: u.id,
                label: u.nome,
            })),
        [currentUser.empresaId],
    )

    const resultado = useKpi(
        () => {
            if (periodoInvalido) return null
            return calcularIndicadoresOperacional(
                currentUser.empresaId,
                new Date(periodo.inicio),
                new Date(periodo.fim),
                { operadorId: operadorId || undefined },
            )
        },
        [currentUser.empresaId, periodo.inicio, periodo.fim, operadorId],
    )

    const tabelaOrdenada = useMemo(() => {
        if (!resultado.value) return []
        const tabela = [...resultado.value.tabela]
        if (!sort) return tabela
        tabela.sort((a, b) => {
            let cmp = 0
            switch (sort.columnId) {
                case "operador": cmp = a.operador.localeCompare(b.operador); break
                case "pedidosSeparados": cmp = a.pedidosSeparados - b.pedidosSeparados; break
                case "pedidosConferidos": cmp = a.pedidosConferidos - b.pedidosConferidos; break
                case "pedidosExpedidos": cmp = a.pedidosExpedidos - b.pedidosExpedidos; break
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

    const columns: DataTableColumn<(typeof tabelaOrdenada)[number]>[] = [
        { id: "operador", header: "Operador", cell: (r) => r.operador, sortable: true },
        { id: "pedidosSeparados", header: "Pedidos separados", cell: (r) => r.pedidosSeparados, sortable: true },
        { id: "pedidosConferidos", header: "Pedidos conferidos", cell: (r) => r.pedidosConferidos, sortable: true },
        { id: "pedidosExpedidos", header: "Pedidos expedidos", cell: (r) => r.pedidosExpedidos, sortable: true },
        { id: "tempoMedioSeparacao", header: "Tempo médio separação", cell: (r) => formatarHoras(r.tempoMedioSeparacao) },
        { id: "tempoMedioConferencia", header: "Tempo médio conferência", cell: (r) => formatarHoras(r.tempoMedioConferencia), hideOnTablet: true },
        { id: "tempoMedioExpedicao", header: "Tempo médio expedição", cell: (r) => formatarHoras(r.tempoMedioExpedicao), hideOnTablet: true },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3">
                <PeriodoFiltro value={periodo} onChange={setPeriodo} />
                <Autocomplete label="Operador" options={operadorOptions} value={operadorId} onChange={setOperadorId} placeholder="Buscar operador…" className="w-56" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <IndicadorCard label="Tempo médio de separação" comparacao={resultado.value?.indicadores.tempoMedioSeparacao} formatar={(v) => `${v.toFixed(1)}h`} isLoading={resultado.status === "loading"} />
                <IndicadorCard label="Tempo médio de conferência" comparacao={resultado.value?.indicadores.tempoMedioConferencia} formatar={(v) => `${v.toFixed(1)}h`} isLoading={resultado.status === "loading"} />
                <IndicadorCard label="Tempo médio de expedição" comparacao={resultado.value?.indicadores.tempoMedioExpedicao} formatar={(v) => `${v.toFixed(1)}h`} isLoading={resultado.status === "loading"} />
            </div>

            <DataTable
                columns={columns}
                data={tabelaOrdenada.slice(0, visibleCount)}
                getRowId={(r) => r.operador}
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