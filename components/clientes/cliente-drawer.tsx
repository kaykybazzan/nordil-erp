"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import {
  X,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  Check,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Cliente, Endereco } from "@/types/domain"
import {
  UFS,
  formatCep,
  formatDocumento,
  novoEnderecoVazio,
  onlyDigits,
  tipoDocumento,
} from "@/lib/utils/cliente-utils"
import { useCurrentUser } from "@/lib/auth-context"

export type SaveResult = { ok: true } | { ok: false; error: string }

type DraftEndereco = Endereco

function enderecoValido(e: DraftEndereco): boolean {
  return Boolean(
    e.logradouro.trim() &&
      e.numero.trim() &&
      e.bairro.trim() &&
      e.cidade.trim() &&
      e.uf.trim() &&
      onlyDigits(e.cep).length === 8,
  )
}

export function ClienteDrawer({
  open,
  cliente,
  onOpenChange,
  onSave,
}: {
  open: boolean
  cliente: Cliente | null
  onOpenChange: (open: boolean) => void
  onSave: (cliente: Omit<Cliente, "id"> & { id?: string }) => Promise<SaveResult>
}) {
  const isEdit = Boolean(cliente)
  const currentUser = useCurrentUser()

  const [nome, setNome] = useState("")
  const [documento, setDocumento] = useState("")
  const [status, setStatus] = useState<Cliente["status"]>("ativo")
  const [enderecos, setEnderecos] = useState<DraftEndereco[]>([])

  const [blockConfirm, setBlockConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Endereço inline form: null = fechado; string = id em edição; "new" = novo
  const [addrFormId, setAddrFormId] = useState<string | null>(null)
  const [addrDraft, setAddrDraft] = useState<DraftEndereco | null>(null)
  const [addrTouched, setAddrTouched] = useState(false)
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null)

  const firstFieldRef = useRef<HTMLInputElement>(null)

  // Hidrata o formulário quando o drawer abre.
  useEffect(() => {
    if (!open) return
    setNome(cliente?.nome ?? "")
    setDocumento(cliente?.documento ?? "")
    setStatus(cliente?.status ?? "ativo")
    setEnderecos(cliente?.enderecos.map((e) => ({ ...e })) ?? [])
    setBlockConfirm(false)
    setSaving(false)
    setFormError(null)
    setAddrFormId(null)
    setAddrDraft(null)
    setAddrTouched(false)
    setRemoveConfirmId(null)
  }, [open, cliente])

  const nomeVazio = nome.trim().length === 0
  const docVazio = onlyDigits(documento).length === 0
  const podeSalvar = !nomeVazio && !docVazio && !saving

  const docTipo = useMemo(
    () => (docVazio ? null : tipoDocumento(documento)),
    [documento, docVazio],
  )

  function handleToggleStatus() {
    if (status === "ativo") {
      // Bloquear exige confirmação leve.
      setBlockConfirm(true)
    } else {
      // Desbloquear é imediato.
      setStatus("ativo")
    }
  }

  function confirmarBloqueio() {
    setStatus("bloqueado")
    setBlockConfirm(false)
  }

  function abrirNovoEndereco() {
    const vazio = novoEnderecoVazio()
    // Se for o primeiro endereço, já marca como principal.
    vazio.principal = enderecos.length === 0
    setAddrDraft(vazio)
    setAddrFormId("new")
    setAddrTouched(false)
  }

  function abrirEdicaoEndereco(e: DraftEndereco) {
    setAddrDraft({ ...e })
    setAddrFormId(e.id)
    setAddrTouched(false)
  }

  function cancelarEndereco() {
    setAddrFormId(null)
    setAddrDraft(null)
    setAddrTouched(false)
  }

  function salvarEndereco() {
    if (!addrDraft) return
    setAddrTouched(true)
    if (!enderecoValido(addrDraft)) return
    const normalizado: DraftEndereco = {
      ...addrDraft,
      cep: formatCep(addrDraft.cep),
      uf: addrDraft.uf.toUpperCase(),
    }
    setEnderecos((prev) => {
      const existe = prev.some((e) => e.id === normalizado.id)
      let next = existe
        ? prev.map((e) => (e.id === normalizado.id ? normalizado : e))
        : [...prev, normalizado]
      // Garante exatamente um principal.
      if (normalizado.principal) {
        next = next.map((e) =>
          e.id === normalizado.id ? e : { ...e, principal: false },
        )
      } else if (!next.some((e) => e.principal) && next.length > 0) {
        next = next.map((e, i) => (i === 0 ? { ...e, principal: true } : e))
      }
      return next
    })
    cancelarEndereco()
  }

  function marcarPrincipal(id: string) {
    setEnderecos((prev) =>
      prev.map((e) => ({ ...e, principal: e.id === id })),
    )
  }

  function removerEndereco(id: string) {
    setEnderecos((prev) => {
      const next = prev.filter((e) => e.id !== id)
      // Se removeu o principal, promove o primeiro restante.
      if (next.length > 0 && !next.some((e) => e.principal)) {
        next[0] = { ...next[0], principal: true }
      }
      return next
    })
    setRemoveConfirmId(null)
  }

  async function handleSalvar() {
    if (!podeSalvar) return
    setFormError(null)
    setSaving(true)
    const payload: Omit<Cliente, "id"> & { id?: string } = {
      id: cliente?.id, // undefined para criação
      empresaId: cliente?.empresaId ?? currentUser.empresaId,
      nome: nome.trim(),
      documento: formatDocumento(documento),
      status,
      enderecos,
      dataCadastro: cliente?.dataCadastro ?? new Date().toISOString(),
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
                {isEdit ? "Editar cliente" : "Novo cliente"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                {isEdit
                  ? "Atualize os dados e endereços do cliente."
                  : "Preencha os dados para cadastrar um novo cliente."}
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
            {/* Status toggle */}
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
                      : "bg-destructive/12 text-destructive",
                  )}
                >
                  {status === "ativo" ? "Ativo" : "Bloqueado"}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={status === "ativo"}
                aria-label={
                  status === "ativo"
                    ? "Cliente ativo. Bloquear cliente."
                    : "Cliente bloqueado. Reativar cliente."
                }
                onClick={handleToggleStatus}
                className={cn(
                  "relative inline-flex h-5 w-9 min-w-[36px] shrink-0 items-center rounded-full outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring/50",
                  status === "ativo" ? "bg-success" : "bg-muted-foreground/40",
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

            {/* Confirmação leve de bloqueio */}
            {blockConfirm && (
              <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                  <p className="text-xs leading-relaxed text-foreground">
                    Bloquear este cliente? Novos pedidos não poderão ser criados
                    para ele.
                  </p>
                </div>
                <div className="mt-2.5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setBlockConfirm(false)}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmarBloqueio}
                    className="rounded-md bg-destructive px-2.5 py-1 text-xs font-medium text-destructive-foreground outline-none hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    Bloquear
                  </button>
                </div>
              </div>
            )}

            {/* Nome */}
            <div className="mb-3">
              <label
                htmlFor="cli-nome"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Nome / Razão social <span className="text-destructive">*</span>
              </label>
              <input
                id="cli-nome"
                ref={firstFieldRef}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Metalúrgica Sul Ltda"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>

            {/* Documento */}
            <div className="mb-5">
              <label
                htmlFor="cli-doc"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Documento (CPF ou CNPJ){" "}
                <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  id="cli-doc"
                  inputMode="numeric"
                  value={documento}
                  onChange={(e) => setDocumento(formatDocumento(e.target.value))}
                  placeholder="000.000.000-00"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 pr-14 font-mono text-sm tabular-nums text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                {docTipo && (
                  <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded bg-accent px-1.5 py-0.5 text-[0.62rem] font-semibold text-accent-foreground">
                    {docTipo}
                  </span>
                )}
              </div>
            </div>

            {/* Endereços */}
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wide text-foreground uppercase">
                Endereços de entrega
              </h3>
              <span className="font-mono text-xs text-muted-foreground">
                {enderecos.length}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {enderecos.length === 0 && addrFormId !== "new" && (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  Nenhum endereço adicionado.
                </p>
              )}

              {enderecos.map((e) =>
                addrFormId === e.id ? (
                  <EnderecoForm
                    key={e.id}
                    draft={addrDraft!}
                    touched={addrTouched}
                    isOnly={enderecos.length === 1}
                    onChange={setAddrDraft}
                    onCancel={cancelarEndereco}
                    onSave={salvarEndereco}
                  />
                ) : (
                  <div
                    key={e.id}
                    className="rounded-md border border-border bg-background p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 gap-2">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 text-xs leading-relaxed">
                          <p className="font-medium text-foreground">
                            {e.logradouro}, {e.numero}
                            {e.principal && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded bg-info/12 px-1.5 py-0.5 align-middle text-[0.62rem] font-semibold text-info">
                                <Star className="size-2.5 fill-current" />
                                Principal
                              </span>
                            )}
                          </p>
                          <p className="text-muted-foreground">
                            {e.bairro} — {e.cidade}/{e.uf}
                          </p>
                          <p className="font-mono text-muted-foreground tabular-nums">
                            CEP {e.cep}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => abrirEdicaoEndereco(e)}
                          aria-label="Editar endereço"
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemoveConfirmId(e.id)}
                          disabled={enderecos.length === 1}
                          aria-label={
                            enderecos.length === 1
                              ? "Não é possível remover o único endereço"
                              : "Remover endereço"
                          }
                          title={
                            enderecos.length === 1
                              ? "O cliente precisa de ao menos um endereço"
                              : undefined
                          }
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {removeConfirmId === e.id && (
                      <div className="mt-2 flex items-center justify-between gap-2 rounded border border-border bg-muted/50 px-2.5 py-1.5">
                        <span className="text-xs text-foreground">
                          Remover este endereço?
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setRemoveConfirmId(null)}
                            className="rounded px-2 py-0.5 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => removerEndereco(e.id)}
                            className="rounded bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground outline-none hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-ring/50"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    )}

                    {!e.principal && removeConfirmId !== e.id && (
                      <button
                        type="button"
                        onClick={() => marcarPrincipal(e.id)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-info outline-none hover:bg-info/10 focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <Star className="size-3" />
                        Marcar como principal
                      </button>
                    )}
                  </div>
                ),
              )}

              {addrFormId === "new" && addrDraft && (
                <EnderecoForm
                  draft={addrDraft}
                  touched={addrTouched}
                  isOnly={enderecos.length === 0}
                  onChange={setAddrDraft}
                  onCancel={cancelarEndereco}
                  onSave={salvarEndereco}
                />
              )}

              {addrFormId === null && (
                <button
                  type="button"
                  onClick={abrirNovoEndereco}
                  className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-xs font-medium text-foreground outline-none hover:border-primary/50 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <Plus className="size-4" />
                  Adicionar endereço
                </button>
              )}
            </div>
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
                Cancelar
              </Dialog.Close>
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
            </div>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function EnderecoForm({
  draft,
  touched,
  isOnly,
  onChange,
  onCancel,
  onSave,
}: {
  draft: DraftEndereco
  touched: boolean
  isOnly: boolean
  onChange: (e: DraftEndereco) => void
  onCancel: () => void
  onSave: () => void
}) {
  function set<K extends keyof DraftEndereco>(key: K, value: DraftEndereco[K]) {
    onChange({ ...draft, [key]: value })
  }

  const errCep = touched && onlyDigits(draft.cep).length !== 8
  const missing = (v: string) => touched && v.trim().length === 0

  const fieldBase =
    "h-8 w-full rounded-md border bg-background px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"

  return (
    <div className="rounded-md border border-primary/40 bg-accent/40 p-3">
      <p className="mb-2 text-xs font-semibold text-foreground">
        {"Dados do endereço"}
      </p>
      <div className="grid grid-cols-6 gap-2">
        <div className="col-span-4">
          <label className="mb-1 block text-[0.68rem] font-medium text-muted-foreground">
            Logradouro
          </label>
          <input
            value={draft.logradouro}
            onChange={(e) => set("logradouro", e.target.value)}
            className={cn(
              fieldBase,
              missing(draft.logradouro) ? "border-destructive" : "border-input",
            )}
            placeholder="Rua / Avenida"
          />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-[0.68rem] font-medium text-muted-foreground">
            Número
          </label>
          <input
            value={draft.numero}
            onChange={(e) => set("numero", e.target.value)}
            className={cn(
              fieldBase,
              missing(draft.numero) ? "border-destructive" : "border-input",
            )}
            placeholder="Nº"
          />
        </div>
        <div className="col-span-3">
          <label className="mb-1 block text-[0.68rem] font-medium text-muted-foreground">
            Bairro
          </label>
          <input
            value={draft.bairro}
            onChange={(e) => set("bairro", e.target.value)}
            className={cn(
              fieldBase,
              missing(draft.bairro) ? "border-destructive" : "border-input",
            )}
            placeholder="Bairro"
          />
        </div>
        <div className="col-span-3">
          <label className="mb-1 block text-[0.68rem] font-medium text-muted-foreground">
            Cidade
          </label>
          <input
            value={draft.cidade}
            onChange={(e) => set("cidade", e.target.value)}
            className={cn(
              fieldBase,
              missing(draft.cidade) ? "border-destructive" : "border-input",
            )}
            placeholder="Cidade"
          />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-[0.68rem] font-medium text-muted-foreground">
            UF
          </label>
          <select
            value={draft.uf}
            onChange={(e) => set("uf", e.target.value)}
            className={cn(
              fieldBase,
              "px-2",
              missing(draft.uf) ? "border-destructive" : "border-input",
            )}
          >
            <option value="">—</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-4">
          <label className="mb-1 block text-[0.68rem] font-medium text-muted-foreground">
            CEP
          </label>
          <input
            inputMode="numeric"
            value={draft.cep}
            onChange={(e) => set("cep", formatCep(e.target.value))}
            className={cn(
              fieldBase,
              "font-mono tabular-nums",
              errCep ? "border-destructive" : "border-input",
            )}
            placeholder="00000-000"
          />
        </div>
      </div>

      <label className="mt-2.5 flex items-center gap-2 text-xs text-foreground">
        <input
          type="checkbox"
          checked={draft.principal}
          disabled={isOnly}
          onChange={(e) => set("principal", e.target.checked)}
          className="size-3.5 accent-primary disabled:opacity-50"
        />
        Endereço principal
        {isOnly && (
          <span className="text-muted-foreground">(único endereço)</span>
        )}
      </label>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Check className="size-3.5" />
          Salvar endereço
        </button>
      </div>
    </div>
  )
}
