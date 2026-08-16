"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Tooltip } from "@base-ui/react/tooltip"
import { X, AlertTriangle, Info, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Produto, UnidadeMedida } from "@/types/domain"
import {
  MARCAS,
  UNIDADES,
  fracionadoPadrao,
  parsePreco,
} from "@/lib/utils/produto-utils"
import { formatBRL } from "@/lib/utils/formatters"
import { useCurrentUser } from "@/lib/auth-context"

export type SaveResult = { ok: true } | { ok: false; error: string }

type ProdutoInput = Omit<Produto, "id"> & { id?: string }

export function ProdutoDrawer({
  open,
  produto,
  onOpenChange,
  onSave,
  readonly = false,
}: {
  open: boolean
  produto: Produto | null
  onOpenChange: (open: boolean) => void
  onSave: (produto: ProdutoInput) => Promise<SaveResult>
  readonly?: boolean
}) {
  const isEdit = Boolean(produto)

  const [referencia, setReferencia] = useState("")
  const [codigoBarras, setCodigoBarras] = useState("")
  const [nome, setNome] = useState("")
  const [marca, setMarca] = useState("")
  const [unidade, setUnidade] = useState<UnidadeMedida>("UN")
  const [fracionado, setFracionado] = useState(false)
  const [preco, setPreco] = useState("")
  const [custo, setCusto] = useState("")
  const [estoqueMinimo, setEstoqueMinimo] = useState("")
  const [corredor, setCorredor] = useState("")
  const [categoria, setCategoria] = useState("")
  const [status, setStatus] = useState<Produto["status"]>("ativo")

  const [deactivateConfirm, setDeactivateConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const firstFieldRef = useRef<HTMLInputElement>(null)
  const currentUser = useCurrentUser()
  const isAdmin = currentUser.role === "ADMIN"

  // Hidrata o formulário quando o drawer abre.
  useEffect(() => {
    if (!open) return
    setReferencia(produto?.referenciaComercial ?? "")
    setCodigoBarras(produto?.codigoBarras ?? "")
    setNome(produto?.nome ?? "")
    setMarca(produto?.marca ?? "")
    setUnidade(produto?.unidadeMedida ?? "UN")
    setFracionado(produto?.permiteFracionado ?? fracionadoPadrao("UN"))
    setPreco(
      produto ? String(produto.precoVenda).replace(".", ",") : "",
    )
    setCusto(
      produto ? String(produto.custo).replace(".", ",") : "",
    )
    setEstoqueMinimo(produto ? String(produto.estoqueMinimo) : "10")
    setCorredor(produto?.corredor ?? "")
    setCategoria(produto?.categoria ?? "")
    setStatus(produto?.status ?? "ativo")
    setDeactivateConfirm(false)
    setSaving(false)
    setFormError(null)
  }, [open, produto])

  const precoNum = parsePreco(preco)
  const custoNum = parsePreco(custo)
  const estoqueMinimoNum = Number(estoqueMinimo)
  const nomeVazio = nome.trim().length === 0
  const marcaVazia = marca.trim().length === 0
  const precoInvalido = !Number.isFinite(precoNum) || precoNum <= 0
  const custoInvalido = !Number.isFinite(custoNum) || custoNum <= 0
  const estoqueMinimoInvalido = !Number.isFinite(estoqueMinimoNum) || estoqueMinimoNum < 0
  const podeSalvar =
    !nomeVazio && !marcaVazia && Boolean(unidade) && 
    (isAdmin ? (!precoInvalido && !custoInvalido) : true) && 
    !estoqueMinimoInvalido && !saving

  // Ao trocar a unidade, assume o padrão de fracionamento (sobrescrevível).
  function handleUnidadeChange(u: UnidadeMedida) {
    setUnidade(u)
    setFracionado(fracionadoPadrao(u))
  }

  function handleToggleStatus() {
    if (status === "ativo") {
      setDeactivateConfirm(true)
    } else {
      setStatus("ativo")
    }
  }

  function confirmarDesativacao() {
    setStatus("inativo")
    setDeactivateConfirm(false)
  }

  async function handleSalvar() {
    if (!podeSalvar) return
    setFormError(null)
    setSaving(true)
    const payload: ProdutoInput = {
      id: produto?.id,
      empresaId: produto?.empresaId ?? currentUser.empresaId,
      // SKU nunca é digitado: mantém o existente ou fica vazio (gerado ao salvar).
      skuInterno: produto?.skuInterno ?? "",
      referenciaComercial: referencia.trim() || undefined,
      codigoBarras: codigoBarras.trim() || undefined,
      nome: nome.trim(),
      marca: marca.trim(),
      unidadeMedida: unidade,
      permiteFracionado: fracionado,
      custo: isAdmin ? custoNum : 0,
      precoVenda: isAdmin ? precoNum : 0,
      estoqueMinimo: estoqueMinimoNum,
      corredor: corredor.trim() || undefined,
      categoria: categoria.trim() || undefined,
      status,
      estoqueAtual: produto?.estoqueAtual ?? 0, // Backend ignora este campo
    }
    const result = await onSave(payload)
    setSaving(false)
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    onOpenChange(false)
  }

  return (
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
          {/* Cabeçalho */}
          <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <Dialog.Title className="text-sm font-semibold text-foreground">
                {isEdit ? "Editar produto" : "Novo produto"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                {isEdit
                  ? "Atualize os dados do produto no catálogo."
                  : "Preencha os dados para cadastrar um novo produto."}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </Dialog.Close>
          </header>

          {/* Corpo rolável */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {/* Situação */}
            <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  Situação
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium",
                    status === "ativo"
                      ? "bg-success/12 text-success"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {status === "ativo" ? "Ativo" : "Inativo"}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={status === "ativo"}
                aria-label={
                  status === "ativo"
                    ? "Produto ativo. Desativar produto."
                    : "Produto inativo. Reativar produto."
                }
                onClick={handleToggleStatus}
                disabled={readonly}
                className={cn(
                  "relative inline-flex h-5 w-9 min-w-[36px] shrink-0 items-center rounded-full outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring/50",
                  status === "ativo" ? "bg-success" : "bg-muted-foreground/40",
                  readonly && "pointer-events-none opacity-50"
                )}
              >
                <span
                  className={cn(
                    "inline-block size-4 rounded-full bg-card shadow-sm transition-transform duration-200",
                    status === "ativo" ? "translate-x-4" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>

            {/* Confirmação leve de desativação */}
            {deactivateConfirm && (
              <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                  <p className="text-xs leading-relaxed text-foreground">
                    Desativar este produto? Ele deixará de aparecer na busca do
                    Novo Pedido.
                  </p>
                </div>
                <div className="mt-2.5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeactivateConfirm(false)}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmarDesativacao}
                    className="rounded-md bg-warning px-2.5 py-1 text-xs font-medium text-warning-foreground outline-none hover:bg-warning/90 focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    Desativar
                  </button>
                </div>
              </div>
            )}

            {/* SKU interno — somente leitura ao editar; oculto na criação */}
            {isEdit && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-foreground">
                  SKU interno
                </label>
                <div className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-muted/50 px-3">
                  <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    {produto?.skuInterno}
                  </span>
                  <span className="ml-auto text-[0.62rem] text-muted-foreground">
                    gerado pelo sistema
                  </span>
                </div>
              </div>
            )}

            {/* Nome */}
            <div className="mb-3">
              <label
                htmlFor="prd-nome"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Nome <span className="text-destructive">*</span>
              </label>
              <input
                id="prd-nome"
                ref={firstFieldRef}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Furadeira de impacto 650W"
                disabled={readonly}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed"
              />
            </div>

            {/* Marca */}
            <div className="mb-3">
              <label
                htmlFor="prd-marca"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Marca <span className="text-destructive">*</span>
              </label>
              <select
                id="prd-marca"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                disabled={readonly}
                className={cn(
                  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed",
                  marca ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <option value="">Selecione a marca…</option>
                {MARCAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Referência comercial + Código de barras */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="prd-ref"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  Referência comercial
                </label>
                <input
                  id="prd-ref"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Opcional"
                  disabled={readonly || !isAdmin}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label
                  htmlFor="prd-barras"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  Código de barras
                </label>
                <input
                  id="prd-barras"
                  inputMode="numeric"
                  value={codigoBarras}
                  onChange={(e) =>
                    setCodigoBarras(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="Opcional"
                  disabled={readonly || !isAdmin}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm tabular-nums text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Unidade de medida + Preço */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="prd-unidade"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  Unidade de medida <span className="text-destructive">*</span>
                </label>
                <select
                  id="prd-unidade"
                  value={unidade}
                  onChange={(e) =>
                    handleUnidadeChange(e.target.value as UnidadeMedida)
                  }
                  disabled={readonly || !isAdmin}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed"
                >
                  {UNIDADES.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="prd-preco"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  Preço de venda <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                    R$
                  </span>
                  <input
                    id="prd-preco"
                    inputMode="decimal"
                    value={preco}
                    onChange={(e) =>
                      setPreco(e.target.value.replace(/[^\d.,]/g, ""))
                    }
                    placeholder="0,00"
                    disabled={readonly || !isAdmin}
                    className={cn(
                      "h-9 w-full rounded-md border bg-background pr-3 pl-9 text-right font-mono text-sm tabular-nums text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
                      preco.length > 0 && precoInvalido
                        ? "border-destructive"
                        : "border-input focus-visible:border-ring",
                      readonly && "bg-muted/50 text-muted-foreground cursor-not-allowed",
                      !isAdmin && "bg-muted/50 text-muted-foreground cursor-not-allowed"
                    )}
                  />
                </div>
                {!isAdmin && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pendente de precificação — só o Admin pode definir
                  </p>
                )}
              </div>
            </div>

            {/* Custo */}
            <div className="mb-3">
              <label
                htmlFor="prd-custo"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Custo <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <input
                  id="prd-custo"
                  inputMode="decimal"
                  value={custo}
                  onChange={(e) =>
                    setCusto(e.target.value.replace(/[^\d.,]/g, ""))
                  }
                  placeholder="0,00"
                  disabled={readonly || !isAdmin}
                  className={cn(
                    "h-9 w-full rounded-md border bg-background pr-3 pl-9 text-right font-mono text-sm tabular-nums text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
                    custo.length > 0 && custoInvalido
                      ? "border-destructive"
                      : "border-input focus-visible:border-ring",
                    readonly && "bg-muted/50 text-muted-foreground cursor-not-allowed",
                    !isAdmin && "bg-muted/50 text-muted-foreground cursor-not-allowed"
                  )}
                />
                {!isAdmin && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pendente de precificação — só o Admin pode definir
                  </p>
                )}
              </div>
            </div>

            {/* Estoque mínimo */}
            <div className="mb-3">
              <label
                htmlFor="prd-estoque-minimo"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Estoque mínimo <span className="text-destructive">*</span>
              </label>
              <input
                id="prd-estoque-minimo"
                inputMode="numeric"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(e.target.value.replace(/\D/g, ""))}
                placeholder="10"
                disabled={readonly}
                className={cn(
                  "h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
                  estoqueMinimo.length > 0 && estoqueMinimoInvalido
                    ? "border-destructive"
                    : "border-input focus-visible:border-ring",
                  readonly && "bg-muted/50 text-muted-foreground cursor-not-allowed"
                )}
              />
            </div>

            {/* Corredor + Categoria */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="prd-corredor"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  Corredor
                </label>
                <input
                  id="prd-corredor"
                  value={corredor}
                  onChange={(e) => setCorredor(e.target.value)}
                  placeholder="Ex: A1"
                  disabled={readonly}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label
                  htmlFor="prd-categoria"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  Categoria
                </label>
                <input
                  id="prd-categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Ex: Disjuntores"
                  disabled={readonly}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Permite fracionado */}
            <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Permite fracionado
                </p>
                <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
                  Venda em quantidades quebradas (ex.: 1,5 {unidade}).
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={fracionado}
                aria-label={
                  fracionado
                    ? "Fracionamento permitido. Desativar."
                    : "Fracionamento desativado. Ativar."
                }
                onClick={() => setFracionado((v) => !v)}
                disabled={readonly}
                className={cn(
                  "relative inline-flex h-5 w-9 min-w-[36px] shrink-0 items-center rounded-full outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring/50",
                  fracionado ? "bg-primary" : "bg-muted-foreground/40",
                  readonly && "pointer-events-none opacity-50"
                )}
              >
                <span
                  className={cn(
                    "inline-block size-4 rounded-full bg-card shadow-sm transition-transform duration-200",
                    fracionado ? "translate-x-4" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>

            {/* Estoque atual — somente ao editar, somente leitura, com tooltip */}
            {isEdit && (
              <div className="mb-1">
                <div className="mb-1 flex items-center gap-1.5">
                  <label className="block text-xs font-medium text-foreground">
                    Estoque atual
                  </label>
                  <Tooltip.Provider>
                    <Tooltip.Root>
                      <Tooltip.Trigger
                        render={
                          <button
                            type="button"
                            aria-label="Sobre o estoque atual"
                            className="flex size-4 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                          />
                        }
                      >
                        <Info className="size-3.5" />
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Positioner side="top" sideOffset={6} className="z-[60]">
                          <Tooltip.Popup className="max-w-56 origin-[var(--transform-origin)] rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs leading-relaxed text-popover-foreground shadow-lg shadow-black/15 transition-[transform,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
                            Saldo físico do depósito — gerencie movimentações na
                            tela Estoque.
                          </Tooltip.Popup>
                        </Tooltip.Positioner>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </div>
                <div className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-muted/50 px-3">
                  <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    {produto?.estoqueAtual ?? 0} {unidade}
                  </span>
                  <span className="ml-auto text-[0.62rem] text-muted-foreground">
                    somente leitura
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Rodapé */}
          <footer className="border-t border-border px-4 py-3">
            {formError && (
              <div className="mb-2.5 flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <p className="text-xs leading-relaxed text-destructive">
                  {formError}
                </p>
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <Dialog.Close className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50">
                {readonly ? "Fechar" : "Cancelar"}
              </Dialog.Close>
              {!readonly && (
                <button
                  type="button"
                  onClick={handleSalvar}
                  disabled={!podeSalvar}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                >
                  {saving && (
                    <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                  )}
                  {saving ? "Salvando…" : "Salvar"}
                </button>
              )}
            </div>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
