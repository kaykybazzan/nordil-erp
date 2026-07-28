"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/lib/auth-context"
import { useInventarioContagemStore } from "@/lib/inventario-contagem-store"
import { podeAbrirInventario } from "@/lib/policies"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"
import { MOCK_PRODUTOS } from "@/lib/mock-produtos"
import { obterCategoriaProduto, CATEGORIAS } from "@/lib/mock-inventario"
import type { StatusInventarioContagem, TipoEscopoInventario, InventarioContagem } from "@/types/domain"
import { DataTable, type DataTableColumn, type DataTableSort } from "@/components/ui/data-table"
import { Modal } from "@/components/ui/modal"
import { Autocomplete } from "@/components/ui/autocomplete"
import { cn } from "@/lib/utils"

const STATUS_OPTIONS: { value: StatusInventarioContagem | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "FINALIZADO", label: "Finalizado" },
]

const TIPO_ESCOPO_OPTIONS: { value: TipoEscopoInventario; label: string }[] = [
  { value: "CORREDOR", label: "Corredor" },
  { value: "CATEGORIA", label: "Categoria" },
  { value: "LISTA_MANUAL", label: "Lista manual" },
  { value: "ESTOQUE_BAIXO", label: "Estoque baixo" },
  { value: "FORNECEDOR", label: "Fornecedor" },
  { value: "TODOS_PRODUTOS", label: "Todos os produtos" },
]

const CORREDORES = Array.from(new Set(MOCK_PRODUTOS.map((p) => p.corredor).filter((c): c is string => !!c))).sort()

const FORNECEDORES = Array.from(new Set(MOCK_PRODUTOS.map((p) => p.marca))).sort()

