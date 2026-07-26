"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Menu } from "@base-ui/react/menu"
import {
  Search,
  Plus,
  ChevronDown,
  Check,
  Users,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Cliente } from "@/types/domain"
import {
  MOCK_CLIENTES,
  formatDataCadastro,
  onlyDigits,
  tipoDocumento,
} from "@/lib/mock-clientes"
import { StatusBadge } from "./status-badge"
import { ClienteDrawer, type SaveResult } from "./cliente-drawer"
import { actionRegistrarAuditoria } from "@/lib/actions/auditoria"
import { useCurrentUser } from "@/lib/auth-context"

type StatusFiltro = "todos" | "ativo" | "bloqueado"

const PAGE_SIZE = 5

const FILTRO_LABEL: Record<StatusFiltro, string> = {
  todos: "Todos",
  ativo: "Ativos",
  bloqueado: "Bloqueados",
}

export function ClientesScreen() {
  const currentUser = useCurrentUser()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [buscaDebounced, setBuscaDebounced] = useState("")
  const [filtro, setFiltro] = useState<StatusFiltro>("todos")
  const [visiveis, setVisiveis] = useState(PAGE_SIZE)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<number | null>(null)

  // Carrega dados iniciais (simula skeleton).
  useEffect(() => {
    const t = window.setTimeout(() => {
      setClientes(MOCK_CLIENTES)
      setLoading(false)
    }, 700)
    return () => window.clearTimeout(t)
  }, [])

  // Debounce da busca.
  useEffect(() => {
    const t = window.setTimeout(() => setBuscaDebounced(busca), 300)
    return () => window.clearTimeout(t)
  }, [busca])

  // Reseta a paginação quando o filtro/busca muda.
  useEffect(() => {
    setVisiveis(PAGE_SIZE)
  }, [buscaDebounced, filtro])

  // Atalho "/" foca a busca (ignora se drawer aberto ou já digitando).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || drawerOpen) return
      const el = document.activeElement
      const tag = el?.tagName.toLowerCase()
      if (tag === "input" || tag === "textarea" || tag === "select") return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [drawerOpen])

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  const filtrados = useMemo(() => {
    const q = buscaDebounced.trim().toLowerCase()
    const qDigits = onlyDigits(buscaDebounced)
    return clientes.filter((c) => {
      if (filtro !== "todos" && c.status !== filtro) return false
      if (!q) return true
      const nomeMatch = c.nome.toLowerCase().includes(q)
      const docMatch =
        qDigits.length > 0 && onlyDigits(c.documento).includes(qDigits)
      return nomeMatch || docMatch
    })
  }, [clientes, buscaDebounced, filtro])

  const paginados = filtrados.slice(0, visiveis)
  const temMais = filtrados.length > visiveis

  const semClientes = !loading && clientes.length === 0
  const semResultado = !loading && clientes.length > 0 && filtrados.length === 0

  function abrirNovo() {
    setEditando(null)
    setDrawerOpen(true)
  }

  function abrirEdicao(c: Cliente) {
    setEditando(c)
    setDrawerOpen(true)
  }

  const salvarCliente = useCallback(
    async (payload: Cliente): Promise<SaveResult> => {
      // Simula latência de rede.
      await new Promise((r) => setTimeout(r, 500))

      // Documento duplicado (ignora o próprio registro em edição).
      const docDigits = onlyDigits(payload.documento)
      const duplicado = clientes.some(
        (c) => c.id !== payload.id && onlyDigits(c.documento) === docDigits,
      )
      if (duplicado) {
        return { ok: false, error: "Já existe um cliente com este documento." }
      }

      // Atualiza in-place (edição) ou insere no topo (novo).
      setClientes((prev) => {
        const existe = prev.some((c) => c.id === payload.id)
        return existe
          ? prev.map((c) => (c.id === payload.id ? payload : c))
          : [payload, ...prev]
      })
      
      // Registrar auditoria para edição de cliente
      const clienteAntigo = clientes.find((c) => c.id === payload.id)
      if (clienteAntigo) {
        const camposAlterados: { campo: string; valorAnterior: string; valorNovo: string }[] = []
        
        if (clienteAntigo.nome !== payload.nome) {
          camposAlterados.push({ campo: "nome", valorAnterior: clienteAntigo.nome, valorNovo: payload.nome })
        }
        if (clienteAntigo.documento !== payload.documento) {
          camposAlterados.push({ campo: "documento", valorAnterior: clienteAntigo.documento, valorNovo: payload.documento })
        }
        if (clienteAntigo.status !== payload.status) {
          camposAlterados.push({ campo: "status", valorAnterior: clienteAntigo.status, valorNovo: payload.status })
        }
        
        // Comparar enderecos (simplificado - verifica se a quantidade mudou)
        if (clienteAntigo.enderecos.length !== payload.enderecos.length) {
          camposAlterados.push({ 
            campo: "enderecos", 
            valorAnterior: `${clienteAntigo.enderecos.length} endereços`, 
            valorNovo: `${payload.enderecos.length} endereços` 
          })
        }
        
        if (camposAlterados.length > 0) {
          actionRegistrarAuditoria({
            modulo: "CLIENTES",
            acao: "ATUALIZADO",
            entidadeId: payload.id,
            descricao: `Cliente ${payload.nome} atualizado.`,
            camposAlterados,
          }).then((result) => {
            if (!result.ok) console.error("Erro ao registrar auditoria:", result.error)
          })
        }
      } else {
        // Novo cliente
        actionRegistrarAuditoria({
          modulo: "CLIENTES",
          acao: "CRIADO",
          entidadeId: payload.id,
          descricao: `Cliente ${payload.nome} criado.`,
        }).then((result) => {
          if (!result.ok) console.error("Erro ao registrar auditoria:", result.error)
        })
      }
      
      showToast("Cliente salvo.")
      return { ok: true }
    },
    [clientes, currentUser],
  )

  return (
    <div className="flex h-full flex-col">
      {/* Barra superior */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, razão social ou documento…"
            aria-label="Buscar clientes"
            className="h-9 w-full rounded-md border border-input bg-card pr-16 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground sm:block">
            /
          </kbd>
        </div>

        {/* Filtro de status */}
        <Menu.Root>
          <Menu.Trigger className="inline-flex h-9 shrink-0 items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 aria-expanded:bg-muted sm:w-40">
            <span className="text-muted-foreground">Status:</span>
            <span className="flex-1 text-left">{FILTRO_LABEL[filtro]}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-40">
              <Menu.Popup className="min-w-40 origin-[var(--transform-origin)] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg shadow-black/10 outline-none transition-[transform,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
                {(["todos", "ativo", "bloqueado"] as StatusFiltro[]).map((f) => (
                  <Menu.Item
                    key={f}
                    onClick={() => setFiltro(f)}
                    className="flex cursor-default items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted"
                  >
                    {FILTRO_LABEL[f]}
                    {filtro === f && <Check className="size-4 text-primary" />}
                  </Menu.Item>
                ))}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>

        <button
          type="button"
          onClick={abrirNovo}
          className={cn(
            "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50",
            semClientes && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
          )}
        >
          <Plus className="size-4" />
          Novo cliente
        </button>
      </div>

      {/* Tabela */}
      <div className="mt-4 flex-1 overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <Th>Nome / Razão social</Th>
                <Th>Documento</Th>
                <Th>Status</Th>
                <Th className="text-right">Data de cadastro</Th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <Td>
                      <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                    </Td>
                    <Td>
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    </Td>
                    <Td>
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    </Td>
                    <Td className="text-right">
                      <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
                    </Td>
                  </tr>
                ))}

              {!loading &&
                paginados.map((c) => (
                  <tr
                    key={c.id}
                    tabIndex={0}
                    onClick={() => abrirEdicao(c)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        abrirEdicao(c)
                      }
                    }}
                    className="cursor-pointer border-b border-border outline-none last:border-0 hover:bg-muted/50 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
                  >
                    <Td>
                      <span className="font-medium text-foreground">
                        {c.nome}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-[0.82rem] tabular-nums text-muted-foreground">
                        {c.documento}
                      </span>
                      <span className="ml-2 rounded bg-muted px-1 py-0.5 text-[0.6rem] font-semibold text-muted-foreground">
                        {tipoDocumento(c.documento)}
                      </span>
                    </Td>
                    <Td>
                      <StatusBadge status={c.status} />
                    </Td>
                    <Td className="text-right">
                      <span className="font-mono text-[0.82rem] tabular-nums text-muted-foreground">
                        {formatDataCadastro(c.dataCadastro)}
                      </span>
                    </Td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Estados vazios */}
        {semClientes && (
          <EmptyState
            icon={<Users className="size-6 text-muted-foreground" />}
            title="Nenhum cliente cadastrado ainda."
            hint='Comece adicionando o primeiro cliente pelo botão "Novo cliente".'
          />
        )}
        {semResultado && (
          <EmptyState
            icon={<Search className="size-6 text-muted-foreground" />}
            title="Nenhum cliente encontrado com esse filtro."
            hint="Ajuste a busca ou o filtro de status."
          />
        )}

        {/* Carregar mais */}
        {!loading && temMais && (
          <div className="flex justify-center border-t border-border p-3">
            <button
              type="button"
              onClick={() => setVisiveis((v) => v + PAGE_SIZE)}
              className="rounded-md border border-border bg-background px-4 py-1.5 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Carregar mais
              <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                ({filtrados.length - visiveis})
              </span>
            </button>
          </div>
        )}
      </div>

      <ClienteDrawer
        open={drawerOpen}
        cliente={editando}
        onOpenChange={setDrawerOpen}
        onSave={salvarCliente}
      />

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-lg border border-border bg-popover px-3.5 py-2.5 text-sm font-medium text-popover-foreground shadow-lg shadow-black/15"
        >
          <CheckCircle2 className="size-4 text-success" />
          {toast}
        </div>
      )}
    </div>
  )
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>
}

function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode
  title: string
  hint: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground text-balance">
        {hint}
      </p>
    </div>
  )
}
