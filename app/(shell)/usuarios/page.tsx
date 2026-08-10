"use client"

import { useMemo, useState, useEffect } from "react"
import { useCurrentUser } from "@/lib/auth-context"
import { useUsuariosStore } from "@/lib/usuarios-store"
import { DataTable, type DataTableColumn, type DataTableSort } from "@/components/ui/data-table"
import { UsuarioStatusBadge } from "@/components/status-badges"
import { Button } from "@/components/ui/button"
import { UsuarioDrawer } from "@/components/usuarios/usuario-drawer"
import { AlternarStatusDialog } from "@/components/usuarios/alternar-status-dialog"
import { emailDuplicado } from "@/lib/usuarios"
import { actionRegistrarAuditoria } from "@/lib/actions/auditoria"
import type { Usuario, PapelUsuario, FuncaoUsuario } from "@/types/domain"
import { useToast } from "@/components/ui/simple-toast"
import { Dialog } from "@base-ui/react/dialog"
import { Copy, Check } from "lucide-react"
import { RowActionsMenu } from "@/components/ui/row-actions-menu"

const PAGE_SIZE = 30

const ROLE_FILTROS: { value: PapelUsuario; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "OPERADOR", label: "Operador" },
]

const FUNCAO_FILTROS: { value: FuncaoUsuario; label: string }[] = [
  { value: "VENDAS", label: "Vendas" },
  { value: "ESTOQUE", label: "Estoque" },
  { value: "SEPARACAO", label: "Separação" },
  { value: "CONFERENCIA", label: "Conferência" },
  { value: "EXPEDICAO", label: "Expedição" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
]

const ROLE_LABEL: Record<PapelUsuario, string> = {
  ADMIN: "Admin",
  SUPERVISOR: "Supervisor",
  OPERADOR: "Operador",
}

const FUNCAO_LABEL: Record<FuncaoUsuario, string> = {
  VENDAS: "Vendas",
  ESTOQUE: "Estoque",
  SEPARACAO: "Separação",
  CONFERENCIA: "Conferência",
  EXPEDICAO: "Expedição",
  ADMINISTRATIVO: "Administrativo",
}

export default function UsuariosPage() {
  const currentUser = useCurrentUser()
  const { showToast, Toaster } = useToast()

  const { usuarios, carregando, carregarUsuarios, criarUsuario, atualizarUsuario, alternarStatus } =
    useUsuariosStore()

  useEffect(() => {
    carregarUsuarios()
  }, [carregarUsuarios])
  const [buscaInput, setBuscaInput] = useState("")
  const [busca, setBusca] = useState("")
  const [roleFiltro, setRoleFiltro] = useState<Set<PapelUsuario>>(new Set())
  const [funcaoFiltro, setFuncaoFiltro] = useState<Set<FuncaoUsuario>>(new Set())
  const [statusFiltro, setStatusFiltro] = useState<Set<"ativo" | "inativo">>(new Set())
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [sort, setSort] = useState<DataTableSort>({ columnId: "nome", direction: "asc" })

  const [drawerAberto, setDrawerAberto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)
  const [usuarioParaAlternar, setUsuarioParaAlternar] = useState<Usuario | null>(null)
  const [senhaTemporaria, setSenhaTemporaria] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setBusca(buscaInput)
      setVisibleCount(PAGE_SIZE)
    }, 300)
    return () => clearTimeout(timer)
  }, [buscaInput])

  function toggleSetValue<T>(set: Set<T>, value: T, setter: (next: Set<T>) => void) {
    const next = new Set(set)
    next.has(value) ? next.delete(value) : next.add(value)
    setter(next)
    setVisibleCount(PAGE_SIZE)
  }

  const filtrados = useMemo(() => {
    let result = usuarios

    if (roleFiltro.size > 0) result = result.filter((u) => roleFiltro.has(u.role))
    if (funcaoFiltro.size > 0) result = result.filter((u) => funcaoFiltro.has(u.funcao))
    if (statusFiltro.size > 0) result = result.filter((u) => statusFiltro.has(u.status))

    const termo = busca.trim().toLowerCase()
    if (termo) {
      result = result.filter(
        (u) => u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo),
      )
    }

    const dir = sort.direction === "asc" ? 1 : -1
    return [...result].sort((a, b) => {
      switch (sort.columnId) {
        case "email":
          return a.email.localeCompare(b.email) * dir
        case "nome":
        default:
          return a.nome.localeCompare(b.nome) * dir
      }
    })
  }, [usuarios, roleFiltro, funcaoFiltro, statusFiltro, busca, sort])

  const visiveis = filtrados.slice(0, visibleCount)
  const hasMore = filtrados.length > visibleCount

  function handleSortChange(columnId: string) {
    setSort((prev) =>
      prev.columnId === columnId
        ? { columnId, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { columnId, direction: "asc" },
    )
  }

  async function handleSalvar(
    dados: Omit<Usuario, "id" | "empresaId">,
    usuarioId?: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (emailDuplicado(usuarios, dados.email, usuarioId)) {
      return { ok: false, error: "Já existe um usuário com esse e-mail." }
    }

    if (usuarioId) {
      const result = await atualizarUsuario(usuarioId, dados)
      if (!result.ok) return result
      showToast("Usuário atualizado.", "success")
      return { ok: true }
    }

    const result = await criarUsuario(dados)
    if (!result.ok) return result

    setSenhaTemporaria(result.senhaTemporaria)
    setCopiado(false)
    return { ok: true }
  }

  function handleCopiarSenha() {
    if (senhaTemporaria) {
      navigator.clipboard.writeText(senhaTemporaria)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  function handleCloseSenhaModal() {
    setSenhaTemporaria(null)
    setCopiado(false)
  }

  async function handleConfirmarAlternarStatus(usuarioId: string) {
    const alvo = usuarios.find((u) => u.id === usuarioId)
    if (!alvo) return

    const result = await alternarStatus(alvo)
    if (!result.ok) {
      showToast(result.error, "error")
      setUsuarioParaAlternar(null)
      return
    }

    showToast(alvo.status === "ativo" ? "Usuário inativado." : "Usuário ativado.", "success")
    setUsuarioParaAlternar(null)
  }

  const columns: DataTableColumn<Usuario>[] = [
    { id: "nome", header: "Nome", cell: (u) => u.nome, sortable: true },
    { id: "email", header: "E-mail", cell: (u) => u.email, sortable: true, hideOnTablet: true },
    { id: "cargo", header: "Cargo", cell: (u) => u.cargo ?? "—", hideOnTablet: true },
    { id: "role", header: "Role", cell: (u) => ROLE_LABEL[u.role] },
    { id: "funcao", header: "Função", cell: (u) => FUNCAO_LABEL[u.funcao], hideOnTablet: true },
    { id: "status", header: "Status", cell: (u) => <UsuarioStatusBadge status={u.status} /> },
    {
      id: "acoes",
      header: "",
      cell: (u) => (
        <div className="flex justify-end">
          <RowActionsMenu
            actions={[
              {
                label: "Editar",
                onSelect: () => {
                  setUsuarioEditando(u)
                  setDrawerAberto(true)
                },
              },
              {
                label: u.status === "ativo" ? "Inativar" : "Ativar",
                onSelect: () => setUsuarioParaAlternar(u),
                destructive: u.status === "ativo",
              },
            ]}
          />
        </div>
      ),
    },
  ]

  // Guarda de acesso — depois de todos os hooks, pra não quebrar a ordem
  // de hooks entre renders. Só ADMIN gerencia usuários.
  if (currentUser.role !== "ADMIN") {
    return (
      <div className="flex flex-col gap-4 p-6">
        <h1 className="text-lg font-semibold">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para acessar esta área.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Usuários</h1>
        <Button
          size="sm"
          onClick={() => {
            setUsuarioEditando(null)
            setDrawerAberto(true)
          }}
        >
          Novo usuário
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={buscaInput}
          onChange={(e) => setBuscaInput(e.target.value)}
          placeholder="Buscar por nome ou e-mail…"
          className="h-8 w-64 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        <div className="hidden h-5 w-px bg-border sm:block" aria-hidden />

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
            Papel
          </span>
          <div className="flex flex-wrap gap-1">
            {ROLE_FILTROS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleSetValue(roleFiltro, opt.value, setRoleFiltro)}
                className={
                  "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors " +
                  (roleFiltro.has(opt.value)
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden h-5 w-px bg-border sm:block" aria-hidden />

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
            Função
          </span>
          <div className="flex flex-wrap gap-1">
            {FUNCAO_FILTROS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleSetValue(funcaoFiltro, opt.value, setFuncaoFiltro)}
                className={
                  "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors " +
                  (funcaoFiltro.has(opt.value)
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden h-5 w-px bg-border sm:block" aria-hidden />

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </span>
          <div className="flex flex-wrap gap-1">
            {(["ativo", "inativo"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleSetValue(statusFiltro, value, setStatusFiltro)}
                className={
                  "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors " +
                  (statusFiltro.has(value)
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground")
                }
              >
                {value === "ativo" ? "Ativo" : "Inativo"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={visiveis}
        getRowId={(u) => u.id}
        onRowClick={(u) => {
          setUsuarioEditando(u)
          setDrawerAberto(true)
        }}
        emptyState={
          busca || roleFiltro.size > 0 || funcaoFiltro.size > 0 || statusFiltro.size > 0
            ? "Nenhum usuário encontrado com esse filtro."
            : "Nenhum usuário cadastrado ainda."
        }
        hasMore={hasMore}
        onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)}
        sort={sort}
        onSortChange={handleSortChange}
      />

      <UsuarioDrawer
        usuario={usuarioEditando}
        open={drawerAberto}
        onOpenChange={setDrawerAberto}
        onSave={handleSalvar}
      />

      <AlternarStatusDialog
        usuario={usuarioParaAlternar}
        onOpenChange={(open) => {
          if (!open) setUsuarioParaAlternar(null)
        }}
        onConfirm={handleConfirmarAlternarStatus}
      />

      <Dialog.Root open={senhaTemporaria !== null} onOpenChange={(open) => !open && handleCloseSenhaModal()}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/40" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg outline-none">
            <Dialog.Title className="text-lg font-semibold">Usuário criado</Dialog.Title>
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Senha temporária gerada:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-sm font-mono">
                  {senhaTemporaria}
                </code>
                <button
                  type="button"
                  onClick={handleCopiarSenha}
                  className="rounded-md border border-border bg-background p-2 hover:bg-muted transition-colors"
                  title={copiado ? "Copiado!" : "Copiar senha"}
                >
                  {copiado ? (
                    <Check className="size-4 text-green-600" />
                  ) : (
                    <Copy className="size-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Repasse essa senha à pessoa por um canal seguro (ela será obrigada a trocá-la no primeiro acesso).
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <Button size="sm" onClick={handleCloseSenhaModal}>
                Fechar
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <Toaster />
    </div>
  )
}