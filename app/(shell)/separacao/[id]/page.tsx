"use client"

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, Package } from "lucide-react"
import { useCurrentUser } from "@/lib/auth-context"
import { useSeparacaoStore } from "@/lib/separacao-store"
import { actionIniciarSeparacao, actionDevolverAFila, actionFinalizarSeparacao } from "@/lib/actions/separacao"
import { actionObterPedido } from "@/lib/actions/pedidos"
import { listarClientes } from "@/lib/actions/clientes"
import { listarProdutos } from "@/lib/actions/produtos"
import type { Pedido, ItemPedido } from "@/types/domain"
import { Modal } from "@/components/ui/modal"
import { cn } from "@/lib/utils"

const formatarDataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const STATUS_LOCAL_CONFIG: Record<"PENDENTE" | "CONFIRMADO" | "RUPTURA", { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  PENDENTE: {
    label: "Pendente",
    bg: "bg-muted",
    text: "text-muted-foreground",
    icon: null,
  },
  CONFIRMADO: {
    label: "Confirmado",
    bg: "bg-[#f0f9f4]",
    text: "text-success",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  RUPTURA: {
    label: "Ruptura",
    bg: "bg-[#fef4e6]",
    text: "text-warning",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
}

export default function SeparacaoPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const currentUser = useCurrentUser()
  const separacaoStore = useSeparacaoStore()

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [quantidades, setQuantidades] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [modalDevolverAberto, setModalDevolverAberto] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [clientes, setClientes] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])

  const inputRefs = useRef<Record<string, HTMLInputElement>>({})
  const toastTimer = useRef<number | null>(null)

  const draft = separacaoStore.draft[id] || []

  useEffect(() => {
    let cancelado = false
    async function carregar() {
      setLoading(true)
      const [resultado, clientesResult, produtosResult] = await Promise.all([
        actionObterPedido(id),
        listarClientes(),
        listarProdutos(),
      ])
      if (cancelado) return
      if (!resultado.ok || !resultado.data) {
        setPedido(null)
        setLoading(false)
        return
      }
      setPedido(resultado.data)
      if (clientesResult.ok && clientesResult.data) {
        setClientes(clientesResult.data)
      }
      if (produtosResult.ok && produtosResult.data) {
        setProdutos(produtosResult.data)
      }
      const qtds: Record<string, string> = {}
      resultado.data.itens.forEach((item: ItemPedido) => {
        qtds[item.id] = item.quantidade.toString()
      })
      setQuantidades(qtds)

      // Reidrata draft se já estava EM_SEPARACAO por este usuário (ex: F5)
      if (
        resultado.data.status === "EM_SEPARACAO" &&
        resultado.data.separadorId === currentUser?.id
      ) {
        await separacaoStore.iniciarSeparacao(
          id,
          currentUser.id,
          currentUser.nome || currentUser.email,
          resultado.data
        )
      }

      setLoading(false)
    }
    carregar()
    return () => { cancelado = true }
  }, [id, currentUser?.id])

  const itensFiltrados = useMemo(() => {
    if (!pedido) return []
    if (!busca) return pedido.itens

    const q = busca.toLowerCase()
    return pedido.itens.filter((item) => {
      const produto = produtos.find((p) => p.id === item.produtoId)
      if (!produto) return false
      return (
        produto.nome.toLowerCase().includes(q) ||
        produto.skuInterno.toLowerCase().includes(q) ||
        produto.codigoBarras?.toLowerCase().includes(q)
      )
    })
  }, [pedido, busca, produtos])

  const progresso = useMemo(() => {
    if (draft.length === 0) return { confirmados: 0, total: 0 }
    const confirmados = draft.filter((d) => d.statusLocal === "CONFIRMADO" || d.statusLocal === "RUPTURA").length
    return { confirmados, total: draft.length }
  }, [draft])

  const itensRuptura = useMemo(() => {
    return draft.filter((d) => d.statusLocal === "RUPTURA")
  }, [draft])

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  const handleVoltar = () => {
    router.push("/separacao")
  }

  const handleQuantidadeChange = (itemPedidoId: string, valor: string) => {
    setQuantidades((prev) => ({ ...prev, [itemPedidoId]: valor }))
  }

  const handleConfirmarItem = async (itemPedidoId: string, produtoId: string) => {
    if (!pedido) return

    const valorStr = quantidades[itemPedidoId] || "0"
    const quantidadeInformada = parseFloat(valorStr)

    const produto = produtos.find((p) => p.id === produtoId)
    if (!produto) {
      setFormError("Produto não encontrado.")
      return
    }

    const resultado = await separacaoStore.confirmarItem(id, itemPedidoId, quantidadeInformada, produto)

    if (!resultado.sucesso) {
      setFormError(resultado.erro)
      return
    }

    setFormError(null)
    setQuantidades((prev) => ({ ...prev, [itemPedidoId]: quantidadeInformada.toString() }))

    // Move focus to next PENDENTE item
    const proximoPendente = draft.find((d) => d.statusLocal === "PENDENTE" && d.itemPedidoId !== itemPedidoId)
    if (proximoPendente) {
      setTimeout(() => {
        inputRefs.current[proximoPendente.itemPedidoId]?.focus()
        inputRefs.current[proximoPendente.itemPedidoId]?.select()
      }, 100)
    }
  }

  const handleKeyDown = (itemPedidoId: string, produtoId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleConfirmarItem(itemPedidoId, produtoId)
    }
  }

  const handleIniciarSeparacao = async () => {
    if (!pedido || !currentUser) return

    setSubmitting(true)
    setFormError(null)

    const resultado = await actionIniciarSeparacao({ pedidoId: id })

    setSubmitting(false)

    if (!resultado.ok) {
      setFormError(resultado.error || "Erro ao iniciar separação.")
      return
    }

    if (resultado.data) {
      setPedido(resultado.data)
      // Inicializa draft local
      await separacaoStore.iniciarSeparacao(id, currentUser.id, currentUser.nome || currentUser.email, resultado.data)
      
      // Inicializa quantidades
      const qtds: Record<string, string> = {}
      resultado.data.itens.forEach((item: ItemPedido) => {
        qtds[item.id] = item.quantidade.toString()
      })
      setQuantidades(qtds)
    }

    showToast("Separação iniciada.")
  }

  const handleDevolverAFila = async () => {
    setModalDevolverAberto(false)
    setSubmitting(true)
    setFormError(null)

    const resultado = await actionDevolverAFila({ pedidoId: id })

    setSubmitting(false)

    if (!resultado.ok) {
      setFormError(resultado.error || "Erro ao devolver à fila.")
      return
    }

    await separacaoStore.devolverAFila(id)
    if (resultado.data) {
      setPedido(resultado.data)
    }

    showToast("Pedido devolvido à fila.")
    router.push("/separacao")
  }

  const handleFinalizarSeparacao = async () => {
    if (!pedido) return

    // Valida: todo item confirmado
    const itensPendentes = draft.filter((d) => d.statusLocal === "PENDENTE")
    if (itensPendentes.length > 0) {
      setFormError("Confirme a quantidade de todos os itens antes de finalizar.")
      return
    }

    setSubmitting(true)
    setFormError(null)

    // Prepara todos os itens do draft
    const itensData = draft.map((d) => ({
      itemPedidoId: d.itemPedidoId,
      quantidadeSeparada: d.quantidadeSeparada || 0,
    }))

    const resultado = await actionFinalizarSeparacao({ pedidoId: id, itens: itensData })

    setSubmitting(false)

    if (!resultado.ok) {
      if (resultado.error === "Este pedido foi cancelado e não pode mais ser separado.") {
        setFormError(resultado.error)
        await separacaoStore.limparDraft(id)
        setTimeout(() => router.push("/separacao"), 2000)
        return
      }
      setFormError(resultado.error || "Erro ao finalizar separação.")
      return
    }

    await separacaoStore.finalizarSeparacao(id, currentUser?.id || "")

    if (resultado.data) {
      setPedido(resultado.data)
    }

    showToast(itensRuptura.length > 0 ? "Separação concluída com pendências." : "Separação concluída.")
    router.push("/separacao")
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="text-sm text-destructive">Pedido não encontrado.</div>
        <button
          type="button"
          onClick={handleVoltar}
          className="w-fit rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Voltar
        </button>
      </div>
    )
  }

  const cliente = clientes.find((c) => c.id === pedido.clienteId)
  const podeIniciar = pedido.status === "RESERVADO"
  const podeSeparar = pedido.status === "EM_SEPARACAO" && pedido.separadorId === currentUser?.id
  const todosConfirmados = draft.length > 0 && draft.every((d) => d.statusLocal !== "PENDENTE")

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleVoltar}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">Pedido #{pedido.numero}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Cliente: {cliente?.nome ?? pedido.clienteId}</span>
              <span>Status: {pedido.status}</span>
              {podeSeparar && (
                <span>Tempo em separação: {formatarTempoNaFila(pedido.statusAlteradoEm)}</span>
              )}
            </div>
          </div>
        </div>

        {podeIniciar && (
          <button
            type="button"
            onClick={handleIniciarSeparacao}
            disabled={submitting}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
          >
            <Package className="w-4 h-4" />
            {submitting ? "Iniciando..." : "Iniciar Separação"}
          </button>
        )}
      </div>

      {/* Form error */}
      {formError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </div>
      )}

      {/* Items list */}
      {podeSeparar && draft.length > 0 && (
        <>
          <div className="flex flex-col gap-2">
            {itensFiltrados.map((item) => {
              const produto = produtos.find((p) => p.id === item.produtoId)
              if (!produto) return null

              const draftItem = draft.find((d) => d.itemPedidoId === item.id)
              const statusLocal = draftItem?.statusLocal || "PENDENTE"
              const statusConfig = STATUS_LOCAL_CONFIG[statusLocal as keyof typeof STATUS_LOCAL_CONFIG]

              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-md border border-border p-3",
                    statusLocal === "RUPTURA" && "border-warning/50 bg-warning/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium text-foreground">{produto.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {produto.skuInterno} | {produto.unidadeMedida}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {statusConfig.icon && (
                        <div className={cn("flex items-center gap-1 px-2 py-1 rounded text-xs font-medium", statusConfig.bg, statusConfig.text)}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      Solicitado: {item.quantidade} {produto.unidadeMedida}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        ref={(el) => {
                          if (el) inputRefs.current[item.id] = el
                        }}
                        type="number"
                        min={0}
                        step={produto.permiteFracionado ? 0.01 : 1}
                        value={quantidades[item.id] || item.quantidade}
                        onChange={(e) => handleQuantidadeChange(item.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(item.id, produto.id, e)}
                        disabled={submitting}
                        placeholder="Quantidade encontrada"
                        className="h-8 w-32 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => handleConfirmarItem(item.id, produto.id)}
                        disabled={submitting}
                        className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Progresso */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Progresso: {progresso.confirmados} de {progresso.total} itens confirmados</span>
          </div>

          {/* Footer actions */}
          <div className="flex flex-col gap-3 pt-4 border-t border-border">
            {itensRuptura.length > 0 && (
              <div className="rounded-md border border-warning/50 bg-warning/5 p-3 text-sm text-warning">
                {itensRuptura.length} item(ns) com ruptura. O pedido seguirá para decisão do supervisor.
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalDevolverAberto(true)}
                disabled={submitting}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                Devolver à fila
              </button>
              <button
                type="button"
                onClick={handleFinalizarSeparacao}
                disabled={!todosConfirmados || submitting}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50",
                  !todosConfirmados ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary hover:bg-primary/90"
                )}
                title={!todosConfirmados ? "Confirme todos os itens antes de finalizar" : undefined}
              >
                {submitting ? "Processando..." : "Finalizar Separação"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal devolver à fila */}
      <Modal open={modalDevolverAberto} onOpenChange={setModalDevolverAberto} title="Devolver à fila">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Devolver este pedido à fila? O progresso desta separação será perdido.
          </p>

          {formError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalDevolverAberto(false)}
              disabled={submitting}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDevolverAFila}
              disabled={submitting}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              {submitting ? "Devolvendo..." : "Devolver"}
            </button>
          </div>
        </div>
      </Modal>

      {toast && (
        <div className="pointer-events-none fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

function formatarTempoNaFila(iso: string) {
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
