"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { Menu } from "@base-ui/react/menu"
import { Search, ChevronDown, Check, Clock, FileText, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ModuloAuditoria, AcaoAuditoria } from "@/types/domain"
import { useCurrentUser } from "@/lib/auth-context"
import { actionObterAuditoria } from "@/lib/actions/auditoria"

// Tipo para o retorno real do Prisma (modulo/acao são string, não enums)
type RegistroAuditoriaReal = {
  id: string
  dataHora: Date
  usuarioId: string
  usuarioNome: string
  modulo: string
  acao: string
  entidadeId: string
  descricao: string
  motivo?: string | null
  camposAlterados?: unknown // Prisma retorna JsonValue, que é mais amplo
} & { empresaId?: string }

const PAGE_SIZE = 20

// Função para formatar ação de auditoria de forma legível
function formatarAcaoAuditoria(
  modulo: string,
  acao: string,
  camposAlterados?: { campo: string; valorAnterior: string; valorNovo: string }[]
): string {
  const moduloLabel: Record<string, string> = {
    PEDIDOS: "Pedido",
    CLIENTES: "Cliente",
    PRODUTOS: "Produto",
    ESTOQUE: "Estoque",
    USUARIOS: "Usuário",
    CONFIGURACOES: "Configuração",
    AUTH: "Autenticação",
    DEVOLUCOES: "Devolução",
    INVENTARIO: "Inventário",
  }

  const acaoLabel: Record<string, string> = {
    CRIADO: "criado",
    ATUALIZADO: "editado",
    CANCELADO: "cancelado",
    EXCLUIDO: "excluído",
    LOGIN: "login",
    LOGOUT: "logout",
    STATUS_ALTERADO: "status alterado",
    EXPORTADO: "exportado",
  }

  // Caso especial: STATUS_ALTERADO em USUARIOS pode mostrar "ativado" ou "inativado"
  if (modulo === "USUARIOS" && acao === "STATUS_ALTERADO" && camposAlterados) {
    const statusChange = camposAlterados.find((c) => c.campo === "status")
    if (statusChange) {
      if (statusChange.valorNovo === "ativo") {
        return "Usuário ativado"
      }
      if (statusChange.valorNovo === "inativo") {
        return "Usuário desativado"
      }
    }
  }

  return `${moduloLabel[modulo] || modulo} ${acaoLabel[acao] || acao}`
}

