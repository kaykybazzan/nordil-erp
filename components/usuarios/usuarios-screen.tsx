"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Search, Plus, UserCog, Pencil, X } from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"
import type { FuncaoUsuario, PapelUsuario, Usuario } from "@/types/domain"

const ROLES: PapelUsuario[] = ["ADMIN", "SUPERVISOR", "OPERADOR"]
const FUNCOES: FuncaoUsuario[] = ["VENDAS", "ESTOQUE", "SEPARACAO", "CONFERENCIA", "EXPEDICAO", "ADMINISTRATIVO"]

const ROLE_LABEL: Record<PapelUsuario, string> = {
  ADMIN: "Admin",
  SUPERVISOR: "Supervisor",
  OPERADOR: "Operador",
}
const ROLE_COLOR: Record<PapelUsuario, string> = {
  ADMIN: "text-destructive bg-destructive/10",
  SUPERVISOR: "text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10",
  OPERADOR: "text-primary bg-primary/10",
}
const FUNCAO_LABEL: Record<FuncaoUsuario, string> = {
  VENDAS: "Vendas",
  ESTOQUE: "Estoque",
  SEPARACAO: "Separação",
  CONFERENCIA: "Conferência",
  EXPEDICAO: "Expedição",
  ADMINISTRATIVO: "Administrativo",
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("")
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}

const EMPTY_FORM = { nome: "", email: "", role: "OPERADOR" as PapelUsuario, funcao: "VENDAS" as FuncaoUsuario }

export function UsuariosScreen() {
  const [loading, setLoading] = useState(true)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [busca, setBusca] = useState("")
  const [buscaDebounced, setBuscaDebounced] = useState("")
  const [filtroRole, setFiltroRole] = useState<PapelUsuario | "todos">("todos")
  const [filtroFuncao, setFiltroFuncao] = useState<FuncaoUsuario | "todos">("todos")
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const debounceTimer = useRef<number | null>(null)

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setUsuarios([...MOCK_USUARIOS])
      setLoading(false)
    }, 700)
    return () => clearTimeout(t)
  }, [])

  const handleBusca = useCallback((value: string) => {
    setBusca(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = window.setTimeout(() => setBuscaDebounced(value), 300)
  }, [])

  const filtrados = useMemo(() => {
    const q = buscaDebounced.toLowerCase()
    return usuarios.filter((u) => {
      const matchBusca = !q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      const matchRole = filtroRole === "todos" || u.role === filtroRole
      const matchFuncao = filtroFuncao === "todos" || u.funcao === filtroFuncao
      return matchBusca && matchRole && matchFuncao
    })
  }, [usuarios, buscaDebounced, filtroRole, filtroFuncao])

  function abrirNovo() {
    setForm(EMPTY_FORM)
    setFormErrors({})
    setEditandoId(null)
    setModalAberto(true)
  }

  function abrirEdicao(usuario: Usuario) {
    setForm({ nome: usuario.nome, email: usuario.email, role: usuario.role, funcao: usuario.funcao })
    setFormErrors({})
    setEditandoId(usuario.id)
    setModalAberto(true)
  }

  function validar(): boolean {
    const errs: Record<string, string> = {}
    if (!form.nome.trim()) errs.nome = "Nome obrigatório."
    if (!form.email.trim() || !form.email.includes("@")) errs.email = "E-mail inválido."
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  function salvar() {
    if (!validar()) return
    if (editandoId) {
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === editandoId
            ? { ...u, nome: form.nome, email: form.email, role: form.role, funcao: form.funcao }
            : u,
        ),
      )
      showToast("Usuário atualizado com sucesso.")
    } else {
      const novo: Usuario = {
        id: `usr-${Date.now()}`,
        nome: form.nome,
        email: form.email,
        empresaId: "emp-001",
        role: form.role,
        funcao: form.funcao,
      }
      setUsuarios((prev) => [novo, ...prev])
      showToast("Usuário criado com sucesso.")
    }
    setModalAberto(false)
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex gap-3">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      {/* Barra de ações */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={busca}
            onChange={(e) => handleBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <select
          value={filtroRole}
          onChange={(e) => setFiltroRole(e.target.value as PapelUsuario | "todos")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="todos">Todos os papéis</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>

        <select
          value={filtroFuncao}
          onChange={(e) => setFiltroFuncao(e.target.value as FuncaoUsuario | "todos")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="todos">Todas as funções</option>
          {FUNCOES.map((f) => <option key={f} value={f}>{FUNCAO_LABEL[f]}</option>)}
        </select>

        <button
          type="button"
          onClick={abrirNovo}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Novo usuário
        </button>
      </div>

      {/* Tabela */}
      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <UserCog className="h-10 w-10 text-muted-foreground" />
          <p className="text-base font-medium text-foreground">Nenhum usuário encontrado</p>
          <p className="text-sm text-muted-foreground">Ajuste os filtros ou crie um novo usuário.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Usuário</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">E-mail</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Papel</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Função</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                        {initials(u.nome)}
                      </span>
                      <span className="font-medium text-foreground">{u.nome}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-3 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", ROLE_COLOR[u.role])}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{FUNCAO_LABEL[u.funcao]}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(u)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Novo/Editar */}
      <Dialog.Root open={modalAberto} onOpenChange={setModalAberto}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <Dialog.Title className="text-base font-semibold text-foreground">
                {editandoId ? "Editar usuário" : "Novo usuário"}
              </Dialog.Title>
              <Dialog.Close className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  Nome completo <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex.: João da Silva"
                  className={cn(
                    "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40",
                    formErrors.nome ? "border-destructive" : "border-border",
                  )}
                />
                {formErrors.nome && <p className="mt-1 text-xs text-destructive">{formErrors.nome}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  E-mail <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="usuario@nordil.com"
                  className={cn(
                    "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40",
                    formErrors.email ? "border-destructive" : "border-border",
                  )}
                />
                {formErrors.email && <p className="mt-1 text-xs text-destructive">{formErrors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Papel</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as PapelUsuario }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Função</label>
                  <select
                    value={form.funcao}
                    onChange={(e) => setForm((f) => ({ ...f, funcao: e.target.value as FuncaoUsuario }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {FUNCOES.map((f) => <option key={f} value={f}>{FUNCAO_LABEL[f]}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                Cancelar
              </Dialog.Close>
              <button
                type="button"
                onClick={salvar}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {editandoId ? "Salvar alterações" : "Criar usuário"}
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {toast && (
        <div className="pointer-events-none fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
