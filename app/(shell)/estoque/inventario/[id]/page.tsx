"use client"

import { use, useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, AlertTriangle, RefreshCw, User, Search } from "lucide-react"
import { useCurrentUser } from "@/lib/auth-context"
import {
  actionObterInventario,
  actionRegistrarContagemItem,
  actionRecontarItem,
  actionAplicarAjusteInventario,
  actionAplicarTodosAjustesInventario,
  actionReatribuirResponsavelInventario,
  actionFinalizarInventario,
} from "@/lib/actions/inventario"
import { podeContarInventario, podeAplicarAjusteInventario, podeFinalizarInventario, podeReatribuirResponsavelInventario } from "@/lib/policies"
import { actionObterUsuarios } from "@/lib/actions/usuarios"
import type { StatusItemContagem } from "@/types/domain"
import { Modal } from "@/components/ui/modal"
import { cn } from "@/lib/utils"

const STATUS_ITEM_CONFIG: Record<StatusItemContagem, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  PENDENTE: { label: "Pendente", bg: "bg-muted", text: "text-muted-foreground", icon: null },
  CONTADO_OK: { label: "OK", bg: "bg-[#f0f9f4]", text: "text-success", icon: <CheckCircle2 className="w-3 h-3" /> },
  DIVERGENTE: { label: "Divergente", bg: "bg-[#fef4e6]", text: "text-warning", icon: <AlertTriangle className="w-3 h-3" /> },
  NECESSITA_RECONTAGEM: { label: "Recontar", bg: "bg-[#fee2e2]", text: "text-destructive", icon: <RefreshCw className="w-3 h-3" /> },
  AJUSTADO: { label: "Ajustado", bg: "bg-[#e0f2fe]", text: "text-accent", icon: <CheckCircle2 className="w-3 h-3" /> },
}

