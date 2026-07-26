"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Menu } from "@base-ui/react/menu"
import { Dialog } from "@base-ui/react/dialog"
import {
  Search,
  Plus,
  ChevronDown,
  Check,
  ShoppingCart,
  CheckCircle2,
  MoreHorizontal,
  XCircle,
  Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Pedido, StatusPedido } from "@/types/domain"
import { MOCK_CLIENTES, formatDataCadastro } from "@/lib/mock-clientes"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"
import { useCurrentUser } from "@/lib/auth-context"
import { StatusBadgePedido } from "@/components/pedidos/shared/status-badge"
import { usePedidosStore, podeCancelarPedido } from "@/lib/pedidos-store"

const PAGE_SIZE = 30

// Statuses excluídos do filtro padrão
const STATUS_PADRAO_EXCLUIDOS: StatusPedido[] = ["ENTREGUE", "CANCELADO"]

const STATUS_TODOS: StatusPedido[] = [
  "CRIADO",
  "RESERVADO",
  "EM_SEPARACAO",
  "EM_CONFERENCIA",
  "CONFERIDO",
  "EXPEDIDO",
  "ENTREGUE",
  "CANCELADO",
]

const STATUS_LABEL: Record<StatusPedido, string> = {
  CRIADO: "Criado",
  RESERVADO: "Reservado",
  EM_SEPARACAO: "Em separação",
  EM_CONFERENCIA: "Em conferência",
  CONFERIDO: "Conferido",
  EXPEDIDO: "Expedido",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
}

// Formata valor em BRL
function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

// Formata duração relativa a partir de uma data ISO
function formatDuracao(isoDate: string): { texto: string; atrasado: boolean } {
  const agora = Date.now()
  const desde = new Date(isoDate).getTime()
  const diffMs = agora - desde
  const diffH = diffMs / (1000 * 60 * 60)
  const diffD = diffH / 24

  let texto: string
  if (diffH < 1) {
    texto = "< 1h"
  } else if (diffH < 24) {
    texto = `${Math.floor(diffH)}h`
  } else {
    texto = `${Math.floor(diffD)}d`
  }

  // TODO: critério provisório, alinhar com definição exata do Dashboard quando o Módulo 3 for implementado
  const atrasado = diffH > 48

  return { texto, atrasado }
}

function isAtrasado(pedido: Pedido): boolean {
  if (pedido.status === "ENTREGUE" || pedido.status === "CANCELADO") return false
  if (pedido.pendencia !== "NENHUMA") return true
  const diffH =
    (Date.now() - new Date(pedido.statusAlteradoEm).getTime()) / (1000 * 60 * 60)
  // TODO: critério provisório, alinhar com definição exata do Dashboard quando o Módulo 3 for implementado
  return diffH > 48
}

