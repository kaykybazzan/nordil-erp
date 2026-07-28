"use client"

import { useEffect, useState } from "react"
import { useCurrentUser } from "@/lib/auth-context"
import { useDevolucoesStore } from "@/lib/devolucoes-store"
import { usePedidosStore } from "@/lib/pedidos-store"
import { useClientesStore } from "@/lib/clientes-store"
import { useUsuariosStore } from "@/lib/usuarios-store"
import { useProdutosStore } from "@/lib/produtos-store"
import { podeGerenciarDevolucao } from "@/lib/policies"
import { Drawer } from "@/components/ui/drawer"
import { Modal } from "@/components/ui/modal"
import { cn } from "@/lib/utils"
import type { Devolucao, MotivoDevolucao } from "@/types/domain"

interface DevolucaoDetalheDrawerProps {
  open: boolean
  devolucao: Devolucao | null
  onOpenChange: (open: boolean) => void
}

type ItemConfirmacao = {
  itemPedidoId: string
  produtoId: string
  quantidadeConfirmada: number
  quantidadeSolicitada: number
  observacaoAjuste: string
}

const MOTIVO_LABELS: Record<MotivoDevolucao, string> = {
  PRODUTO_AVARIADO: "Produto avariado",
  PRODUTO_INCORRETO: "Produto incorreto",
  DEFEITO: "Defeito",
  DESISTENCIA_CLIENTE: "Desistência do cliente",
  EXCESSO_COMPRA: "Excesso de compra",
  OUTRO: "Outro",
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

export function DevolucaoDetalheDrawer({ open, devolucao, onOpenChange }: DevolucaoDetalheDrawerProps) {
  const currentUser = useCurrentUser()
  const { confirmarDevolucao, cancelarDevolucao } = useDevolucoesStore()
  const pedidosStore = usePedidosStore((s) => s.pedidos)
  const clientesStore = useClientesStore((s) => s.clientes)
  const usuariosStore = useUsuariosStore((s) => s.usuarios)
  const produtosStore = useProdutosStore((s) => s.produtos)

  const [modoConfirmacao, setModoConfirmacao] = useState(false)
  const [itensConfirmacao, setItensConfirmacao] = useState<ItemConfirmacao[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const podeGerenciar = podeGerenciarDevolucao(currentUser)

  // Reset state when drawer opens/closes or devolucao changes
  useEffect(() => {
    if (!open || !devolucao) {
      setModoConfirmacao(false)
      setItensConfirmacao([])
      setSubmitting(false)
      setFormError(null)
      setShowConfirmDialog(false)
      setShowCancelDialog(false)
    }
  }, [open, devolucao])

  if (!devolucao) return null

  const pedido = pedidosStore.find((p: any) => p.id === devolucao!.pedidoId)
  const cliente = pedido ? clientesStore.find((c: any) => c.id === pedido.clienteId) : null
  const solicitadoPor = usuariosStore.find((u: any) => u.id === devolucao!.solicitadoPor)
  const confirmadoPor = devolucao!.confirmadoPor ? usuariosStore.find((u: any) => u.id === devolucao!.confirmadoPor) : null
  const canceladoPor = devolucao!.canceladoPor ? usuariosStore.find((u: any) => u.id === devolucao!.canceladoPor) : null

  const isSolicitada = devolucao!.status === "SOLICITADA"

  function iniciarConfirmacao() {
    setItensConfirmacao(
      devolucao!.itens.map((item) => ({
        itemPedidoId: item.itemPedidoId,
        produtoId: item.produtoId,
        quantidadeConfirmada: item.quantidadeSolicitada,
        quantidadeSolicitada: item.quantidadeSolicitada,
        observacaoAjuste: "",
      }))
    )
    setModoConfirmacao(true)
    setFormError(null)
  }

  function updateQuantidadeConfirmada(itemPedidoId: string, valor: number) {
    setItensConfirmacao((prev) =>
      prev.map((item) => {
        if (item.itemPedidoId !== itemPedidoId) return item
        const max = item.quantidadeSolicitada
        return {
          ...item,
          quantidadeConfirmada: Math.max(0, Math.min(max, valor)),
        }
      })
    )
  }

  function updateObservacaoAjuste(itemPedidoId: string, texto: string) {
    setItensConfirmacao((prev) =>
      prev.map((item) => {
        if (item.itemPedidoId !== itemPedidoId) return item
        return { ...item, observacaoAjuste: texto }
      })
    )
  }

  function podeConfirmar() {
    if (!isSolicitada || !podeGerenciar) return false
    if (itensConfirmacao.length === 0) return false

    // Check if all items with adjusted quantities have observacaoAjuste
    for (const item of itensConfirmacao) {
      if (item.quantidadeConfirmada < item.quantidadeSolicitada && !item.observacaoAjuste.trim()) {
        return false
      }
    }

    // Check if at least one item has quantidadeConfirmada > 0
    const totalConfirmado = itensConfirmacao.reduce((sum, item) => sum + item.quantidadeConfirmada, 0)
    return totalConfirmado > 0
  }

  function handleConfirmar() {
    if (!podeConfirmar()) return
    setShowConfirmDialog(true)
  }

  async function confirmarConfirmacao() {
    setShowConfirmDialog(false)
    setSubmitting(true)
    setFormError(null)

    const resultado = await confirmarDevolucao(
      devolucao!.id,
      {
        itens: itensConfirmacao.map((item) => ({
          itemPedidoId: item.itemPedidoId,
          quantidadeConfirmada: item.quantidadeConfirmada,
          observacaoAjuste: item.observacaoAjuste || undefined,
        })),
      },
    )

    setSubmitting(false)

    if (!resultado.sucesso) {
      setFormError(resultado.erro)
      return
    }

    onOpenChange(false)
  }

  function handleCancelar() {
    setShowCancelDialog(true)
  }

  async function confirmarCancelamento() {
    setShowCancelDialog(false)
    setSubmitting(true)
    setFormError(null)

    const resultado = await cancelarDevolucao(devolucao!.id)

    setSubmitting(false)

    if (!resultado.sucesso) {
      setFormError(resultado.erro)
      return
    }

    onOpenChange(false)
  }

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        title={`Devolução #${devolucao.id}`}
        footer={
          podeGerenciar && isSolicitada && !modoConfirmacao ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelar}
                disabled={submitting}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                Cancelar Solicitação
              </button>
              <button
                type="button"
                onClick={iniciarConfirmacao}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                Confirmar Recebimento
              </button>
            </div>
          ) : modoConfirmacao ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModoConfirmacao(false)}
                disabled={submitting}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmar}
                disabled={!podeConfirmar() || submitting}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                {submitting ? "Processando…" : "Confirmar Devolução"}
              </button>
            </div>
          ) : null
        }
      >
        <div className="flex flex-col gap-4">
          {/* Header info */}
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Nº Pedido:</span>
                <span className="ml-1 font-medium text-foreground">{pedido?.numero ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <span className="ml-1 font-medium text-foreground">{cliente?.nome ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className="ml-1 font-medium text-foreground">{devolucao.status}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Motivo:</span>
                <span className="ml-1 font-medium text-foreground">{MOTIVO_LABELS[devolucao.motivo] ?? devolucao.motivo}</span>
              </div>
            </div>
            {devolucao.motivo === "OUTRO" && devolucao.motivoOutroTexto && (
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">Descrição:</span>
                <span className="ml-1 text-foreground">{devolucao.motivoOutroTexto}</span>
              </div>
            )}
          </div>

          {/* Solicitação info */}
          <div className="text-sm">
            <div className="text-muted-foreground">Solicitado em: {formatarDataHora(devolucao.solicitadoEm)}</div>
            <div className="text-muted-foreground">Solicitado por: {solicitadoPor?.nome ?? devolucao.solicitadoPor}</div>
          </div>

          {/* Itens */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase text-foreground">Itens da devolução</h3>
            <div className="flex flex-col gap-2">
              {devolucao.itens.map((item) => {
                const produto = produtosStore.find((p: any) => p.id === item.produtoId)
                const itemConfirmacao = itensConfirmacao.find((ic) => ic.itemPedidoId === item.itemPedidoId)

                return (
                  <div key={item.itemPedidoId} className="rounded-md border border-border p-3">
                    <div className="mb-2 flex justify-between">
                      <span className="font-medium text-foreground">{produto?.nome ?? item.produtoId}</span>
                      <span className="text-sm text-muted-foreground">
                        Solicitada: {item.quantidadeSolicitada}
                      </span>
                    </div>

                    {modoConfirmacao && itemConfirmacao ? (
                      <div className="space-y-2">
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">
                            Quantidade confirmada
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={item.quantidadeSolicitada}
                            value={itemConfirmacao.quantidadeConfirmada}
                            onChange={(e) => updateQuantidadeConfirmada(item.itemPedidoId, parseInt(e.target.value) || 0)}
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          />
                        </div>
                        {itemConfirmacao.quantidadeConfirmada < item.quantidadeSolicitada && (
                          <div>
                            <label className="mb-1 block text-xs text-muted-foreground">
                              Observação de ajuste <span className="text-destructive">*</span>
                            </label>
                            <textarea
                              value={itemConfirmacao.observacaoAjuste}
                              onChange={(e) => updateObservacaoAjuste(item.itemPedidoId, e.target.value)}
                              placeholder="Informe o motivo do ajuste..."
                              rows={2}
                              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {item.quantidadeConfirmada !== null ? (
                          <span>Confirmada: {item.quantidadeConfirmada}</span>
                        ) : (
                          <span>Aguardando confirmação</span>
                        )}
                        {item.observacaoAjuste && (
                          <div className="mt-1 text-xs italic">{item.observacaoAjuste}</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Status final info */}
          {!isSolicitada && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              {devolucao.status === "CONCLUIDA" && (
                <div>
                  <span className="text-muted-foreground">Concluída em: {formatarDataHora(devolucao.confirmadoEm ?? "")}</span>
                  <br />
                  <span className="text-muted-foreground">Confirmado por: {confirmadoPor?.nome ?? devolucao.confirmadoPor}</span>
                </div>
              )}
              {devolucao.status === "CANCELADA" && (
                <div>
                  <span className="text-muted-foreground">Cancelada em: {formatarDataHora(devolucao.canceladoEm ?? "")}</span>
                  <br />
                  <span className="text-muted-foreground">Cancelado por: {canceladoPor?.nome ?? devolucao.canceladoPor}</span>
                </div>
              )}
            </div>
          )}

          {/* Form error */}
          {formError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}
        </div>
      </Drawer>

      {/* Confirmation dialog for confirmar */}
      <Modal
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Confirmar devolução"
        description="Deseja confirmar o recebimento desta devolução?"
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
            onClick={confirmarConfirmacao}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Confirmar
          </button>
        </div>
      </Modal>

      {/* Confirmation dialog for cancelar */}
      <Modal
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancelar solicitação"
        description="Deseja cancelar esta solicitação de devolução?"
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowCancelDialog(false)}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={confirmarCancelamento}
            className="rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground outline-none hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Cancelar Solicitação
          </button>
        </div>
      </Modal>
    </>
  )
}
