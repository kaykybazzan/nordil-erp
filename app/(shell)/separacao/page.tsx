"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/lib/auth-context"
import { actionListarFilaSeparacao, actionForcarLiberacaoLock } from "@/lib/actions/separacao"
import { actionObterUsuarios } from "@/lib/actions/usuarios"
import { listarClientes } from "@/lib/actions/clientes"
import type { Pedido, StatusPedido } from "@/types/domain"
import { DataTable, type DataTableColumn, type DataTableSort } from "@/components/ui/data-table"
import { Modal } from "@/components/ui/modal"
import { cn } from "@/lib/utils"

const STATUS_OPTIONS: { value: StatusPedido | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "RESERVADO", label: "Pendente" },
  { value: "EM_SEPARACAO", label: "Em separação" },
]

type PedidoComDados = Pedido & {
  clienteNome: string
  separadorNome?: string
  itensTotal: number
  tempoNaFila: string
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

const formatarTempoNaFila = (iso: string) => {
  const agora = new Date()
  const data = new Date(iso)
  const diffMs = agora.getTime() - data.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHoras = Math.floor(diffMin / 60)

  if (diffHoras > 0) {
    return `${diffHoras}h ${diffMin % 60}min`
  }
  return `${diffMin}min`
}

export default function SeparacaoPage() {
  const router = useRouter()
  const currentUser = useCurrentUser()

  const [pedidos, setPedidos] = useState<PedidoComDados[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [status, setStatus] = useState<StatusPedido | "">("")
  const [sort, setSort] = useState<DataTableSort | null>(null)
  const [modalForcarLiberacaoAberto, setModalForcarLiberacaoAberto] = useState(false)
  const [pedidoParaForcar, setPedidoParaForcar] = useState<Pedido | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [clientes, setClientes] = useState<any[]>([])

  const isAdmin = currentUser?.role === "ADMIN"

  const carregarFila = async () => {
    setLoading(true)
    const [resultado, usuariosResultado, clientesResultado] = await Promise.all([
      actionListarFilaSeparacao(),
      actionObterUsuarios(),
      listarClientes(),
    ])
    const usuariosLista = usuariosResultado.ok && usuariosResultado.data ? usuariosResultado.data : []
    if (clientesResultado.ok && clientesResultado.data) {
      setClientes(clientesResultado.data)
    }

    if (resultado.ok && resultado.data) {
      const pedidosComDados = resultado.data.map((pedido) => {
        const cliente = clientes.find((c) => c.id === pedido.clienteId)
        const separador = pedido.separadorId ? usuariosLista.find((u) => u.id === pedido.separadorId) : undefined

        return {
          ...pedido,
          clienteNome: cliente?.nome || "Cliente não encontrado",
          separadorNome: separador?.nome,
          itensTotal: pedido.itens.length,
          tempoNaFila: formatarTempoNaFila(pedido.statusAlteradoEm),
        }
      })
      setPedidos(pedidosComDados)
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarFila()
  }, [])

  const filtrados = useMemo(() => {
    return pedidos.filter((pedido) => {
      // Busca por nº pedido ou cliente
      if (busca) {
        const q = busca.toLowerCase()
        const matchNumero = pedido.numero.toString().includes(q)
        const matchCliente = pedido.clienteNome.toLowerCase().includes(q)
        if (!matchNumero && !matchCliente) return false
      }

      // Filtro por status
      if (status && pedido.status !== status) return false

      return true
    })
  }, [pedidos, busca, status])

  const tabelaOrdenada = useMemo(() => {
    if (!sort) return filtrados

    return [...filtrados].sort((a, b) => {
      let comparison = 0
      if (sort.columnId === "numero") {
        comparison = a.numero - b.numero
      } else if (sort.columnId === "clienteNome") {
        comparison = a.clienteNome.localeCompare(b.clienteNome)
      } else if (sort.columnId === "itensTotal") {
        comparison = a.itensTotal - b.itensTotal
      } else if (sort.columnId === "tempoNaFila") {
        comparison = new Date(a.statusAlteradoEm).getTime() - new Date(b.statusAlteradoEm).getTime()
      } else if (sort.columnId === "status") {
        comparison = a.status.localeCompare(b.status)
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

  function handleRowClick(row: PedidoComDados) {
    // Se já EM_SEPARACAO por outro operador, não abre
    if (row.status === "EM_SEPARACAO" && row.separadorId && row.separadorId !== currentUser?.id) {
      return
    }
    router.push(`/separacao/${row.id}`)
  }

  function handleForcarLiberacao(pedido: Pedido) {
    setPedidoParaForcar(pedido)
    setModalForcarLiberacaoAberto(true)
    setFormError(null)
  }

  async function handleConfirmarForcarLiberacao() {
    if (!pedidoParaForcar) return

    setSubmitting(true)
    setFormError(null)

    const resultado = await actionForcarLiberacaoLock({ pedidoId: pedidoParaForcar.id })

    setSubmitting(false)

    if (!resultado.ok) {
      setFormError(resultado.error || "Erro ao forçar liberação de lock.")
      return
    }

    setModalForcarLiberacaoAberto(false)
    setPedidoParaForcar(null)
    await carregarFila()
  }

  const columns: DataTableColumn<PedidoComDados>[] = [
    { id: "numero", header: "Nº Pedido", cell: (r) => r.numero, sortable: true },
    { id: "clienteNome", header: "Cliente", cell: (r) => r.clienteNome, sortable: true },
    { id: "itensTotal", header: "Qtd. itens", cell: (r) => r.itensTotal, sortable: true },
    { id: "tempoNaFila", header: "Tempo na fila", cell: (r) => r.tempoNaFila, sortable: true },
    {
      id: "status",
      header: "Status",
      cell: (r) => {
        if (r.status === "EM_SEPARACAO" && r.separadorNome) {
          return `Em separação por ${r.separadorNome} desde ${formatarDataHora(r.statusAlteradoEm)}`
        }
        return r.status
      },
      sortable: true,
    },
  ]

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Fila de Separação</h1>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Buscar por nº pedido ou cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>

        <div className="w-[180px]">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusPedido | "")}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={tabelaOrdenada}
        getRowId={(r) => r.id}
        onRowClick={handleRowClick}
        emptyState="Nenhum pedido pendente de separação no momento."
        sort={sort}
        onSortChange={handleSortChange}
      />

      {/* Modal forçar liberação de lock */}
      <Modal open={modalForcarLiberacaoAberto} onOpenChange={setModalForcarLiberacaoAberto} title="Forçar liberação de lock">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Deseja forçar a liberação do lock do pedido #{pedidoParaForcar?.numero}? O pedido voltará para a fila de separação.
          </p>

          {formError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalForcarLiberacaoAberto(false)}
              disabled={submitting}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarForcarLiberacao}
              disabled={submitting}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              {submitting ? "Liberando..." : "Liberar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