// Função para formatar data/hora
function formatarDataHora(date: Date): string {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AuditoriaPage() {
  const currentUser = useCurrentUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registros, setRegistros] = useState<RegistroAuditoriaReal[]>([])
  const [busca, setBusca] = useState("")
  const [buscaDebounced, setBuscaDebounced] = useState("")
  const [visiveis, setVisiveis] = useState(PAGE_SIZE)
  
  // Filtros dinâmicos
  const [usuarioFiltro, setUsuarioFiltro] = useState<string | null>(null)
  const [moduloFiltro, setModuloFiltro] = useState<ModuloAuditoria | null>(null)
  const [acaoFiltro, setAcaoFiltro] = useState<AcaoAuditoria | null>(null)
  const [dataInicio, setDataInicio] = useState<string | null>(null)
  const [dataFim, setDataFim] = useState<string | null>(null)

  // Expansão de linha
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)

  // Carrega dados iniciais do servidor
  useEffect(() => {
    async function carregarAuditoria() {
      setLoading(true)
      setError(null)
      const result = await actionObterAuditoria()
      if (result.ok && result.data) {
        setRegistros(result.data)
      } else {
        setError(result.error || "Erro ao carregar auditoria")
      }
      setLoading(false)
    }
    carregarAuditoria()
  }, [])

  // Debounce da busca
  useEffect(() => {
    const t = window.setTimeout(() => setBuscaDebounced(busca), 300)
    return () => window.clearTimeout(t)
  }, [busca])

  // Reseta a paginação quando filtros mudam
  useEffect(() => {
    setVisiveis(PAGE_SIZE)
  }, [buscaDebounced, usuarioFiltro, moduloFiltro, acaoFiltro, dataInicio, dataFim])

  // Atalho "/" foca a busca
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/") return
      const el = document.activeElement
      const tag = el?.tagName.toLowerCase()
      if (tag === "input" || tag === "textarea" || tag === "select") return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Deriva opções de filtros dinamicamente dos dados carregados
  const usuariosDisponiveis = useMemo(() => {
    const uniqueUsers = new Map<string, string>()
    registros.forEach((r) => {
      uniqueUsers.set(r.usuarioId, r.usuarioNome)
    })
    return Array.from(uniqueUsers.entries()).map(([id, nome]) => ({ id, nome }))
  }, [registros])

  const modulosDisponiveis = useMemo(() => {
    const unique = new Set<ModuloAuditoria>()
    registros.forEach((r) => unique.add(r.modulo as ModuloAuditoria))
    return Array.from(unique)
  }, [registros])

  const acoesDisponiveis = useMemo(() => {
    const unique = new Set<AcaoAuditoria>()
    registros.forEach((r) => unique.add(r.acao as AcaoAuditoria))
    return Array.from(unique)
  }, [registros])

  // Aplica todos os filtros
  const filtrados = useMemo(() => {
    let result = registros

    // Filtro de busca
    const q = buscaDebounced.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (r: RegistroAuditoriaReal) =>
          r.descricao.toLowerCase().includes(q) ||
          r.entidadeId.toLowerCase().includes(q)
      )
    }

    // Filtro de usuário
    if (usuarioFiltro) {
      result = result.filter((r: RegistroAuditoriaReal) => r.usuarioId === usuarioFiltro)
    }

    // Filtro de módulo
    if (moduloFiltro) {
      result = result.filter((r: RegistroAuditoriaReal) => r.modulo === moduloFiltro)
    }

    // Filtro de ação
    if (acaoFiltro) {
      result = result.filter((r: RegistroAuditoriaReal) => r.acao === acaoFiltro)
    }

    // Filtro de período
    if (dataInicio) {
  const inicio = new Date(dataInicio).setHours(0, 0, 0, 0)
  result = result.filter((r: RegistroAuditoriaReal) => new Date(r.dataHora).getTime() >= inicio)
  }
  if (dataFim) {
    const fim = new Date(dataFim).setHours(23, 59, 59, 999)
    result = result.filter((r: RegistroAuditoriaReal) => new Date(r.dataHora).getTime() <= fim)
  }

    // Ordenação cronológica (mais recente primeiro)
    return [...result].sort((a, b) =>
      new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
    )
  }, [registros, buscaDebounced, usuarioFiltro, moduloFiltro, acaoFiltro, dataInicio, dataFim])

  const paginados = filtrados.slice(0, visiveis)
  const temMais = filtrados.length > visiveis

  const semRegistros = !loading && registros.length === 0
  const semResultado = !loading && registros.length > 0 && filtrados.length === 0

  // Guarda de acesso — só ADMIN vê auditoria
  if (currentUser.role !== "ADMIN") {
    return (
      <div className="flex flex-col gap-4 p-6">
        <h1 className="text-lg font-semibold">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para acessar esta área.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <h1 className="text-lg font-semibold">Auditoria</h1>
        <p className="text-sm text-destructive">Erro ao carregar auditoria: {error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">Auditoria</h1>

      {/* Barra de busca e filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por entidade…"
            aria-label="Buscar registros de auditoria"
            className="h-9 w-full rounded-md border border-input bg-card pr-16 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground sm:block">
            /
          </kbd>
        </div>

        {/* Filtro de usuário */}
        {usuariosDisponiveis.length > 0 && (
          <Menu.Root>
            <Menu.Trigger className="inline-flex h-9 shrink-0 items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-48">
              <span className="text-muted-foreground">Usuário:</span>
              <span className="flex-1 text-left truncate">
                {usuarioFiltro 
                  ? usuariosDisponiveis.find((u) => u.id === usuarioFiltro)?.nome 
                  : "Todos"}
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-40">
                <Menu.Popup className="min-w-48 max-h-60 overflow-y-auto origin-[var(--transform-origin)] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg shadow-black/10 outline-none transition-[transform,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
                  <Menu.Item
                    onClick={() => setUsuarioFiltro(null)}
                    className="flex cursor-default items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted"
                  >
                    <span>Todos</span>
                    {!usuarioFiltro && <Check className="size-4 text-primary" />}
                  </Menu.Item>
                  {usuariosDisponiveis.map((u) => (
                    <Menu.Item
                      key={u.id}
                      onClick={() => setUsuarioFiltro(u.id)}
                      className="flex cursor-default items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted"
                    >
                      <span className="truncate">{u.nome}</span>
                      {usuarioFiltro === u.id && <Check className="size-4 text-primary" />}
                    </Menu.Item>
                  ))}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        )}

        {/* Filtro de entidade (módulo) */}
        {modulosDisponiveis.length > 0 && (
          <Menu.Root>
            <Menu.Trigger className="inline-flex h-9 shrink-0 items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-40">
              <span className="text-muted-foreground">Entidade:</span>
              <span className="flex-1 text-left truncate">
                {moduloFiltro || "Todas"}
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-40">
                <Menu.Popup className="min-w-40 origin-[var(--transform-origin)] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg shadow-black/10 outline-none transition-[transform,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
                  <Menu.Item
                    onClick={() => setModuloFiltro(null)}
                    className="flex cursor-default items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted"
                  >
                    <span>Todas</span>
                    {!moduloFiltro && <Check className="size-4 text-primary" />}
                  </Menu.Item>
                  {modulosDisponiveis.map((m) => (
                    <Menu.Item
                      key={m}
                      onClick={() => setModuloFiltro(m)}
                      className="flex cursor-default items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted"
                    >
                      <span>{m}</span>
                      {moduloFiltro === m && <Check className="size-4 text-primary" />}
                    </Menu.Item>
                  ))}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        )}

        {/* Filtro de ação */}
        {acoesDisponiveis.length > 0 && (
          <Menu.Root>
            <Menu.Trigger className="inline-flex h-9 shrink-0 items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-40">
              <span className="text-muted-foreground">Ação:</span>
              <span className="flex-1 text-left truncate">
                {acaoFiltro || "Todas"}
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-40">
                <Menu.Popup className="min-w-40 origin-[var(--transform-origin)] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg shadow-black/10 outline-none transition-[transform,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
                  <Menu.Item
                    onClick={() => setAcaoFiltro(null)}
                    className="flex cursor-default items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted"
                  >
                    <span>Todas</span>
                    {!acaoFiltro && <Check className="size-4 text-primary" />}
                  </Menu.Item>
                  {acoesDisponiveis.map((a) => (
                    <Menu.Item
                      key={a}
                      onClick={() => setAcaoFiltro(a)}
                      className="flex cursor-default items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted"
                    >
                      <span>{a}</span>
                      {acaoFiltro === a && <Check className="size-4 text-primary" />}
                    </Menu.Item>
                  ))}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        )}

        {/* Filtro de período */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dataInicio || ""}
            onChange={(e) => setDataInicio(e.target.value || null)}
            className="h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <span className="text-muted-foreground">até</span>
          <input
            type="date"
            value={dataFim || ""}
            onChange={(e) => setDataFim(e.target.value || null)}
            className="h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <Th>Data/hora</Th>
                <Th>Usuário</Th>
                <Th>Ação</Th>
                <Th>Entidade afetada</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <Td><div className="h-4 w-32 animate-pulse rounded bg-muted" /></Td>
                    <Td><div className="h-4 w-24 animate-pulse rounded bg-muted" /></Td>
                    <Td><div className="h-4 w-28 animate-pulse rounded bg-muted" /></Td>
                    <Td><div className="h-4 w-36 animate-pulse rounded bg-muted" /></Td>
                    <Td><div className="h-4 w-8 animate-pulse rounded bg-muted" /></Td>
                  </tr>
                ))}

              {!loading &&
                paginados.map((registro) => (
                  <Fragment key={registro.id}>
                    <tr
                      className="border-b border-border outline-none hover:bg-muted/50 cursor-pointer"
                      onClick={() => setExpandedRowId(expandedRowId === registro.id ? null : registro.id)}
                    >
                      <Td className="font-mono text-xs text-muted-foreground">
                        {formatarDataHora(registro.dataHora)}
                      </Td>
                      <Td>{registro.usuarioNome}</Td>
                      <Td className="font-medium">
                        {formatarAcaoAuditoria(
                          registro.modulo,
                          registro.acao,
                          (registro.camposAlterados as { campo: string; valorAnterior: string; valorNovo: string }[] | undefined)
                        )}
                      </Td>
                      <Td className="font-mono text-xs text-muted-foreground">
                        {registro.entidadeId}
                      </Td>
                      <Td>
                        <span title="Ver detalhes completos deste registro">
                          <ChevronRight 
                            className={cn(
                              "size-4 text-muted-foreground transition-transform",
                              expandedRowId === registro.id && "rotate-90"
                            )}
                          />
                        </span>
                      </Td>
                    </tr>
                    {expandedRowId === registro.id && (
                      <tr className="border-b border-border bg-muted/30">
                        <Td colSpan={5} className="p-4">
                          <div className="space-y-3">
                            {registro.motivo && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">Motivo:</p>
                                <p className="text-sm">{registro.motivo}</p>
                              </div>
                            )}
                            {(() => {
                              const campos = registro.camposAlterados as { campo: string; valorAnterior: string; valorNovo: string }[] | null | undefined
                              if (campos && Array.isArray(campos) && campos.length > 0) {
                                return (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2">Campos alterados:</p>
                                    <div className="space-y-2">
                                      {campos.map((c, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                          <span className="font-medium min-w-[100px]">{c.campo}:</span>
                                          <span className="text-muted-foreground line-through">{c.valorAnterior}</span>
                                          <span className="text-muted-foreground">→</span>
                                          <span className="text-foreground">{c.valorNovo}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            })()}
                            {!registro.motivo && (!registro.camposAlterados || !Array.isArray(registro.camposAlterados) || registro.camposAlterados.length === 0) && (
                              <p className="text-sm text-muted-foreground">{registro.descricao}</p>
                            )}
                          </div>
                        </Td>
                      </tr>
                    )}
                  </Fragment>
                ))}
            </tbody>
          </table>
        </div>

        {/* Estados vazios */}
        {semRegistros && (
          <EmptyState
            icon={<Clock className="size-6 text-muted-foreground" />}
            title="Nenhum registro de auditoria encontrado."
            hint="Ainda não há ações registradas para sua empresa."
          />
        )}
        {semResultado && (
          <EmptyState
            icon={<Search className="size-6 text-muted-foreground" />}
            title="Nenhum registro encontrado com esses filtros."
            hint="Ajuste a busca ou os filtros aplicados."
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
    </div>
  )
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode
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
  colSpan,
}: {
  children: React.ReactNode
  className?: string
  colSpan?: number
}) {
  return <td colSpan={colSpan} className={cn("px-4 py-3 align-middle", className)}>{children}</td>
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