export default function InventarioContagemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const currentUser = useCurrentUser()

  const [inventario, setInventario] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [erroCarregar, setErroCarregar] = useState<string | null>(null)
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string; funcao: string; status: string }[]>([])
  const [mostrarSaldoEsperado, setMostrarSaldoEsperado] = useState(false)
  const [busca, setBusca] = useState("")
  const [quantidades, setQuantidades] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [modalReatribuirAberto, setModalReatribuirAberto] = useState(false)
  const [novoResponsavelId, setNovoResponsavelId] = useState("")
  const [modalConfirmarAjustesAberto, setModalConfirmarAjustesAberto] = useState(false)
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false)
  const [avisoFinalizacao, setAvisoFinalizacao] = useState<string | null>(null)

  const inputRefs = useRef<Record<string, HTMLInputElement>>({})
  const buscaRef = useRef<HTMLInputElement>(null)

  const carregarInventario = useCallback(async () => {
    const resultado = await actionObterInventario({ inventarioId: id })
    if (resultado.ok && resultado.data) {
      setInventario(resultado.data)
      const qtds: Record<string, string> = {}
      resultado.data.itens.forEach((item: any) => {
        if (item.quantidadeContada !== null) {
          qtds[item.id] = item.quantidadeContada.toString()
        }
      })
      setQuantidades(qtds)
      setErroCarregar(null)
    } else {
      setErroCarregar(resultado.error || "Inventário não encontrado.")
      setInventario(null)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    carregarInventario().finally(() => setLoading(false))
  }, [carregarInventario])

  useEffect(() => {
    actionObterUsuarios().then((resultado) => {
      if (resultado.ok && resultado.data) {
        setUsuarios(resultado.data)
      }
    })
  }, [])

  const podeContar = inventario ? podeContarInventario(currentUser, inventario) : false
  const podeAplicarAjuste = podeAplicarAjusteInventario(currentUser)
  const podeFinalizar = podeFinalizarInventario(currentUser)
  const podeReatribuir = podeReatribuirResponsavelInventario(currentUser)

  const estoquistas = useMemo(
    () => usuarios.filter((u) => u.funcao === "ESTOQUE" && u.status === "ativo"),
    [usuarios],
  )

  const itensFiltrados = useMemo(() => {
    if (!inventario) return []
    if (!busca) return inventario.itens
    const q = busca.toLowerCase()
    return inventario.itens.filter((item: any) => {
      return (
        item.produto.nome.toLowerCase().includes(q) ||
        item.produto.skuInterno.toLowerCase().includes(q) ||
        item.produto.codigoBarras?.toLowerCase().includes(q)
      )
    })
  }, [inventario, busca])

  const itensPendentes = useMemo(() => itensFiltrados.filter((i: any) => i.status === "PENDENTE"), [itensFiltrados])
  const itensDivergentes = useMemo(() => itensFiltrados.filter((i: any) => i.status === "DIVERGENTE"), [itensFiltrados])

  const progresso = useMemo(() => {
    if (!inventario) return { contados: 0, total: 0 }
    const contados = inventario.itens.filter((i: any) => i.quantidadeContada !== null).length
    return { contados, total: inventario.itens.length }
  }, [inventario])

  const handleVoltar = () => router.push("/estoque/inventario")
  const handleToggleSaldoEsperado = () => setMostrarSaldoEsperado((v) => !v)
  const handleQuantidadeChange = (itemId: string, valor: string) => setQuantidades((prev) => ({ ...prev, [itemId]: valor }))

  const handleContarItem = async (itemId: string) => {
    if (!inventario || !podeContar) return

    const valorStr = quantidades[itemId] || "0"
    const quantidadeContada = parseFloat(valorStr)

    if (isNaN(quantidadeContada) || quantidadeContada < 0) {
      setFormError("Quantidade inválida.")
      return
    }

    setSubmitting(true)
    setFormError(null)

    const resultado = await actionRegistrarContagemItem({ inventarioId: inventario.id, itemId, quantidadeContada })

    if (!resultado.ok) {
      setSubmitting(false)
      setFormError(resultado.error || "Erro ao registrar contagem")
      return
    }

    await carregarInventario()
    setSubmitting(false)

    const proximoPendente = itensPendentes.find((i: any) => i.id !== itemId)
    if (proximoPendente) {
      setTimeout(() => {
        inputRefs.current[proximoPendente.id]?.focus()
        inputRefs.current[proximoPendente.id]?.select()
      }, 100)
    }
  }

  const handleKeyDown = (itemId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleContarItem(itemId)
    }
  }

  const handleRecontarItem = async (itemId: string) => {
    if (!inventario || !podeContar) return
    setSubmitting(true)
    setFormError(null)

    const resultado = await actionRecontarItem({ inventarioId: inventario.id, itemId })

    if (!resultado.ok) {
      setSubmitting(false)
      setFormError(resultado.error || "Erro ao recontar item")
      return
    }

    await carregarInventario()
    setSubmitting(false)
    setQuantidades((prev) => ({ ...prev, [itemId]: "" }))
  }

  const handleAplicarAjuste = async (itemId: string) => {
    if (!inventario || !podeAplicarAjuste) return
    setSubmitting(true)
    setFormError(null)

    const resultado = await actionAplicarAjusteInventario({ inventarioId: inventario.id, itemId })

    if (!resultado.ok) {
      setSubmitting(false)
      setFormError(resultado.error || "Erro ao aplicar ajuste")
      return
    }

    await carregarInventario()
    setSubmitting(false)
  }

  const handleAplicarTodosAjustes = async () => {
    if (!inventario || !podeAplicarAjuste) return
    setModalConfirmarAjustesAberto(false)
    setSubmitting(true)
    setFormError(null)

    const resultado = await actionAplicarTodosAjustesInventario({ inventarioId: inventario.id })

    if (!resultado.ok || !resultado.data) {
      setSubmitting(false)
      setFormError(resultado.error || "Erro ao aplicar ajustes")
      return
    }
    
    if (resultado.data.falharam.length > 0) {
      setFormError(`${resultado.data.aplicados} ajuste(s) aplicado(s), ${resultado.data.falharam.length} falharam.`)
    }

    await carregarInventario()
    setSubmitting(false)
  }

  const handleReatribuirResponsavel = async () => {
    if (!inventario || !podeReatribuir || !novoResponsavelId) return
    setSubmitting(true)
    setFormError(null)

    const resultado = await actionReatribuirResponsavelInventario({ inventarioId: inventario.id, novoResponsavelId })

    if (!resultado.ok) {
      setSubmitting(false)
      setFormError(resultado.error || "Erro ao reatribuir responsável")
      return
    }

    await carregarInventario()
    setSubmitting(false)
    setModalReatribuirAberto(false)
    setNovoResponsavelId("")
  }

  const handleFinalizarInventario = () => {
    if (!inventario || !podeFinalizar) return

    const itensDivergentesSemAjuste = inventario.itens.filter((i: any) => i.status === "DIVERGENTE")
    if (itensDivergentesSemAjuste.length > 0) {
      setFormError("Existem itens divergentes sem ajuste aplicado. Resolva as divergências antes de finalizar.")
      return
    }

    const itensRecontagem = inventario.itens.filter((i: any) => i.status === "NECESSITA_RECONTAGEM")
    if (itensRecontagem.length > 0) {
      setAvisoFinalizacao(`${itensRecontagem.length} item(ns) necessita(m) recontagem. O inventário será finalizado com pendências.`)
      setModalFinalizarAberto(true)
      return
    }

    setModalFinalizarAberto(true)
    setAvisoFinalizacao(null)
  }

  const handleConfirmarFinalizacao = async () => {
    if (!inventario || !podeFinalizar) return
    setModalFinalizarAberto(false)
    setSubmitting(true)
    setFormError(null)

    const resultado = await actionFinalizarInventario({ inventarioId: inventario.id })

    if (!resultado.ok) {
      setSubmitting(false)
      setFormError(resultado.error || "Erro ao finalizar inventário")
      return
    }

    await carregarInventario()
    setSubmitting(false)
  }

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault()
        buscaRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (!inventario) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="text-sm text-destructive">{erroCarregar || "Inventário não encontrado."}</div>
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

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button type="button" onClick={handleVoltar} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">{inventario.descricaoEscopo}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Status: {inventario.status}</span>
              <span>Progresso: {progresso.contados}/{progresso.total}</span>
              <span>Responsável: {inventario.responsavelContagem?.nome ?? inventario.responsavelContagemId}</span>
            </div>
          </div>
        </div>

        {inventario.status === "EM_ANDAMENTO" && podeReatribuir && (
          <button
            type="button"
            onClick={() => setModalReatribuirAberto(true)}
            className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <User className="w-4 h-4" />
            Reatribuir Responsável
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={buscaRef}
            type="text"
            placeholder="Buscar produto (SKU, nome, código de barras)... (/ para focar)"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <button
          type="button"
          onClick={handleToggleSaldoEsperado}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {mostrarSaldoEsperado ? "Ocultar saldo esperado" : "Mostrar saldo esperado"}
        </button>
      </div>

      {formError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>
      )}

      <div className="flex flex-col gap-2">
        {itensFiltrados.map((item: any) => {
          const produto = item.produto
          const statusConfig = STATUS_ITEM_CONFIG[item.status as StatusItemContagem]
          const diferenca = item.quantidadeContada !== null ? item.quantidadeContada - item.saldoEsperado : null

          return (
            <div
              key={item.id}
              className={cn(
                "rounded-md border border-border p-3",
                item.status === "DIVERGENTE" && "border-warning/50 bg-warning/5",
                item.status === "NECESSITA_RECONTAGEM" && "border-destructive/50 bg-destructive/5"
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

                  {item.status === "NECESSITA_RECONTAGEM" && podeContar && (
                    <button
                      type="button"
                      onClick={() => handleRecontarItem(item.id)}
                      disabled={submitting}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                    >
                      Recontar
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {mostrarSaldoEsperado && (
                  <div className="text-sm text-muted-foreground">
                    Esperado: {item.saldoEsperado} {produto.unidadeMedida}
                  </div>
                )}

                {inventario.status === "EM_ANDAMENTO" && podeContar && (
                  <div className="flex items-center gap-2">
                    <input
                      ref={(el) => {
                        if (el) inputRefs.current[item.id] = el
                      }}
                      type="number"
                      min={0}
                      step={produto.permiteFracionado ? 0.01 : 1}
                      value={quantidades[item.id] || ""}
                      onChange={(e) => handleQuantidadeChange(item.id, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(item.id, e)}
                      disabled={submitting || item.status === "AJUSTADO"}
                      placeholder="Quantidade contada"
                      className="h-8 w-32 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => handleContarItem(item.id)}
                      disabled={submitting || item.status === "AJUSTADO"}
                      className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                    >
                      Confirmar
                    </button>
                  </div>
                )}

                {item.status === "DIVERGENTE" && diferenca !== null && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Diferença: </span>
                    <span className={cn("font-medium", diferenca > 0 ? "text-success" : "text-destructive")}>
                      {diferenca > 0 ? "+" : ""}{diferenca}
                    </span>
                  </div>
                )}

                {item.status === "DIVERGENTE" && podeAplicarAjuste && (
                  <button
                    type="button"
                    onClick={() => handleAplicarAjuste(item.id)}
                    disabled={submitting}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                  >
                    Aplicar ajuste
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {itensDivergentes.length > 0 && (
        <div className="rounded-md border border-warning/50 bg-warning/5 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Divergências ({itensDivergentes.length})</h3>
          <div className="flex flex-col gap-2">
            {itensDivergentes.map((item: any) => {
              const produto = item.produto
              const diferenca = item.quantidadeContada !== null ? item.quantidadeContada - item.saldoEsperado : null

              return (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-foreground">{produto.nome}</span>
                    <span className="text-muted-foreground ml-2">
                      Esperado: {item.saldoEsperado} | Contado: {item.quantidadeContada ?? "-"}
                    </span>
                    {diferenca !== null && (
                      <span className={cn("ml-2 font-medium", diferenca > 0 ? "text-success" : "text-destructive")}>
                        ({diferenca > 0 ? "+" : ""}{diferenca})
                      </span>
                    )}
                  </div>
                  {podeAplicarAjuste && (
                    <button
                      type="button"
                      onClick={() => handleAplicarAjuste(item.id)}
                      disabled={submitting}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                    >
                      Aplicar ajuste
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {itensDivergentes.length >= 2 && podeAplicarAjuste && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <button
                type="button"
                onClick={() => setModalConfirmarAjustesAberto(true)}
                disabled={submitting}
                className="w-full rounded-md bg-warning px-3 py-2 text-sm font-medium text-warning-foreground outline-none hover:bg-warning/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                Aplicar todos os ajustes ({itensDivergentes.length})
              </button>
            </div>
          )}
        </div>
      )}

      {inventario.status === "EM_ANDAMENTO" && (
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleFinalizarInventario}
            disabled={!podeFinalizar || submitting}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50",
              itensDivergentes.length > 0 ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary hover:bg-primary/90"
            )}
            title={itensDivergentes.length > 0 ? "Resolva as divergências antes de finalizar" : undefined}
          >
            {submitting ? "Processando..." : "Finalizar Inventário"}
          </button>
        </div>
      )}

      <Modal open={modalReatribuirAberto} onOpenChange={setModalReatribuirAberto} title="Reatribuir Responsável">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Novo responsável</label>
            <select
              value={novoResponsavelId}
              onChange={(e) => setNovoResponsavelId(e.target.value)}
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

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalReatribuirAberto(false)}
              disabled={submitting}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleReatribuirResponsavel}
              disabled={submitting || !novoResponsavelId}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              {submitting ? "Alterando..." : "Alterar Responsável"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modalConfirmarAjustesAberto} onOpenChange={setModalConfirmarAjustesAberto} title="Aplicar todos os ajustes">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Deseja aplicar ajustes para {itensDivergentes.length} item(ns) divergente(s)? Esta ação gerará movimentações de estoque.
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalConfirmarAjustesAberto(false)}
              disabled={submitting}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAplicarTodosAjustes}
              disabled={submitting}
              className="rounded-md bg-warning px-3 py-2 text-sm font-medium text-warning-foreground outline-none hover:bg-warning/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              {submitting ? "Aplicando..." : "Aplicar Todos"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modalFinalizarAberto} onOpenChange={setModalFinalizarAberto} title="Finalizar Inventário">
        <div className="flex flex-col gap-4">
          {avisoFinalizacao && (
            <div className="rounded-md border border-warning/50 bg-warning/5 p-3 text-sm text-warning">{avisoFinalizacao}</div>
          )}

          <p className="text-sm text-muted-foreground">
            {!avisoFinalizacao
              ? "Deseja finalizar este inventário? Após a finalização, não será possível fazer mais contagens ou ajustes."
              : "Deseja finalizar mesmo assim? O inventário será marcado como finalizado com pendências."}
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalFinalizarAberto(false)}
              disabled={submitting}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarFinalizacao}
              disabled={submitting}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              {submitting ? "Finalizando..." : "Finalizar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}