type InventarioComDados = InventarioContagem & {
  abertoPorNome: string
  responsavelNome: string
  itensContados: number
  itensTotal: number
  divergenciasAplicadas: number
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

export default function EstoqueInventarioPage() {
  const router = useRouter()
  const currentUser = useCurrentUser()
  const inventarioStore = useInventarioContagemStore()

  const [busca, setBusca] = useState("")
  const [status, setStatus] = useState<StatusInventarioContagem | "">("")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [sort, setSort] = useState<DataTableSort | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [tipoEscopo, setTipoEscopo] = useState<TipoEscopoInventario>("CORREDOR")
  const [recorte, setRecorte] = useState<string | null>(null)
  const [listaManualProdutoIds, setListaManualProdutoIds] = useState<string[]>([])
  const [responsavelContagemId, setResponsavelContagemId] = useState<string>("")
  const [observacao, setObservacao] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const podeAbrir = podeAbrirInventario(currentUser)

  const estoquistas = MOCK_USUARIOS.filter((u) => u.funcao === "ESTOQUE" && u.status === "ativo")

  const inventariosComDados = useMemo(() => {
    return inventarioStore.inventarios.map((inv) => {
      const abertoPor = MOCK_USUARIOS.find((u) => u.id === inv.abertoPorId)
      const responsavel = MOCK_USUARIOS.find((u) => u.id === inv.responsavelContagemId)
      const itensContados = inv.itens.filter((i) => i.quantidadeContada !== null).length
      const divergenciasAplicadas = inv.itens.filter((i) => i.status === "AJUSTADO").length

      return {
        ...inv,
        abertoPorNome: abertoPor?.nome ?? inv.abertoPorId,
        responsavelNome: responsavel?.nome ?? inv.responsavelContagemId,
        itensContados,
        itensTotal: inv.itens.length,
        divergenciasAplicadas,
      }
    })
  }, [inventarioStore.inventarios])

  const filtrados = useMemo(() => {
    return inventariosComDados.filter((inv) => {
      // Busca por descrição de escopo
      if (busca) {
        const q = busca.toLowerCase()
        if (!inv.descricaoEscopo.toLowerCase().includes(q)) return false
      }

      // Filtro por status
      if (status && inv.status !== status) return false

      // Filtro por intervalo de datas
      if (dataInicio) {
        const inicio = new Date(dataInicio).getTime()
        if (new Date(inv.abertoEm).getTime() < inicio) return false
      }
      if (dataFim) {
        const fim = new Date(dataFim).getTime()
        if (new Date(inv.abertoEm).getTime() > fim) return false
      }

      return true
    })
  }, [inventariosComDados, busca, status, dataInicio, dataFim])

  const tabelaOrdenada = useMemo(() => {
    if (!sort) return filtrados

    return [...filtrados].sort((a, b) => {
      let comparison = 0
      if (sort.columnId === "descricaoEscopo") {
        comparison = a.descricaoEscopo.localeCompare(b.descricaoEscopo)
      } else if (sort.columnId === "abertoEm") {
        comparison = new Date(a.abertoEm).getTime() - new Date(b.abertoEm).getTime()
      } else if (sort.columnId === "status") {
        comparison = a.status.localeCompare(b.status)
      } else if (sort.columnId === "itensContados") {
        comparison = a.itensContados - b.itensContados
      } else if (sort.columnId === "divergenciasAplicadas") {
        comparison = a.divergenciasAplicadas - b.divergenciasAplicadas
      } else if (sort.columnId === "abertoPorNome") {
        comparison = a.abertoPorNome.localeCompare(b.abertoPorNome)
      } else if (sort.columnId === "responsavelNome") {
        comparison = a.responsavelNome.localeCompare(b.responsavelNome)
      }

      return sort.direction === "asc" ? comparison : -comparison
    })
  }, [filtrados, sort])

  function handleSortChange(columnId: string) {
    setSort((prev) => {
      if (!prev || prev.columnId !== columnId) return { columnId, direction: "asc" }
      if (prev.direction === "asc") return { columnId, direction: "desc" }
      return null
    })
  }

  function handleRowClick(row: InventarioComDados) {
    router.push(`/estoque/inventario/${row.id}`)
  }

  function handleAbrirModal() {
    setModalAberto(true)
    setTipoEscopo("CORREDOR")
    setRecorte(null)
    setListaManualProdutoIds([])
    setResponsavelContagemId("")
    setObservacao("")
    setFormError(null)
  }

  function handleFecharModal() {
    setModalAberto(false)
  }

  async function handleCriarInventario() {
    if (!responsavelContagemId) {
      setFormError("Selecione o responsável pela contagem.")
      return
    }

    if (tipoEscopo === "CORREDOR" && !recorte) {
      setFormError("Selecione o corredor.")
      return
    }

    if (tipoEscopo === "CATEGORIA" && !recorte) {
      setFormError("Selecione a categoria.")
      return
    }

    if (tipoEscopo === "FORNECEDOR" && !recorte) {
      setFormError("Selecione o fornecedor.")
      return
    }

    if (tipoEscopo === "LISTA_MANUAL" && listaManualProdutoIds.length === 0) {
      setFormError("Selecione ao menos um produto para a lista manual.")
      return
    }

    setSubmitting(true)
    setFormError(null)

    const resultado = await inventarioStore.abrirInventario({
      tipoEscopo,
      recorte,
      listaManualProdutoIds: tipoEscopo === "LISTA_MANUAL" ? listaManualProdutoIds : undefined,
      responsavelContagemId,
      observacao: observacao || undefined,
      usuario: currentUser,
    })

    setSubmitting(false)

    if (!resultado.sucesso) {
      setFormError(resultado.erro)
      return
    }

    handleFecharModal()
    router.push(`/estoque/inventario/${resultado.inventario.id}`)
  }

  function getRecorteOptions() {
    switch (tipoEscopo) {
      case "CORREDOR":
        return CORREDORES.map((c) => ({ value: c, label: c }))
      case "CATEGORIA":
        return CATEGORIAS.map((c) => ({ value: c, label: c }))
      case "FORNECEDOR":
        return FORNECEDORES.map((f) => ({ value: f, label: f }))
      default:
        return []
    }
  }

  const columns: DataTableColumn<InventarioComDados>[] = [
    { id: "descricaoEscopo", header: "Escopo", cell: (r) => r.descricaoEscopo, sortable: true },
    { id: "abertoEm", header: "Data de abertura", cell: (r) => formatarData(r.abertoEm), sortable: true },
    { id: "status", header: "Status", cell: (r) => r.status, sortable: true },
    {
      id: "itensContados",
      header: "Itens contados",
      cell: (r) => `${r.itensContados}/${r.itensTotal}`,
      sortable: true,
    },
    { id: "divergenciasAplicadas", header: "Divergências aplicadas", cell: (r) => r.divergenciasAplicadas, sortable: true },
    { id: "abertoPorNome", header: "Aberto por", cell: (r) => r.abertoPorNome, sortable: true },
    { id: "responsavelNome", header: "Responsável", cell: (r) => r.responsavelNome, sortable: true },
  ]

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Inventário</h1>
        {podeAbrir && (
          <button
            type="button"
            onClick={handleAbrirModal}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Novo Inventário
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Buscar por escopo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>

        <div className="w-[180px]">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusInventarioContagem | "")}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-[150px]">
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>

        <div className="w-[150px]">
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={tabelaOrdenada}
        getRowId={(r) => r.id}
        onRowClick={handleRowClick}
        emptyState="Nenhum inventário encontrado para os filtros selecionados."
        sort={sort}
        onSortChange={handleSortChange}
      />

      <Modal open={modalAberto} onOpenChange={handleFecharModal} title="Novo Inventário">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Tipo de escopo</label>
            <select
              value={tipoEscopo}
              onChange={(e) => {
                setTipoEscopo(e.target.value as TipoEscopoInventario)
                setRecorte(null)
                setListaManualProdutoIds([])
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {TIPO_ESCOPO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {tipoEscopo === "CORREDOR" && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Corredor</label>
              <Autocomplete
                options={getRecorteOptions()}
                value={recorte}
                onChange={setRecorte}
                placeholder="Selecione o corredor"
              />
            </div>
          )}

          {tipoEscopo === "CATEGORIA" && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Categoria</label>
              <Autocomplete
                options={getRecorteOptions()}
                value={recorte}
                onChange={setRecorte}
                placeholder="Selecione a categoria"
              />
            </div>
          )}

          {tipoEscopo === "FORNECEDOR" && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Fornecedor</label>
              <Autocomplete
                options={getRecorteOptions()}
                value={recorte}
                onChange={setRecorte}
                placeholder="Selecione o fornecedor"
              />
            </div>
          )}

          {tipoEscopo === "LISTA_MANUAL" && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Produtos</label>
              <Autocomplete
                options={MOCK_PRODUTOS.filter((p) => p.status === "ativo").map((p) => ({ value: p.id, label: `${p.skuInterno} - ${p.nome}` }))}
                value={null}
                onChange={(value) => {
                  if (value && !listaManualProdutoIds.includes(value)) {
                    setListaManualProdutoIds([...listaManualProdutoIds, value])
                  }
                }}
                placeholder="Adicionar produto"
              />
              {listaManualProdutoIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {listaManualProdutoIds.map((id) => {
                    const produto = MOCK_PRODUTOS.find((p) => p.id === id)
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm"
                      >
                        <span>{produto?.nome ?? id}</span>
                        <button
                          type="button"
                          onClick={() => setListaManualProdutoIds(listaManualProdutoIds.filter((i) => i !== id))}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Responsável pela contagem</label>
            <select
              value={responsavelContagemId}
              onChange={(e) => setResponsavelContagemId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <option value="">Selecione...</option>
              {estoquistas.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Observação (opcional)</label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observações sobre este inventário..."
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
            />
          </div>

          {formError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleFecharModal}
              disabled={submitting}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCriarInventario}
              disabled={submitting}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              {submitting ? "Criando..." : "Criar Inventário"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

