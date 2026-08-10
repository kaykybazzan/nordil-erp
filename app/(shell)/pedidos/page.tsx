"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/lib/auth-context"
import { DataTable, type DataTableColumn, type DataTableSort } from "@/components/ui/data-table"
import { PedidoStatusBadge } from "@/components/status-badges"
import { Button } from "@/components/ui/button"
import { RowActionsMenu } from "@/components/ui/row-actions-menu"
import { CancelarPedidoDialog } from "@/components/pedidos/cancelar-pedido-dialog"
import { podeCancelarPedido, isPedidoAtrasado, formatTempoNoStatus } from "@/lib/pedidos"
import { usePedidosStore } from "@/lib/pedidos-store"
import type { Pedido, StatusPedido } from "@/types/domain"
import { useToast } from "@/components/ui/simple-toast"
import { listarClientes } from "@/lib/actions/clientes"
import { actionObterUsuarios } from "@/lib/actions/usuarios"

const PAGE_SIZE = 30

const STATUS_FILTROS: { value: StatusPedido; label: string }[] = [
  { value: "CRIADO", label: "Criado" },
  { value: "RESERVADO", label: "Reservado" },
  { value: "EM_SEPARACAO", label: "Em separação" },
  { value: "EM_CONFERENCIA", label: "Em conferência" },
  { value: "CONFERIDO", label: "Conferido" },
  { value: "EXPEDIDO", label: "Expedido" },
  { value: "ENTREGUE", label: "Entregue" },
  { value: "CANCELADO", label: "Cancelado" },
]

