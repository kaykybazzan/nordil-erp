"use client"

import { useMemo, useState } from "react"
import { useCurrentUser } from "@/lib/auth-context"
import { useKpi } from "@/lib/use-kpi"
import { calcularIndicadoresEstoque } from "@/lib/relatorios-estoque"
import { MOCK_PRODUTOS } from "@/lib/mock-produtos"
import { obterCategoriaProduto } from "@/lib/mock-inventario"
import { IndicadorCard } from "@/components/relatorios/indicador-card"
import { Autocomplete } from "@/components/ui/autocomplete"
import { DataTable, type DataTableColumn, type DataTableSort } from "@/components/ui/data-table"

const formatarMoeda = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

export function EstoqueRelatorio() {
    const currentUser = useCurrentUser()

    const [categoria, setCategoria] = useState("")
    const [produtoId, setProdutoId] = useState<string | null>(null)
    const [visibleCount, setVisibleCount] = useState(20)
    const [sort, setSort] = useState<DataTableSort | null>(null)

    const produtosEmpresa = useMemo(
        () => MOCK_PRODUTOS.filter((p) => p.empresaId === currentUser.empresaId),
        [currentUser.empresaId],
    )

    // Categorias derivadas dinamicamente — lista canônica de categorias não auditada ainda.
    const categoriaOptions = useMemo(() => {
        const unicas = new Set(produtosEmpresa.map((p) => obterCategoriaProduto(p.id)))
        return Array.from(unicas).map((c) => ({ value: c, label: c }))
    }, [produtosEmpresa])

    const produtoOptions = useMemo(
        () => produtosEmpresa.map((p) => ({ value: p.id, label: p.nome, description: p.skuInterno })),
        [produtosEmpresa],
    )

    const resultado = useKpi(
        () =>
            calcularIndicadoresEstoque(currentUser.empresaId, {
                categoriaId: categoria || undefined,
                produtoId: produtoId || undefined,
            }),
        [currentUser.empresaId, categoria, produtoId],
    )

    const tabelaOrdenada = useMemo(() => {
        if (!resultado.value) return []
        const tabela = [...resultado.value.tabela]
        if (!sort) return tabela
        tabela.sort((a, b) => {
            let cmp = 0
            switch (sort.columnId) {
                case "produto": cmp = a.produto.localeCompare(b.produto); break
                case "categoria": cmp = a.categoria.localeCompare(b.categoria); break
                case "saldoAtual": cmp = a.saldoAtual - b.saldoAtual; break
                case "reservado": cmp = a.reservado - b.reservado; break
                case "disponivel": cmp = a.disponivel - b.disponivel; break
                case "status": cmp = a.status.localeCompare(b.status); break
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
        { id: "produto", header: "Produto", cell: (r) => r.produto, sortable: true },
        { id: "sku", header: "SKU", cell: (r) => r.sku, hideOnTablet: true },
        { id: "categoria", header: "Categoria", cell: (r) => r.categoria, sortable: true },
        { id: "saldoAtual", header: "Estoque atual", cell: (r) => r.saldoAtual, sortable: true },
        { id: "reservado", header: "Reservado", cell: (r) => r.reservado, sortable: true },
        { id: "disponivel", header: "Disponível", cell: (r) => r.disponivel, sortable: true },
        { id: "status", header: "Status", cell: (r) => r.status, sortable: true },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Categoria
                    <select
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                    >
                        <option value="">Todas</option>
                        {categoriaOptions.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </label>
                <Autocomplete
                    label="Produto"
                    options={produtoOptions}
                    value={produtoId}
                    onChange={setProdutoId}
                    placeholder="Buscar produto…"
                    className="w-64"
                />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <IndicadorCard label="Valor total em estoque" valorEstatico={resultado.value?.indicadores.valorTotalEstoque} formatar={formatarMoeda} isLoading={resultado.status === "loading"} />
                <IndicadorCard label="Quantidade total de itens" valorEstatico={resultado.value?.indicadores.quantidadeTotalItens} isLoading={resultado.status === "loading"} />
                <IndicadorCard label="Produtos abaixo do mínimo" valorEstatico={resultado.value?.indicadores.produtosAbaixoMinimo} isLoading={resultado.status === "loading"} />
                <IndicadorCard label="Produtos sem movimentação" valorEstatico={resultado.value?.indicadores.produtosSemMovimentacao} isLoading={resultado.status === "loading"} />
            </div>

            <DataTable
                columns={columns}
                data={tabelaOrdenada.slice(0, visibleCount)}
                getRowId={(r) => r.sku}
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