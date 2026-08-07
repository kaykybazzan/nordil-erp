"use client"

import { useEffect, useMemo, useState } from "react"
import { onlyDigits } from "@/lib/utils/cliente-utils"
import { DataTable, type DataTableColumn, type DataTableSort } from "@/components/ui/data-table"
import { ClienteStatusBadge } from "@/components/status-badges"
import { Button } from "@/components/ui/button"
import { ClienteDrawer, type SaveResult } from "@/components/clientes/cliente-drawer"
import { useToast } from "@/components/ui/simple-toast"
import type { Cliente } from "@/types/domain"
import { useClientesStore } from "@/lib/clientes-store"

const PAGE_SIZE = 30

export default function ClientesPage() {
  const { showToast, Toaster } = useToast()
  const clientesStore = useClientesStore()
  const clientes = clientesStore.clientes
  const loading = clientesStore.loading
  const carregarClientes = clientesStore.carregarClientes
  const criarCliente = clientesStore.criarCliente
  const atualizarCliente = clientesStore.atualizarCliente
  const [buscaInput, setBuscaInput] = useState("")
  const [busca, setBusca] = useState("")
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "ativo" | "bloqueado">("todos")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [drawerAberto, setDrawerAberto] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [sort, setSort] = useState<DataTableSort>({ columnId: "nome", direction: "asc" })

  useEffect(() => {
    carregarClientes()
  }, [carregarClientes])

  useEffect(() => {
    const timer = setTimeout(() => {
      setBusca(buscaInput)
      setVisibleCount(PAGE_SIZE)
    }, 300)
    return () => clearTimeout(timer)
  }, [buscaInput])

  const filtrados = useMemo(() => {
    let result = clientes

    if (statusFiltro !== "todos") result = result.filter((c) => c.status === statusFiltro)

    const termo = busca.trim().toLowerCase()
    if (termo) {
      const termoDigitos = termo.replace(/\D/g, "")
      result = result.filter(
        (c) =>
          c.nome.toLowerCase().includes(termo) ||
          (termoDigitos && c.documento.replace(/\D/g, "").includes(termoDigitos)),
      )
    }

    const dir = sort.direction === "asc" ? 1 : -1
    return [...result].sort((a, b) =>
      sort.columnId === "dataCadastro"
        ? (new Date(a.dataCadastro).getTime() - new Date(b.dataCadastro).getTime()) * dir
        : a.nome.localeCompare(b.nome) * dir,
    )
  }, [clientes, statusFiltro, busca, sort])

  const visiveis = filtrados.slice(0, visibleCount)
  const hasMore = filtrados.length > visibleCount

  function handleSortChange(columnId: string) {
    setSort((prev) =>
      prev.columnId === columnId
        ? { columnId, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { columnId, direction: "asc" },
    )
  }

  async function handleSalvarCliente(cliente: Cliente): Promise<SaveResult> {
    const resultado = cliente.id
      ? await atualizarCliente(cliente.id, cliente)
      : await criarCliente(cliente)

    if (resultado.ok) {
      showToast("Cliente salvo.", "success")
      return { ok: true }
    } else {
      showToast(resultado.error || "Erro ao salvar cliente", "error")
      return { ok: false, error: resultado.error }
    }
  }

  const columns: DataTableColumn<Cliente>[] = [
    { id: "nome", header: "Nome / razão social", cell: (c) => c.nome },
    { id: "documento", header: "Documento", cell: (c) => c.documento },
    { id: "status", header: "Status", cell: (c) => <ClienteStatusBadge status={c.status} /> },
    {
      id: "dataCadastro",
      header: "Data de cadastro",
      cell: (c) => new Date(c.dataCadastro).toLocaleDateString("pt-BR"),
      hideOnTablet: true,
      sortable: true,
    },
  ]

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Clientes</h1>
        <Button
          size="sm"
          onClick={() => {
            setClienteSelecionado(null)
            setDrawerAberto(true)
          }}
        >
          Novo cliente
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={buscaInput}
          onChange={(e) => setBuscaInput(e.target.value)}
          placeholder="Buscar por nome ou documento…"
          className="h-8 w-64 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        <select
          value={statusFiltro}
          onChange={(e) => {
            setStatusFiltro(e.target.value as typeof statusFiltro)
            setVisibleCount(PAGE_SIZE)
          }}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="todos">Todos</option>
          <option value="ativo">Ativo</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={visiveis}
        getRowId={(c) => c.id}
        onRowClick={(c) => {
          setClienteSelecionado(c)
          setDrawerAberto(true)
        }}
        emptyState={
          busca || statusFiltro !== "todos"
            ? "Nenhum cliente encontrado com esse filtro."
            : "Nenhum cliente cadastrado ainda."
        }
        hasMore={hasMore}
        onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)}
        sort={sort}
        onSortChange={handleSortChange}
      />

      <ClienteDrawer
        open={drawerAberto}
        cliente={clienteSelecionado}
        onOpenChange={setDrawerAberto}
        onSave={handleSalvarCliente}
      />

      <Toaster />
    </div>
  )
}