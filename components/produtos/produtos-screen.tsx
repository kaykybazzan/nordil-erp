"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Menu } from "@base-ui/react/menu"
import {
  Search,
  Plus,
  ChevronDown,
  Check,
  Package,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Produto } from "@/types/domain"
import {
  MARCAS,
  MOCK_PRODUTOS,
  formatBRL,
  gerarSku,
  onlyDigits,
} from "@/lib/mock-produtos"
import { ProdutoStatusBadge } from "./produto-status-badge"
import { ProdutoDrawer, type SaveResult } from "./produto-drawer"

type StatusFiltro = "todos" | "ativo" | "inativo"

const PAGE_SIZE = 6

const STATUS_LABEL: Record<StatusFiltro, string> = {
  todos: "Todos",
  ativo: "Ativos",
  inativo: "Inativos",
}

export function ProdutosScreen() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [buscaDebounced, setBuscaDebounced] = useState("")
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>("todos")
  const [filtroMarca, setFiltroMarca] = useState<string>("todas")
  const [visiveis, setVisiveis] = useState(PAGE_SIZE)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<number | null>(null)

  // Carrega dados iniciais (simula skeleton).
  useEffect(() => {
    const t = window.setTimeout(() => {
      setProdutos(MOCK_PRODUTOS)
      setLoading(false)
    }, 700)
    return () => window.clearTimeout(t)
  }, [])

  // Debounce da busca.
  useEffect(() => {
    const t = window.setTimeout(() => setBuscaDebounced(busca), 300)
    return () => window.clearTimeout(t)
  }, [busca])

  // Reseta a paginação quando filtro/busca muda.
  useEffect(() => {
    setVisiveis(PAGE_SIZE)
  }, [buscaDebounced, filtroStatus, filtroMarca])

  // Atalho "/" foca a busca.
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
    return produtos.filter((p) => {
      if (filtroStatus !== "todos" && p.status !== filtroStatus) return false
      if (filtroMarca !== "todas" && p.marca !== filtroMarca) return false
      if (!q) return true
      const nomeMatch = p.nome.toLowerCase().includes(q)
      const skuMatch = p.skuInterno.toLowerCase().includes(q)
      const refMatch =
        p.referenciaComercial?.toLowerCase().includes(q) ?? false
      const barrasMatch =
        qDigits.length > 0 && (p.codigoBarras ?? "").includes(qDigits)
      return nomeMatch || skuMatch || refMatch || barrasMatch
    })
  }, [produtos, buscaDebounced, filtroStatus, filtroMarca])

  const paginados = filtrados.slice(0, visiveis)
  const temMais = filtrados.length > visiveis

  const semProdutos = !loading && produtos.length === 0
  const semResultado = !loading && produtos.length > 0 && filtrados.length === 0

  function abrirNovo() {
    setEditando(null)
    setDrawerOpen(true)
  }

  function abrirEdicao(p: Produto) {
    setEditando(p)
    setDrawerOpen(true)
  }

  const salvarProduto = useCallback(
    async (payload: Produto): Promise<SaveResult> => {
      // Simula latência de rede.
      await new Promise((r) => setTimeout(r, 500))

      // Código de barras duplicado (só valida se preenchido; ignora o próprio).
      if (payload.codigoBarras) {
        const dup = produtos.some(
          (p) =>
            p.id !== payload.id && p.codigoBarras === payload.codigoBarras,
        )
        if (dup) {
          return {
            ok: false,
            error: "Já existe um produto com este código de barras.",
          }
        }
      }

      setProdutos((prev) => {
        const existe = prev.some((p) => p.id === payload.id)
        if (existe) {
          return prev.map((p) => (p.id === payload.id ? payload : p))
        }
        // Novo produto: gera o SKU interno no momento do salvamento.
        const comSku: Produto = {
          ...payload,
          skuInterno: gerarSku(prev),
        }
        return [comSku, ...prev]
      })
      showToast("Produto salvo.")
      return { ok: true }
    },
    [produtos],
  )

  return (
    <div className="flex h-full flex-col">
      {/* Barra superior */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, SKU, referência ou código de barras…"
            aria-label="Buscar produtos"
            className="h-9 w-full rounded-md border border-input bg-card pr-16 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground sm:block">
            /
          </kbd>
        </div>

        {/* Filtro de status */}
        <Menu.Root>
          <Menu.Trigger className="inline-flex h-9 shrink-0 items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 aria-expanded:bg-muted lg:w-40">
            <span className="text-muted-foreground">Status:</span>
            <span className="flex-1 text-left">
              {STATUS_LABEL[filtroStatus]}
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-40">
              <Menu.Popup className="min-w-40 origin-[var(--transform-origin)] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg shadow-black/10 outline-none transition-[transform,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
                {(["todos", "ativo", "inativo"] as StatusFiltro[]).map((f) => (
                  <Menu.Item
                    key={f}
                    onClick={() => setFiltroStatus(f)}
                    className="flex cursor-default items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted"
                  >
                    {STATUS_LABEL[f]}
                    {filtroStatus === f && (
                      <Check className="size-4 text-primary" />
                    )}
                  </Menu.Item>
                ))}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>

        {/* Filtro de marca */}
        <Menu.Root>
          <Menu.Trigger className="inline-flex h-9 shrink-0 items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 aria-expanded:bg-muted lg:w-44">
            <span className="text-muted-foreground">Marca:</span>
            <span className="flex-1 truncate text-left">
              {filtroMarca === "todas" ? "Todas" : filtroMarca}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-40">
              <Menu.Popup className="max-h-72 min-w-44 origin-[var(--transform-origin)] overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg shadow-black/10 outline-none transition-[transform,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
                <Menu.Item
                  onClick={() => setFiltroMarca("todas")}
                  className="flex cursor-default items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted"
                >
                  Todas
                  {filtroMarca === "todas" && (
                    <Check className="size-4 text-primary" />
                  )}
                </Menu.Item>
                {MARCAS.map((m) => (
                  <Menu.Item
                    key={m}
                    onClick={() => setFiltroMarca(m)}
                    className="flex cursor-default items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted"
                  >
                    {m}
                    {filtroMarca === m && (
                      <Check className="size-4 text-primary" />
                    )}
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
            semProdutos &&
              "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
          )}
        >
          <Plus className="size-4" />
          Novo produto
        </button>
      </div>

      {/* Tabela */}
      <div className="mt-4 flex-1 overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <Th>SKU interno</Th>
                <Th>Nome</Th>
                <Th>Marca</Th>
                <Th>Unidade</Th>
                <Th className="text-right">Preço de venda</Th>
                <Th className="text-right">Estoque atual</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <Td>
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    </Td>
                    <Td>
                      <div className="h-4 w-52 animate-pulse rounded bg-muted" />
                    </Td>
                    <Td>
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </Td>
                    <Td>
                      <div className="h-4 w-10 animate-pulse rounded bg-muted" />
                    </Td>
                    <Td className="text-right">
                      <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
                    </Td>
                    <Td className="text-right">
                      <div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted" />
                    </Td>
                    <Td>
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    </Td>
                  </tr>
                ))}

              {!loading &&
                paginados.map((p) => (
                  <tr
                    key={p.id}
                    tabIndex={0}
                    onClick={() => abrirEdicao(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        abrirEdicao(p)
                      }
                    }}
                    className="cursor-pointer border-b border-border outline-none last:border-0 hover:bg-muted/50 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
                  >
                    <Td>
                      <span className="font-mono text-[0.82rem] tabular-nums text-muted-foreground">
                        {p.skuInterno}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-medium text-foreground">
                        {p.nome}
                      </span>
                      {p.referenciaComercial && (
                        <span className="ml-2 font-mono text-[0.68rem] text-muted-foreground">
                          {p.referenciaComercial}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span className="text-foreground">{p.marca}</span>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 font-mono text-[0.68rem] font-semibold text-muted-foreground">
                        {p.unidadeMedida}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <span className="font-mono text-[0.82rem] tabular-nums text-foreground">
                        {formatBRL(p.precoVenda)}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <span
                        className={cn(
                          "font-mono text-[0.82rem] tabular-nums",
                          p.estoqueAtual === 0
                            ? "text-muted-foreground"
                            : "text-foreground",
                        )}
                      >
                        {p.estoqueAtual}
                      </span>
                    </Td>
                    <Td>
                      <ProdutoStatusBadge status={p.status} />
                    </Td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Estados vazios */}
        {semProdutos && (
          <EmptyState
            icon={<Package className="size-6 text-muted-foreground" />}
            title="Nenhum produto cadastrado ainda."
            hint='Comece adicionando o primeiro produto pelo botão "Novo produto".'
          />
        )}
        {semResultado && (
          <EmptyState
            icon={<Search className="size-6 text-muted-foreground" />}
            title="Nenhum produto encontrado com esse filtro."
            hint="Ajuste a busca ou os filtros de status e marca."
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

      <ProdutoDrawer
        open={drawerOpen}
        produto={editando}
        onOpenChange={setDrawerOpen}
        onSave={salvarProduto}
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
