"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { X, AlertTriangle, Check, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Pedido, MotivoDevolucao } from "@/types/domain"
import { useDevolucoesStore } from "@/lib/devolucoes-store"
import { useProdutosStore } from "@/lib/produtos-store"
import { Modal } from "@/components/ui/modal"

interface SolicitarDevolucaoFormProps {
  open: boolean
  pedido: Pedido
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type ItemSelecionado = {
  itemPedidoId: string
  produtoId: string
  quantidade: number
  saldoDevolvivel: number
}

const MOTIVO_LABELS: Record<MotivoDevolucao, string> = {
  PRODUTO_AVARIADO: "Produto avariado",
  PRODUTO_INCORRETO: "Produto incorreto",
  DEFEITO: "Defeito",
  DESISTENCIA_CLIENTE: "Desistência do cliente",
  EXCESSO_COMPRA: "Excesso de compra",
  OUTRO: "Outro",
}

export function SolicitarDevolucaoForm({ open, pedido, onOpenChange, onSuccess }: SolicitarDevolucaoFormProps) {
  const { calcularSaldoDevolvivel, solicitarDevolucao } = useDevolucoesStore()
  const produtosStore = useProdutosStore((s) => s.produtos)

  const [itensSelecionados, setItensSelecionados] = useState<Record<string, ItemSelecionado>>({})
  const [motivo, setMotivo] = useState<MotivoDevolucao | "">("")
  const [motivoOutroTexto, setMotivoOutroTexto] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [saldosCarregando, setSaldosCarregando] = useState(false)
  const [saldos, setSaldos] = useState<Record<string, number>>({})

  const firstFieldRef = useRef<HTMLInputElement>(null)

  // Reset form when drawer opens
  useEffect(() => {
    if (!open) return
    setItensSelecionados({})
    setMotivo("")
    setMotivoOutroTexto("")
    setSubmitting(false)
    setFormError(null)
    setShowConfirmDialog(false)
    setSaldos({})
  }, [open])

  // Load saldo devolvível for each item when pedido changes
  useEffect(() => {
    const carregarSaldos = async () => {
      setSaldosCarregando(true)
      const novosSaldos: Record<string, number> = {}
      for (const item of pedido.itens) {
        const saldo = await calcularSaldoDevolvivel(pedido.id, item.id)
        novosSaldos[item.id] = saldo
      }
      setSaldos(novosSaldos)
      setSaldosCarregando(false)
    }
    carregarSaldos()
  }, [pedido.id, calcularSaldoDevolvivel])

  // Calculate saldo devolvível for each item
  const itensComSaldo = pedido.itens.map((item) => ({
    ...item,
    saldoDevolvivel: saldos[item.id] ?? 0,
  }))

  const hasItensSelecionados = Object.keys(itensSelecionados).length > 0
  const motivoOutroObrigatorio = motivo === "OUTRO"
  const motivoOutroPreenchido = motivoOutroTexto.trim().length > 0

  const podeSubmeter =
    hasItensSelecionados &&
    motivo !== "" &&
    (!motivoOutroObrigatorio || motivoOutroPreenchido) &&
    !submitting

  function toggleItemSelecionado(itemPedidoId: string, produtoId: string, saldoDevolvivel: number) {
    setItensSelecionados((prev) => {
      if (prev[itemPedidoId]) {
        const next = { ...prev }
        delete next[itemPedidoId]
        return next
      }
      return {
        ...prev,
        [itemPedidoId]: {
          itemPedidoId,
          produtoId,
          quantidade: 1, // Start with 1 as default
          saldoDevolvivel,
        },
      }
    })
  }

  function updateQuantidade(itemPedidoId: string, quantidade: number) {
    setItensSelecionados((prev) => {
      const item = prev[itemPedidoId]
      if (!item) return prev
      return {
        ...prev,
        [itemPedidoId]: {
          ...item,
          quantidade: Math.max(1, Math.min(item.saldoDevolvivel, quantidade)),
        },
      }
    })
  }

  function handleSubmit() {
    if (!podeSubmeter) return
    setShowConfirmDialog(true)
  }

  async function confirmarSubmit() {
    setShowConfirmDialog(false)
    setSubmitting(true)
    setFormError(null)

    const itensArray = Object.values(itensSelecionados).map((item) => ({
      itemPedidoId: item.itemPedidoId,
      quantidadeSolicitada: item.quantidade,
    }))

    const resultado = await solicitarDevolucao({
      pedidoId: pedido.id,
      itens: itensArray,
      motivo: motivo as MotivoDevolucao,
      motivoOutroTexto: motivo === "OUTRO" ? motivoOutroTexto : undefined,
    })

    setSubmitting(false)

    if (!resultado.sucesso) {
      setFormError(resultado.erro)
      return
    }

    onSuccess?.()
    onOpenChange(false)
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Backdrop
            className={cn(
              "fixed inset-0 z-50 bg-foreground/25",
              "transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            )}
          />
          <Dialog.Popup
            initialFocus={firstFieldRef}
            className={cn(
              "fixed inset-y-0 right-0 z-50 flex w-[min(26rem,100vw)] flex-col bg-card text-card-foreground shadow-xl shadow-black/20 outline-none",
              "transition-transform duration-200 data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
            )}
          >
            {/* Header */}
            <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <Dialog.Title className="text-sm font-semibold text-foreground">
                  Solicitar devolução
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                  Selecione os itens e informe o motivo da devolução.
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </Dialog.Close>
            </header>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* Itens do pedido */}
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide text-foreground uppercase">
                  Itens do pedido
                </h3>
                <span className="font-mono text-xs text-muted-foreground">
                  {pedido.itens.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {itensComSaldo.map((item) => {
                  const produto = produtosStore.find((p: any) => p.id === item.produtoId)
                  const selecionado = Boolean(itensSelecionados[item.id])
                  const semSaldo = item.saldoDevolvivel === 0 && !saldosCarregando

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-md border p-2.5",
                        semSaldo
                          ? "border-border bg-muted/30 opacity-60"
                          : "border-border bg-background",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selecionado}
                          disabled={semSaldo}
                          onChange={() =>
                            toggleItemSelecionado(item.id, item.produtoId, item.saldoDevolvivel)
                          }
                          className="mt-0.5 size-4 accent-primary disabled:opacity-50"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground">
                            {produto?.nome ?? item.produtoId}
                          </p>
                          <p className="text-[0.68rem] text-muted-foreground">
                            Qtd. vendida: {item.quantidade} · Saldo devolvível:{" "}
                            <span
                              className={cn(
                                "font-medium",
                                semSaldo ? "text-destructive" : "text-foreground",
                              )}
                            >
                              {saldosCarregando ? "Carregando..." : item.saldoDevolvivel}
                            </span>
                          </p>
                          {semSaldo && !saldosCarregando && (
                            <p className="mt-1 text-[0.62rem] text-destructive">
                              Sem saldo para devolução
                            </p>
                          )}
                        </div>
                      </div>

                      {selecionado && !semSaldo && (
                        <div className="mt-2 ml-6">
                          <label className="mb-1 block text-[0.68rem] font-medium text-muted-foreground">
                            Quantidade a devolver
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={itensSelecionados[item.id]?.saldoDevolvivel}
                            value={itensSelecionados[item.id]?.quantidade ?? 1}
                            onChange={(e) =>
                              updateQuantidade(item.id, parseInt(e.target.value) || 1)
                            }
                            className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Motivo - só aparece após seleção de itens */}
              {hasItensSelecionados && (
                <div className="mt-4">
                  <label
                    htmlFor="dev-motivo"
                    className="mb-1 block text-xs font-medium text-foreground"
                  >
                    Motivo da devolução <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="dev-motivo"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value as MotivoDevolucao | "")}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <option value="">Selecione...</option>
                    {(Object.keys(MOTIVO_LABELS) as MotivoDevolucao[]).map((m) => (
                      <option key={m} value={m}>
                        {MOTIVO_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Motivo OUTRO - texto livre */}
              {motivo === "OUTRO" && (
                <div className="mt-3">
                  <label
                    htmlFor="dev-outro"
                    className="mb-1 block text-xs font-medium text-foreground"
                  >
                    Descreva o motivo <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id="dev-outro"
                    value={motivoOutroTexto}
                    onChange={(e) => setMotivoOutroTexto(e.target.value)}
                    placeholder="Informe o detalhe do motivo..."
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="border-t border-border px-4 py-3">
              {formError && (
                <div className="mb-2.5 flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <p className="text-xs leading-relaxed text-destructive">{formError}</p>
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <Dialog.Close className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50">
                  Cancelar
                </Dialog.Close>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!podeSubmeter}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                >
                  {submitting && (
                    <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                  )}
                  {submitting ? "Processando…" : "Solicitar devolução"}
                </button>
              </div>
            </footer>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Confirmation dialog */}
      <Modal
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Confirmar solicitação"
        description="Deseja solicitar esta devolução?"
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowConfirmDialog(false)}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmarSubmit}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Check className="size-3.5" />
            Confirmar
          </button>
        </div>
      </Modal>
    </>
  )
}
