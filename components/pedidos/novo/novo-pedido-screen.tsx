"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, Loader2, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"
import { MOCK_CLIENTES } from "@/lib/mock-clientes"
import { MOCK_PRODUTOS } from "@/lib/mock-produtos"
import { useCurrentUser } from "@/lib/auth-context"
import { usePedidosStore } from "@/lib/pedidos-store"

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

interface ItemForm {
  id: string
  produtoId: string
  quantidade: string
  desconto: string
}

function newItem(): ItemForm {
  return { id: crypto.randomUUID(), produtoId: "", quantidade: "1", desconto: "0" }
}

export function NovoPedidoScreen() {
  const router = useRouter()
  const currentUser = useCurrentUser()
  const criarPedido = usePedidosStore((s) => s.criarPedido)

  const [clienteId, setClienteId] = useState("")
  const [enderecoIdx, setEnderecoIdx] = useState(0)
  const [itens, setItens] = useState<ItemForm[]>([newItem()])
  const [observacao, setObservacao] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  const clienteSelecionado = MOCK_CLIENTES.find((c) => c.id === clienteId)
  const enderecos = clienteSelecionado?.enderecos ?? []

  // produtos ativos com estoque
  const produtosDisponiveis = MOCK_PRODUTOS.filter(
    (p) => p.status === "ativo",
  )

  function addItem() {
    setItens((prev) => [...prev, newItem()])
  }

  function removeItem(id: string) {
    setItens((prev) => prev.filter((i) => i.id !== id))
  }

  function updateItem(id: string, field: keyof ItemForm, value: string) {
    setItens((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    )
  }

  // Calcula total dos itens válidos
  const total = itens.reduce((acc, item) => {
    const produto = MOCK_PRODUTOS.find((p) => p.id === item.produtoId)
    if (!produto) return acc
    const qtd = parseFloat(item.quantidade) || 0
    const desc = parseFloat(item.desconto) || 0
    return acc + produto.precoVenda * qtd * (1 - desc / 100)
  }, 0)

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!clienteId) errs.cliente = "Selecione um cliente."
    if (enderecos.length > 0 && enderecoIdx < 0) errs.endereco = "Selecione um endereço."

    const itensValidos = itens.filter((i) => i.produtoId && parseFloat(i.quantidade) > 0)
    if (itensValidos.length === 0) errs.itens = "Adicione pelo menos um item com produto e quantidade válidos."

    itens.forEach((item, idx) => {
      if (!item.produtoId) errs[`item_${idx}_produto`] = "Produto obrigatório."
      const qtd = parseFloat(item.quantidade)
      if (!qtd || qtd <= 0) errs[`item_${idx}_qty`] = "Qtd inválida."
      const desc = parseFloat(item.desconto)
      if (isNaN(desc) || desc < 0 || desc > 100) errs[`item_${idx}_desc`] = "0–100%"
    })

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    const endereco = clienteSelecionado && enderecos[enderecoIdx]
      ? {
          enderecoId: enderecos[enderecoIdx].id,
          logradouro: enderecos[enderecoIdx].logradouro,
          numero: enderecos[enderecoIdx].numero,
          bairro: enderecos[enderecoIdx].bairro,
          cidade: enderecos[enderecoIdx].cidade,
          uf: enderecos[enderecoIdx].uf,
          cep: enderecos[enderecoIdx].cep,
        }
      : { logradouro: "", numero: "", bairro: "", cidade: "", uf: "", cep: "" }

    const itensValidos = itens.filter((i) => i.produtoId && parseFloat(i.quantidade) > 0)

    const resultado = await criarPedido({
      clienteId,
      endereco,
      observacao: observacao.trim() || undefined,
      itens: itensValidos.map((i) => {
        const produto = MOCK_PRODUTOS.find((p) => p.id === i.produtoId)!
        return {
          produtoId: i.produtoId,
          quantidade: parseFloat(i.quantidade),
          precoUnitario: produto.precoVenda,
          desconto: parseFloat(i.desconto) || 0,
        }
      }),
    })

    setSubmitting(false)

    if (!resultado.ok) {
      showToast(resultado.error || "Erro ao criar pedido")
      return
    }

    const pedido = resultado.data
    if (!pedido) {
      showToast("Erro ao criar pedido")
      return
    }

    showToast(
      pedido.status === "CRIADO"
        ? "Pedido criado, mas sem estoque disponível para reserva."
        : "Pedido criado com sucesso!",
    )
    setTimeout(() => router.push("/pedidos"), 1200)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mx-auto max-w-3xl space-y-5 p-6">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/pedidos")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Novo pedido</h1>
            <p className="text-sm text-muted-foreground">Vendedor: {currentUser.nome}</p>
          </div>
        </div>

        {/* Cliente */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Cliente</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Cliente <span className="text-destructive">*</span>
              </label>
              <select
                value={clienteId}
                onChange={(e) => { setClienteId(e.target.value); setEnderecoIdx(0) }}
                className={cn(
                  "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40",
                  errors.cliente ? "border-destructive" : "border-border",
                )}
              >
                <option value="">Selecione um cliente...</option>
                {MOCK_CLIENTES.filter((c) => c.status === "ativo").map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              {errors.cliente && (
                <p className="mt-1 text-xs text-destructive">{errors.cliente}</p>
              )}
            </div>

            {clienteSelecionado && enderecos.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  Endereço de entrega <span className="text-destructive">*</span>
                </label>
                <select
                  value={enderecoIdx}
                  onChange={(e) => setEnderecoIdx(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {enderecos.map((end, idx) => (
                    <option key={end.id} value={idx}>
                      {end.logradouro}, {end.numero} — {end.cidade}/{end.uf}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Itens */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Itens</h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar item
            </button>
          </div>

          {errors.itens && (
            <p className="mb-3 rounded-lg bg-destructive/8 px-3 py-2 text-xs text-destructive">
              {errors.itens}
            </p>
          )}

          <div className="space-y-3">
            {itens.map((item, idx) => {
              const produto = MOCK_PRODUTOS.find((p) => p.id === item.produtoId)
              const qtd = parseFloat(item.quantidade) || 0
              const desc = parseFloat(item.desconto) || 0
              const subtotal = produto ? produto.precoVenda * qtd * (1 - desc / 100) : 0

              return (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 sm:grid-cols-[1fr_90px_80px_auto]"
                >
                  {/* Produto */}
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Produto
                    </label>
                    <select
                      value={item.produtoId}
                      onChange={(e) => updateItem(item.id, "produtoId", e.target.value)}
                      className={cn(
                        "w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30",
                        errors[`item_${idx}_produto`] ? "border-destructive" : "border-border",
                      )}
                    >
                      <option value="">Selecione...</option>
                      {produtosDisponiveis.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} — {formatBRL(p.precoVenda)}/{p.unidadeMedida}
                        </option>
                      ))}
                    </select>
                    {produto && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Estoque: {produto.estoqueAtual} {produto.unidadeMedida}
                      </p>
                    )}
                  </div>

                  {/* Quantidade */}
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Qtd</label>
                    <input
                      type="number"
                      min="0"
                      step={produto?.permiteFracionado ? "0.1" : "1"}
                      value={item.quantidade}
                      onChange={(e) => updateItem(item.id, "quantidade", e.target.value)}
                      className={cn(
                        "w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30",
                        errors[`item_${idx}_qty`] ? "border-destructive" : "border-border",
                      )}
                    />
                  </div>

                  {/* Desconto */}
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Desc. %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={item.desconto}
                      onChange={(e) => updateItem(item.id, "desconto", e.target.value)}
                      className={cn(
                        "w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30",
                        errors[`item_${idx}_desc`] ? "border-destructive" : "border-border",
                      )}
                    />
                  </div>

                  {/* Subtotal + Remover */}
                  <div className="flex flex-col items-end justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {formatBRL(subtotal)}
                    </span>
                    {itens.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="mt-1 text-destructive/70 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Total */}
          <div className="mt-4 flex justify-end border-t border-border pt-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total do pedido</p>
              <p className="text-xl font-bold text-foreground">{formatBRL(total)}</p>
            </div>
          </div>
        </div>

        {/* Observação */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Observação</h2>
          <textarea
            rows={3}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Instruções de entrega, observações do cliente..."
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/pedidos")}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
            {submitting ? "Criando..." : "Criar pedido"}
          </button>
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}
    </form>
  )
}