const DEFAULT_HIDDEN_STATUS: StatusPedido[] = ["ENTREGUE", "CANCELADO"]

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function PedidosPage() {
  const currentUser = useCurrentUser()
  const router = useRouter()
  const { showToast, Toaster } = useToast()
  const cancelarPedido = usePedidosStore((s) => s.cancelarPedido)
  const carregarPedidos = usePedidosStore((s) => s.carregarPedidos)
  const pedidosStore = usePedidosStore((s) => s.pedidos)

  const isVendedor = currentUser.role === "OPERADOR" && currentUser.funcao === "VENDAS"

  const [buscaInput, setBuscaInput] = useState("")
  const [busca, setBusca] = useState("")
  const [statusFiltro, setStatusFiltro] = useState<Set<StatusPedido>>(new Set())
  const [somenteAtrasados, setSomenteAtrasados] = useState(false)
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [vendedorFiltro, setVendedorFiltro] = useState<string>("")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosStore)
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState<Pedido | null>(null)
  const [sort, setSort] = useState<DataTableSort>({ columnId: "criadoEm", direction: "desc" })
  const [clientes, setClientes] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [carregandoDados, setCarregandoDados] = useState(false)
  const [erroCarregarDados, setErroCarregarDados] = useState<string | null>(null)

  // Carregar pedidos do backend na montagem
  useEffect(() => {
    carregarPedidos()
  }, [carregarPedidos])

  // Carregar clientes e usuários
  useEffect(() => {
    setCarregandoDados(true)
    setErroCarregarDados(null)
    Promise.all([listarClientes(), actionObterUsuarios()]).then(([clientesResult, usuariosResult]) => {
      if (clientesResult.ok && clientesResult.data) {
        setClientes(clientesResult.data)
      }
      if (usuariosResult.ok && usuariosResult.data) {
        setUsuarios(usuariosResult.data)
      }
      if (!clientesResult.ok || !usuariosResult.ok) {
        setErroCarregarDados("Erro ao carregar dados de clientes/usuários")
      }
      setCarregandoDados(false)
    })
  }, [])

  // Sincronizar estado local com store
  useEffect(() => {
    setPedidos(pedidosStore)
  }, [pedidosStore])

  // Debounce da busca (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusca(buscaInput)
      setVisibleCount(PAGE_SIZE)
    }, 300)
    return () => clearTimeout(timer)
  }, [buscaInput])

  const now = useMemo(() => new Date(), [])

  const clientesPorId = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of clientes) map.set(c.id, c.nome)
    return map
  }, [clientes])

  const vendedoresPorId = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of usuarios) map.set(u.id, u.nome)
    return map
  }, [usuarios])

  const base = useMemo(
    () => (isVendedor ? pedidos.filter((p) => p.vendedorId === currentUser.id) : pedidos),
    [pedidos, isVendedor, currentUser.id],
  )

  const filtrados = useMemo(() => {
    let result = base

    result = statusFiltro.size > 0
      ? result.filter((p) => statusFiltro.has(p.status))
      : result.filter((p) => !DEFAULT_HIDDEN_STATUS.includes(p.status))

    if (somenteAtrasados) result = result.filter((p) => isPedidoAtrasado(p, now))

    // Filtro por data de criação
    if (dataInicio || dataFim) {
      result = result.filter((p) => {
        const dataPedido = new Date(p.criadoEm).getTime()
        const inicio = dataInicio ? new Date(dataInicio).getTime() : 0
        const fim = dataFim ? new Date(dataFim).getTime() : Infinity
        return dataPedido >= inicio && dataPedido <= fim
      })
    }

    // Filtro por vendedor (só Admin/Supervisor)
    if (!isVendedor && vendedorFiltro) {
      result = result.filter((p) => p.vendedorId === vendedorFiltro)
    }

    const termo = busca.trim().toLowerCase()
    if (termo) {
      result = result.filter((p) => {
        const nomeCliente = clientesPorId.get(p.clienteId)?.toLowerCase() ?? ""
        return String(p.numero).includes(termo) || nomeCliente.includes(termo)
      })
    }

    const dir = sort.direction === "asc" ? 1 : -1
    return [...result].sort((a, b) => {
      switch (sort.columnId) {
        case "valor":
          return (a.valorTotal - b.valorTotal) * dir
        case "tempoStatus":
          return (
            (new Date(a.statusAlteradoEm).getTime() - new Date(b.statusAlteradoEm).getTime()) * dir
          )
        case "criadoEm":
        default:
          return (new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()) * dir
      }
    })
  }, [base, statusFiltro, somenteAtrasados, dataInicio, dataFim, vendedorFiltro, isVendedor, busca, clientesPorId, sort, now])

  const visiveis = filtrados.slice(0, visibleCount)
  const hasMore = filtrados.length > visibleCount

  function toggleStatusFiltro(status: StatusPedido) {
    setStatusFiltro((prev) => {
      const next = new Set(prev)
      next.has(status) ? next.delete(status) : next.add(status)
      return next
    })
    setVisibleCount(PAGE_SIZE)
  }

  function handleSortChange(columnId: string) {
    setSort((prev) =>
      prev.columnId === columnId
        ? { columnId, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { columnId, direction: "desc" },
    )
  }

  async function handleConfirmarCancelamento(pedidoId: string, motivo: string) {
    const resultado = await cancelarPedido(pedidoId, motivo)
    if (!resultado.ok) {
      showToast(resultado.error || "Erro ao cancelar pedido", "error")
      return
    }

    setPedidos((prev) => prev.map((p) => (p.id === pedidoId ? resultado.data! : p)))
    setPedidoParaCancelar(null)
    showToast("Pedido cancelado.", "success")
  }

  const columns: DataTableColumn<Pedido>[] = [
    { id: "numero", header: "Número", cell: (p) => <span className="font-medium">#{p.numero}</span> },
    { id: "cliente", header: "Cliente", cell: (p) => clientesPorId.get(p.clienteId) ?? "—" },
    ...(!isVendedor
      ? [
          {
            id: "vendedor",
            header: "Vendedor",
            cell: (p: Pedido) => vendedoresPorId.get(p.vendedorId) ?? "—",
            hideOnTablet: true,
          } as DataTableColumn<Pedido>,
        ]
      : []),
    { id: "status", header: "Status", cell: (p) => <PedidoStatusBadge status={p.status} /> },
    { id: "valor", header: "Valor total", cell: (p) => formatMoeda(p.valorTotal), sortable: true },
    { id: "criadoEm", header: "Criado em", cell: (p) => formatData(p.criadoEm), hideOnTablet: true, sortable: true },
    {
      id: "tempoStatus",
      header: "Tempo no status atual",
      sortable: true,
      cell: (p) => (
        <span className={isPedidoAtrasado(p, now) ? "font-medium text-destructive" : ""}>
          {formatTempoNoStatus(p, now)}
        </span>
      ),
    },
    {
      id: "acoes",
      header: "",
      cell: (p) =>
        podeCancelarPedido(p, currentUser) ? (
          <RowActionsMenu
            actions={[
              {
                label: "Cancelar pedido",
                destructive: true,
                onSelect: () => setPedidoParaCancelar(p),
              },
            ]}
          />
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-4 p-6">
      {erroCarregarDados && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {erroCarregarDados}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{isVendedor ? "Meus pedidos" : "Pedidos"}</h1>
        {isVendedor && (
          <Button size="sm" onClick={() => router.push("/pedidos/novo")}>
            Novo pedido
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={buscaInput}
          onChange={(e) => setBuscaInput(e.target.value)}
          placeholder="Buscar por número ou cliente…"
          className="h-8 w-64 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        <button
          type="button"
          onClick={() => {
            setSomenteAtrasados((v) => !v)
            setVisibleCount(PAGE_SIZE)
          }}
          className={
            "h-8 rounded-full border px-3 text-xs font-medium transition-colors " +
            (somenteAtrasados
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border bg-background text-muted-foreground hover:text-foreground")
          }
        >
          Atrasados
        </button>

        {/* Filtro por data de criação */}
        <input
          type="date"
          value={dataInicio}
          onChange={(e) => {
            setDataInicio(e.target.value)
            setVisibleCount(PAGE_SIZE)
          }}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <span className="text-sm text-muted-foreground">até</span>
        <input
          type="date"
          value={dataFim}
          onChange={(e) => {
            setDataFim(e.target.value)
            setVisibleCount(PAGE_SIZE)
          }}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        {/* Filtro por vendedor (só Admin/Supervisor) */}
        {!isVendedor && (
          <select
            value={vendedorFiltro}
            onChange={(e) => {
              setVendedorFiltro(e.target.value)
              setVisibleCount(PAGE_SIZE)
            }}
            className="h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Todos vendedores</option>
            {usuarios
              .filter((u) => u.role === "OPERADOR" && u.funcao === "VENDAS")
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
          </select>
        )}

        <div className="flex flex-wrap gap-1">
          {STATUS_FILTROS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleStatusFiltro(opt.value)}
              className={
                "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors " +
                (statusFiltro.has(opt.value)
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={visiveis}
        getRowId={(p) => p.id}
        onRowClick={(p) => router.push(`/pedidos/${p.id}`)}
        emptyState={
          busca || statusFiltro.size > 0 || somenteAtrasados
            ? "Nenhum pedido encontrado com esse filtro."
            : "Nenhum pedido cadastrado ainda."
        }
        hasMore={hasMore}
        onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)}
        sort={sort}
        onSortChange={handleSortChange}
      />

      <CancelarPedidoDialog
        pedido={pedidoParaCancelar}
        onOpenChange={(open) => {
          if (!open) setPedidoParaCancelar(null)
        }}
        onConfirm={handleConfirmarCancelamento}
      />

      <Toaster />
    </div>
  )
}