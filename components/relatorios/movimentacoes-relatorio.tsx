"use client"

import { useMemo, useState } from "react"
import { useCurrentUser } from "@/lib/auth-context"
import { useKpi } from "@/lib/use-kpi"
import { actionCalcularIndicadoresMovimentacoes } from "@/lib/actions/estoque"
import { MOCK_PRODUTOS } from "@/lib/mock-produtos"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"
import type { TipoEstoqueMovimentacao } from "@/types/domain"
import { PeriodoFiltro, periodoUltimos30Dias } from "@/components/relatorios/periodo-filtro"
import { IndicadorCard } from "@/components/relatorios/indicador-card"
import { Autocomplete } from "@/components/ui/autocomplete"
import { DataTable, type DataTableColumn, type DataTableSort } from "@/components/ui/data-table"

const TIPO_OPTIONS: { value: TipoEstoqueMovimentacao; label: string }[] = [
    { value: "RESERVA", label: "Reserva" },
    { value: "LIBERACAO_RESERVA", label: "Liberação de reserva" },
    { value: "SAIDA", label: "Saída" },
]

const formatarDataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR")

export function MovimentacoesRelatorio() {
    const currentUser = useCurrentUser()

    const [periodo, setPeriodo] = useState(periodoUltimos30Dias())
    const [tipo, setTipo] = useState<TipoEstoqueMovimentacao | "">("")
    const [produtoId, setProdutoId] = useState<string | null>(null)
    const [operadorId, setOperadorId] = useState<string | null>(null)
    const [visibleCount, setVisibleCount] = useState(20)
    const [sort, setSort] = useState<DataTableSort | null>(null)

    const periodoInvalido = periodo.fim !== "" && periodo.inicio !== "" && periodo.fim < periodo.inicio

    const produtoOptions = useMemo(
        () =>
            MOCK_PRODUTOS.filter((p) => p.empresaId === currentUser.empresaId).map((p) => ({
                value: p.id,
                label: p.nome,
                description: p.skuInterno,
            })),
        [currentUser.empresaId],
    )

    const operadorOptions = useMemo(
        () =>
            MOCK_USUARIOS.filter((u) => u.empresaId === currentUser.empresaId).map((u) => ({
                value: u.id,
                label: u.nome,
            })),
        [currentUser.empresaId],
    )

    const resultado = useKpi(
        async () => {
            if (periodoInvalido) return null
            const result = await actionCalcularIndicadoresMovimentacoes({
                dataInicio: periodo.inicio,
                dataFim: periodo.fim,
                tipo: tipo || undefined,
                produtoId: produtoId || undefined,
                operadorId: operadorId || undefined,
            })
            if (!result.ok || !result.data) return null
            return result.data
        },
        [currentUser.empresaId, periodo.inicio, periodo.fim, tipo, produtoId, operadorId],
    )

    const tabelaOrdenada = useMemo(() => {
        if (!resultado.value) return []
        const tabela = [...resultado.value.tabela]
        if (!sort) return tabela
        tabela.sort((a, b) => {
            let cmp = 0
            switch (sort.columnId) {
                case "dataHora": cmp = new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime(); break
                case "produto": cmp = a.produto.localeCompare(b.produto); break
                case "tipo": cmp = a.tipo.localeCompare(b.tipo); break
                case "quantidade": cmp = a.quantidade - b.quantidade; break
                case "operador": cmp = a.operador.localeCompare(b.operador); break
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
        { id: "dataHora", header: "Data/hora", cell: (r) => formatarDataHora(r.dataHora), sortable: true },
        { id: "produto", header: "Produto", cell: (r) => r.produto, sortable: true },
        { id: "tipo", header: "Tipo", cell: (r) => TIPO_OPTIONS.find((t) => t.value === r.tipo)?.label ?? r.tipo, sortable: true },
        { id: "quantidade", header: "Quantidade", cell: (r) => r.quantidade, sortable: true },
        { id: "operador", header: "Operador", cell: (r) => r.operador, sortable: true, hideOnTablet: true },
        {
            id: "origem",
            header: "Origem",
            cell: (r) => (
                <span title="Referência ao evento que gerou esta movimentação (entrada, pedido, ajuste de inventário).">
                    {r.origem}
                </span>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3">
                <PeriodoFiltro value={periodo} onChange={setPeriodo} />
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Tipo
                    <select
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value as TipoEstoqueMovimentacao | "")}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                    >
                        <option value="">Todos</option>
                        {TIPO_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </label>
                <Autocomplete label="Produto" options={produtoOptions} value={produtoId} onChange={setProdutoId} placeholder="Buscar produto…" className="w-56" />
                <Autocomplete label="Operador" options={operadorOptions} value={operadorId} onChange={setOperadorId} placeholder="Buscar operador…" className="w-56" />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <IndicadorCard label="Reservas" comparacao={resultado.value?.indicadores.reservas} isLoading={resultado.status === "loading"} />
                <IndicadorCard label="Liberações" comparacao={resultado.value?.indicadores.liberacoes} isLoading={resultado.status === "loading"} />
            </div>

            <DataTable
                columns={columns}
                data={tabelaOrdenada.slice(0, visibleCount)}
                getRowId={(r) => `${r.dataHora}-${r.produto}-${r.operador}-${r.quantidade}`}
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