"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, User, Search } from "lucide-react"
import { useCurrentUser } from "@/lib/auth-context"
import { useInventarioContagemStore } from "@/lib/inventario-contagem-store"
import { podeContarInventario, podeAplicarAjusteInventario, podeFinalizarInventario, podeReatribuirResponsavelInventario } from "@/lib/policies"
import { MOCK_PRODUTOS } from "@/lib/mock-produtos"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"
import type { StatusItemContagem, InventarioContagem } from "@/types/domain"
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

const STATUS_ITEM_CONFIG: Record<StatusItemContagem, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  PENDENTE: {
    label: "Pendente",
    bg: "bg-muted",
    text: "text-muted-foreground",
    icon: null,
  },
  CONTADO_OK: {
    label: "OK",
    bg: "bg-[#f0f9f4]",
    text: "text-success",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  DIVERGENTE: {
    label: "Divergente",
    bg: "bg-[#fef4e6]",
    text: "text-warning",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  NECESSITA_RECONTAGEM: {
    label: "Recontar",
    bg: "bg-[#fee2e2]",
    text: "text-destructive",
    icon: <RefreshCw className="w-3 h-3" />,
  },
  AJUSTADO: {
    label: "Ajustado",
    bg: "bg-[#e0f2fe]",
    text: "text-accent",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
}

export default function InventarioContagemPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const currentUser = useCurrentUser()
  const inventarioStore = useInventarioContagemStore()

  const [inventario, setInventario] = useState<InventarioContagem | null>(null)
  const [loading, setLoading] = useState(true)
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

  const podeContar = inventario ? podeContarInventario(currentUser, inventario) : false
  const podeAplicarAjuste = podeAplicarAjusteInventario(currentUser)
  const podeFinalizar = podeFinalizarInventario(currentUser)
  const podeReatribuir = podeReatribuirResponsavelInventario(currentUser)

  const estoquistas = MOCK_USUARIOS.filter((u) => u.funcao === "ESTOQUE" && u.status === "ativo")

  useEffect(() => {
    const inv = inventarioStore.inventarios.find((i) => i.id === params.id)
    if (inv) {
      setInventario(inv)
      // Initialize quantidades with current counted values
      const qtds: Record<string, string> = {}
      inv.itens.forEach((item) => {
        if (item.quantidadeContada !== null) {
          qtds[item.id] = item.quantidadeContada.toString()
        }
      })
      setQuantidades(qtds)
    }
    setLoading(false)
  }, [params.id, inventarioStore.inventarios])

  const itensFiltrados = useMemo(() => {
    if (!inventario) return []
    if (!busca) return inventario.itens

    const q = busca.toLowerCase()
    return inventario.itens.filter((item) => {
      const produto = MOCK_PRODUTOS.find((p) => p.id === item.produtoId)
      if (!produto) return false
      return (
        produto.nome.toLowerCase().includes(q) ||
        produto.skuInterno.toLowerCase().includes(q) ||
        produto.codigoBarras?.toLowerCase().includes(q)
      )
    })
  }, [inventario, busca])

  const itensPendentes = useMemo(() => {
    return itensFiltrados.filter((i) => i.status === "PENDENTE")
  }, [itensFiltrados])

  const itensDivergentes = useMemo(() => {
    return itensFiltrados.filter((i) => i.status === "DIVERGENTE")
  }, [itensFiltrados])

  const itensRecontagem = useMemo(() => {
    return itensFiltrados.filter((i) => i.status === "NECESSITA_RECONTAGEM")
  }, [itensFiltrados])

  const progresso = useMemo(() => {
    if (!inventario) return { contados: 0, total: 0 }
    const contados = inventario.itens.filter((i) => i.quantidadeContada !== null).length
    return { contados, total: inventario.itens.length }
  }, [inventario])

  const handleVoltar = () => {
    router.push("/estoque/inventario")
  }

  const handleToggleSaldoEsperado = () => {
    setMostrarSaldoEsperado(!mostrarSaldoEsperado)
  }

  const handleQuantidadeChange = (itemId: string, valor: string) => {
    setQuantidades((prev) => ({ ...prev, [itemId]: valor }))
  }

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

    const resultado = await inventarioStore.registrarContagem(inventario.id, itemId, quantidadeContada, currentUser)

    setSubmitting(false)

    if (!resultado.sucesso) {
      setFormError(resultado.erro)
      return
    }

    // Update local state
    setInventario(resultado.inventario)
    setQuantidades((prev) => ({ ...prev, [itemId]: quantidadeContada.toString() }))

    // Move focus to next PENDENTE item
    const proximoPendente = itensPendentes.find((i) => i.id !== itemId)
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

    const resultado = await inventarioStore.recontarItem(inventario.id, itemId, currentUser)

    setSubmitting(false)

    if (!resultado.sucesso) {
      setFormError(resultado.erro)
      return
    }

    setInventario(resultado.inventario)
    setQuantidades((prev) => ({ ...prev, [itemId]: "" }))
  }

  const handleAplicarAjuste = async (itemId: string) => {
    if (!inventario || !podeAplicarAjuste) return

    setSubmitting(true)
    setFormError(null)

    const resultado = await inventarioStore.aplicarAjuste(inventario.id, itemId, currentUser)

    setSubmitting(false)

    if (!resultado.sucesso) {
      setFormError(resultado.erro)
      return
    }

    setInventario(resultado.inventario)
  }

  const handleAplicarTodosAjustes = async () => {
    if (!inventario || !podeAplicarAjuste) return

    setModalConfirmarAjustesAberto(false)
    setSubmitting(true)
    setFormError(null)

    const resultado = await inventarioStore.aplicarTodosAjustes(inventario.id, currentUser)

    setSubmitting(false)

    if (!resultado.sucesso) {
      setFormError(resultado.erro)
      return
    }

    setInventario(resultado.inventario)
  }

  const handleReatribuirResponsavel = async () => {
    if (!inventario || !podeReatribuir || !novoResponsavelId) return

    setSubmitting(true)
    setFormError(null)

    const resultado = await inventarioStore.reatribuirResponsavel(inventario.id, novoResponsavelId, currentUser)

    setSubmitting(false)

    if (!resultado.sucesso) {
      setFormError(resultado.erro)
      return
    }

    setInventario(resultado.inventario)
    setModalReatribuirAberto(false)
    setNovoResponsavelId("")
  }

  const handleFinalizarInventario = async () => {
    if (!inventario || !podeFinalizar) return

    // Check for DIVERGENTE items
    const itensDivergentesSemAjuste = inventario.itens.filter((i) => i.status === "DIVERGENTE")
    if (itensDivergentesSemAjuste.length > 0) {
      setFormError("Existem itens divergentes sem ajuste aplicado. Resolva as divergências antes de finalizar.")
      return
    }

    // Check for NECESSITA_RECONTAGEM items
    const itensRecontagem = inventario.itens.filter((i) => i.status === "NECESSITA_RECONTAGEM")
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

    const resultado = await inventarioStore.finalizarInventario(inventario.id, currentUser)

    setSubmitting(false)

    if (!resultado.sucesso) {
      setFormError(resultado.erro)
      return
    }

    setInventario(resultado.inventario)
  }

  // Keyboard navigation for /
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
        <div className="text-sm text-destructive">Inventário não encontrado.</div>
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

  const responsavel = MOCK_USUARIOS.find((u) => u.id === inventario.responsavelContagemId)
  const abertoPor = MOCK_USUARIOS.find((u) => u.id === inventario.abertoPorId)

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
            <h1 className="text-lg font-semibold">{inventario.descricaoEscopo}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Status: {inventario.status}</span>
              <span>Progresso: {progresso.contados}/{progresso.total}</span>
              <span>Responsável: {responsavel?.nome ?? inventario.responsavelContagemId}</span>
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

      {/* Search */}
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

      {/* Form error */}
      {formError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </div>
      )}

      {/* Items list */}
      <div className="flex flex-col gap-2">
        {itensFiltrados.map((item) => {
          const produto = MOCK_PRODUTOS.find((p) => p.id === item.produtoId)
          if (!produto) return null

          const statusConfig = STATUS_ITEM_CONFIG[item.status]
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

      {/* Divergências section */}
      {itensDivergentes.length > 0 && (
        <div className="rounded-md border border-warning/50 bg-warning/5 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Divergências ({itensDivergentes.length})</h3>
          <div className="flex flex-col gap-2">
            {itensDivergentes.map((item) => {
              const produto = MOCK_PRODUTOS.find((p) => p.id === item.produtoId)
              if (!produto) return null

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

      {/* Footer actions */}
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

      {/* Modal reatribuir responsável */}
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

      {/* Modal confirmar todos os ajustes */}
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

      {/* Modal finalizar */}
      <Modal open={modalFinalizarAberto} onOpenChange={setModalFinalizarAberto} title="Finalizar Inventário">
        <div className="flex flex-col gap-4">
          {avisoFinalizacao && (
            <div className="rounded-md border border-warning/50 bg-warning/5 p-3 text-sm text-warning">
              {avisoFinalizacao}
            </div>
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
