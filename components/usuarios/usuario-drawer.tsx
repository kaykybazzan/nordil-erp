"use client"

import { useEffect, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Button } from "@/components/ui/button"
import type { Usuario, PapelUsuario, FuncaoUsuario } from "@/types/domain"

const ROLE_OPTIONS: { value: PapelUsuario; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "OPERADOR", label: "Operador" },
]

const FUNCAO_OPTIONS: { value: FuncaoUsuario; label: string }[] = [
  { value: "VENDAS", label: "Vendas" },
  { value: "ESTOQUE", label: "Estoque" },
  { value: "SEPARACAO", label: "Separação" },
  { value: "CONFERENCIA", label: "Conferência" },
  { value: "EXPEDICAO", label: "Expedição" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface UsuarioDrawerProps {
  usuario: Usuario | null // null = modo criação
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    dados: Omit<Usuario, "id" | "empresaId">,
    usuarioId?: string,
  ) => { ok: true } | { ok: false; error: string }
}

function emptyForm() {
  return {
    nome: "",
    email: "",
    senha: "",
    precisaTrocarSenha: false,
    cargo: "",
    role: "OPERADOR" as PapelUsuario,
    funcao: "VENDAS" as FuncaoUsuario,
    status: "ativo" as "ativo" | "inativo",
  }
}

export function UsuarioDrawer({ usuario, open, onOpenChange, onSave }: UsuarioDrawerProps) {
  const isEdicao = usuario !== null
  const [form, setForm] = useState(emptyForm())
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setErro(null)
      setForm(
        usuario
          ? {
              nome: usuario.nome,
              email: usuario.email,
              senha: usuario.senha,
              precisaTrocarSenha: usuario.precisaTrocarSenha,
              cargo: usuario.cargo ?? "",
              role: usuario.role,
              funcao: usuario.funcao,
              status: usuario.status,
            }
          : emptyForm(),
      )
    }
  }, [open, usuario])

  function handleSubmit() {
    setErro(null)

    if (!form.nome.trim()) {
      setErro("Nome é obrigatório.")
      return
    }
    if (!EMAIL_REGEX.test(form.email.trim())) {
      setErro("E-mail inválido.")
      return
    }

    const resultado = onSave(
      {
        nome: form.nome.trim(),
        email: form.email.trim(),
        senha: form.senha,
        precisaTrocarSenha: form.precisaTrocarSenha,
        cargo: form.cargo.trim() || undefined,
        role: form.role,
        funcao: form.funcao,
        status: isEdicao ? form.status : "ativo",
      },
      usuario?.id,
    )

    if (!resultado.ok) {
      setErro(resultado.error)
      return
    }

    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40" />
        <Dialog.Popup className="fixed inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-background p-6 shadow-lg outline-none">
          <Dialog.Title className="text-lg font-semibold">
            {isEdicao ? "Editar usuário" : "Novo usuário"}
          </Dialog.Title>

          <div className="mt-6 flex flex-1 flex-col gap-4 overflow-y-auto">
            <label className="flex flex-col gap-1 text-sm">
              Nome
              <input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              E-mail
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Cargo <span className="text-muted-foreground">(opcional)</span>
              <input
                value={form.cargo}
                onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Role
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as PapelUsuario }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Função
              <select
                value={form.funcao}
                onChange={(e) => setForm((f) => ({ ...f, funcao: e.target.value as FuncaoUsuario }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {FUNCAO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {isEdicao && (
              <label className="flex flex-col gap-1 text-sm">
                Status
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "ativo" | "inativo" }))}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </label>
            )}

            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSubmit}>
              Salvar
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}