export function PedidosScreen() {
  const router = useRouter()
  const currentUser = useCurrentUser()
  const isVendedor = currentUser.funcao === "VENDAS"

  const pedidos = usePedidosStore((s) => s.pedidos)
  const cancelarPedido = usePedidosStore((s) => s.cancelarPedido)

  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [buscaDebounced, setBuscaDebounced] = useState("")
  const [filtroAtrasados, setFiltroAtrasados] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<StatusPedido[]>(
    STATUS_TODOS.filter((s) => !STATUS_PADRAO_EXCLUIDOS.includes(s)),
  )
  const [filtroVendedor, setFiltroVendedor] = useState<string>("todos")
  const [visiveis, setVisiveis] = useState(PAGE_SIZE)

  // Cancelamento
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)
  const [motivoCancelamento, setMotivoCancelamento] = useState("")
  const [cancelando, setCancelando] = useState(false)

  const [toast, setToast] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<number | null>(null)

  // Lista de vendedores para o filtro
  const vendedores = useMemo(
    () => MOCK_USUARIOS.filter((u) => u.funcao === "VENDAS"),
    [],
  )

  // Carrega dados iniciais (simula skeleton)
  useEffect(() => {
  const t = window.setTimeout(() => setLoading(false), 700)
  return () => window.clearTimeout(t)
}, [])

  // Debounce da busca
  useEffect(() => {
    const t = window.setTimeout(() => setBuscaDebounced(busca), 300)
    return () => window.clearTimeout(t)
  }, [busca])

  // Reseta paginação quando filtro/busca muda
  useEffect(() => {
    setVisiveis(PAGE_SIZE)
  }, [buscaDebounced, filtroStatus, filtroAtrasados, filtroVendedor])

  // Atalho "/" foca a busca
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || cancelandoId) return
      const el = document.activeElement
      const tag = el?.tagName.toLowerCase()
      if (tag === "input" || tag === "textarea" || tag === "select") return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [cancelandoId])

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

  // Mapa de id → nome do cliente
  const clienteMap = useMemo(
    () => Object.fromEntries(MOCK_CLIENTES.map((c) => [c.id, c.nome])),
    [],
  )

  // Mapa de id → nome do vendedor
  const vendedorMap = useMemo(
    () => Object.fromEntries(MOCK_USUARIOS.map((u) => [u.id, u.nome])),
    [],
  )

  const filtrados = useMemo(() => {
    const q = buscaDebounced.trim().toLowerCase()
    return pedidos.filter((p) => {
      // Escopo por perfil
      if (isVendedor && p.vendedorId !== currentUser.id) return false

      // Filtro de status
      if (!filtroStatus.includes(p.status)) return false

      // Filtro de atrasados
      if (filtroAtrasados && !isAtrasado(p)) return false

      // Filtro de vendedor (só Admin/Supervisor)
      if (!isVendedor && filtroVendedor !== "todos" && p.vendedorId !== filtroVendedor)
        return false

      // Busca por número ou nome do cliente
      if (q) {
        const numMatch = String(p.numero).includes(q)
        const nomeCliente = (clienteMap[p.clienteId] ?? "").toLowerCase()
        const clienteMatch = nomeCliente.includes(q)
        if (!numMatch && !clienteMatch) return false
      }

      return true
    })
  }, [
    pedidos,
    buscaDebounced,
    filtroStatus,
    filtroAtrasados,
    filtroVendedor,
    isVendedor,
    currentUser.id,
    clienteMap,
  ])

  const paginados = filtrados.slice(0, visiveis)
  const temMais = filtrados.length > visiveis

  const semPedidos = !loading && pedidos.length === 0
  const semResultado = !loading && pedidos.length > 0 && filtrados.length === 0

  // Toggle multi-seleção de status
  function toggleStatus(s: StatusPedido) {
    setFiltroStatus((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    )
  }

  // Conta filtros ativos para exibição no trigger
  const statusLabel = useMemo(() => {
    const total = STATUS_TODOS.length
    if (filtroStatus.length === total) return "Todos"
    if (filtroStatus.length === 0) return "Nenhum"
    if (filtroStatus.length === 1) return STATUS_LABEL[filtroStatus[0]]
    return `${filtroStatus.length} selecionados`
  }, [filtroStatus])

  const confirmarCancelamento = useCallback(async () => {
  if (!cancelandoId || !motivoCancelamento.trim()) return
  setCancelando(true)
  const resultado = await cancelarPedido(cancelandoId, currentUser, motivoCancelamento.trim())
  setCancelando(false)
  if (!resultado.ok) {
    showToast(resultado.error)
    return
  }
  setCancelandoId(null)
  setMotivoCancelamento("")
  showToast("Pedido cancelado.")
  }, [cancelandoId, motivoCancelamento, cancelarPedido, currentUser])

  function abrirCancelamento(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setCancelandoId(id)
    setMotivoCancelamento("")
  }

  const titulo = isVendedor ? "Meus pedidos" : "Pedidos"

  return (
    <div className="flex h-full flex-col">
      {/* Barra superior */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Campo de busca */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por número ou cliente…"
            aria-label="Buscar pedidos"
            className="h-9 w-full rounded-md border border-input bg-card pr-16 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground sm:block">
            /
          </kbd>
        </div>

        {/* Chip "Atrasados" */}
        <button
          type="button"
          onClick={() => setFiltroAtrasados((v) => !v)}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
            filtroAtrasados
              ? "border-warning/50 bg-warning/10 text-warning"
              : "border-input bg-card text-muted-foreground hover:bg-muted",
          )}
          aria-pressed={filtroAtrasados}
        >
          <Filter className="size-3.5" />
          Atrasados
        </button>

        {/* Filtro de status (multi-seleção) */}
        <Menu.Root>
          <Menu.Trigger className="inline-flex h-9 shrink-0 items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 aria-expanded:bg-muted lg:w-44">
            <span className="text-muted-foreground">Status:</span>
            <span className="flex-1 truncate text-left">{statusLabel}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-40">
              <Menu.Popup className="min-w-48 origin-[var(--transform-origin)] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg shadow-black/10 outline-none transition-[transform,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
                {STATUS_TODOS.map((s) => (
                  <Menu.Item
                    key={s}
                    onClick={() => toggleStatus(s)}
                    closeOnClick={false}
                    className="flex cursor-default items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted"
                  >
                    {STATUS_LABEL[s]}
                    {filtroStatus.includes(s) && (
                      <Check className="size-4 text-primary" />
                    )}
                  </Menu.Item>
                ))}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>

        {/* Filtro de vendedor (só Admin/Supervisor) */}
        {!isVendedor && (
          <Menu.Root>
            <Menu.Trigger className="inline-flex h-9 shrink-0 items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 aria-expanded:bg-muted lg:w-44">
              <span className="text-muted-foreground">Vendedor:</span>
              <span className="flex-1 truncate text-left">
                {filtroVendedor === "todos"
                  ? "Todos"
                  : (vendedorMap[filtroVendedor] ?? "—")}
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-40">
                <Menu.Popup className="min-w-44 origin-[var(--transform-origin)] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg shadow-black/10 outline-none transition-[transform,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
                  <Menu.Item
                    onClick={() => setFiltroVendedor("todos")}
                    className="flex cursor-default items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted"
                  >
                    Todos
                    {filtroVendedor === "todos" && (
                      <Check className="size-4 text-primary" />
                    )}
                  </Menu.Item>
                  {vendedores.map((v) => (
                    <Menu.Item
                      key={v.id}
                      onClick={() => setFiltroVendedor(v.id)}
                      className="flex cursor-default items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted"
                    >
                      {v.nome}
                      {filtroVendedor === v.id && (
                        <Check className="size-4 text-primary" />
                      )}
                    </Menu.Item>
                  ))}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        )}

        {/* Botão "Novo pedido" (só Vendedor) */}
        {isVendedor && (
          <button
            type="button"
            onClick={() => router.push("/pedidos/novo")}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Plus className="size-4" />
            Novo pedido
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="mt-4 flex-1 overflow-hidden rounded-lg border border-border bg-card">
        {/* Título da tela dentro da área da tabela — padrão mobile-friendly */}
        <div className="border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold text-foreground">{titulo}</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <Th>Número</Th>
                <Th>Cliente</Th>
                {!isVendedor && <Th>Vendedor</Th>}
                <Th>Status</Th>
                <Th className="text-right">Valor total</Th>
                <Th className="text-right">Criado em</Th>
                <Th>Tempo no status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <Td>
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    </Td>
                    <Td>
                      <div className="h-4 w-44 animate-pulse rounded bg-muted" />
                    </Td>
                    {!isVendedor && (
                      <Td>
                        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                      </Td>
                    )}
                    <Td>
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    </Td>
                    <Td className="text-right">
                      <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
                    </Td>
                    <Td className="text-right">
                      <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
                    </Td>
                    <Td>
                      <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                    </Td>
                    <Td>
                      <div className="h-4 w-6 animate-pulse rounded bg-muted" />
                    </Td>
                  </tr>
                ))}

              {!loading && paginados.map((p) => {
              const duracao = formatDuracao(p.statusAlteradoEm)
              const atrasado = isAtrasado(p)
              const podeCancelar = podeCancelarPedido(p, currentUser)
              return (
                    <tr
                      key={p.id}
                      tabIndex={0}
                      onClick={() => router.push(`/pedidos/${p.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          router.push(`/pedidos/${p.id}`)
                        }
                      }}
                      className="cursor-pointer border-b border-border outline-none last:border-0 hover:bg-muted/50 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
                    >
                      <Td>
                        <span className="font-mono text-[0.82rem] tabular-nums text-muted-foreground">
                          #{p.numero}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-medium text-foreground">
                          {clienteMap[p.clienteId] ?? p.clienteId}
                        </span>
                      </Td>
                      {!isVendedor && (
                        <Td>
                          <span className="text-foreground">
                            {vendedorMap[p.vendedorId] ?? p.vendedorId}
                          </span>
                        </Td>
                      )}
                      <Td>
                        <StatusBadgePedido
                          status={p.status}
                          pendencia={p.pendencia}
                        />
                      </Td>
                      <Td className="text-right">
                        <span className="font-mono text-[0.82rem] tabular-nums text-foreground">
                          {formatBRL(p.valorTotal)}
                        </span>
                      </Td>
                      <Td className="text-right">
                        <span className="font-mono text-[0.82rem] tabular-nums text-muted-foreground">
                          {formatDataCadastro(p.criadoEm)}
                        </span>
                      </Td>
                      <Td>
                        <span
                          className={cn(
                            "font-mono text-[0.82rem] tabular-nums",
                            atrasado
                              ? "font-semibold text-warning"
                              : "text-muted-foreground",
                          )}
                        >
                          {duracao.texto}
                        </span>
                      </Td>
                      <Td>
                        {podeCancelar && (
                          <Menu.Root>
                            <Menu.Trigger
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                              aria-label="Ações do pedido"
                            >
                              <MoreHorizontal className="size-4" />
                            </Menu.Trigger>
                            <Menu.Portal>
                              <Menu.Positioner
                                side="bottom"
                                align="end"
                                sideOffset={6}
                                className="z-40"
                              >
                                <Menu.Popup className="min-w-44 origin-[var(--transform-origin)] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg shadow-black/10 outline-none transition-[transform,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
                                  <Menu.Item
                                    onClick={(e) => abrirCancelamento(p.id, e)}
                                    className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-destructive outline-none select-none data-[highlighted]:bg-destructive/10"
                                  >
                                    <XCircle className="size-4" />
                                    Cancelar pedido
                                  </Menu.Item>
                                </Menu.Popup>
                              </Menu.Positioner>
                            </Menu.Portal>
                          </Menu.Root>
                        )}
                      </Td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        {/* Estado vazio sem filtros */}
        {semPedidos && (
          <EmptyState
            icon={<ShoppingCart className="size-6 text-muted-foreground" />}
            title="Nenhum pedido cadastrado ainda."
            hint={
              isVendedor
                ? 'Crie o primeiro pedido pelo botão "Novo pedido".'
                : "Aguarde que os vendedores registrem novos pedidos."
            }
          />
        )}

        {/* Estado vazio com filtros ativos */}
        {semResultado && (
          <EmptyState
            icon={<Search className="size-6 text-muted-foreground" />}
            title="Nenhum pedido encontrado com esse filtro."
            hint="Ajuste a busca ou os filtros ativos."
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

      {/* Modal de cancelamento */}
      <Dialog.Root
        open={cancelandoId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCancelandoId(null)
            setMotivoCancelamento("")
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover p-6 shadow-xl outline-none transition-[transform,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
            <Dialog.Title className="text-base font-semibold text-foreground">
              Cancelar pedido
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Informe o motivo do cancelamento. Essa ação não pode ser desfeita.
            </Dialog.Description>

            <div className="mt-4">
              <label
                htmlFor="motivo-cancelamento"
                className="block text-sm font-medium text-foreground"
              >
                Motivo <span className="text-destructive">*</span>
              </label>
              <textarea
                id="motivo-cancelamento"
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                rows={3}
                placeholder="Descreva o motivo do cancelamento…"
                className="mt-1.5 w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close
                disabled={cancelando}
                className="inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                Voltar
              </Dialog.Close>
              <button
                type="button"
                onClick={confirmarCancelamento}
                disabled={!motivoCancelamento.trim() || cancelando}
                className="inline-flex h-9 items-center rounded-md bg-destructive px-4 text-sm font-medium text-white outline-none hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelando ? "Cancelando…" : "Confirmar cancelamento"}
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  hint: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="max-w-xs text-sm leading-relaxed text-muted-foreground text-balance">
        {hint}
      </div>
    </div>
  )
}
