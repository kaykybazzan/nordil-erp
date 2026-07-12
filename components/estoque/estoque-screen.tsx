"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Menu } from "@base-ui/react/menu"
import { Tooltip } from "@base-ui/react/tooltip"
import {
  Search,
  ChevronDown,
  MoreVertical,
  Eye,
  Clock,
  ArrowRight,
  Package,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Produto } from "@/types/domain"
import {
  CATEGORIAS,
  ESTOQUE_MINIMO_MAP,
  calcularInventario,
  calcularStatusEstoque,
  carregarInventarios,
  obterCategoriaProduto,
  obterFornecedorProduto,
} from "@/lib/mock-inventario"
import { ProdutoDrawer, type SaveResult } from "@/components/produtos/produto-drawer"
import { InventarioStatusBadge } from "./inventario-status-badge"

type FiltroEstoque = "todos" | "baixo" | "zerado"

const PAGE_SIZE = 8

export function EstoqueScreen({
  onProductSelect,
}: {
  onProductSelect?: (produtoId: string) => void
}) {
  const router = useRouter()
  const [inventarios, setInventarios] = useState<ReturnType<typeof carregarInventarios>>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [buscaDebounced, setBuscaDebounced] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas")
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>("todos")
  const [filtroEstoque, setFiltroEstoque] = useState<FiltroEstoque>("todos")
  const [visiveis, setVisiveis] = useState(PAGE_SIZE)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [produtoEmVisao, setProdutoEmVisao] = useState<Produto | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)

  // Carrega dados iniciais.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setInventarios(carregarInventarios())
      setLoading(false)
    }, 700)
    return () => window.clearTimeout(t)
  }, [])

  // Debounce da busca.
  useEffect(() => {
    const t = window.setTimeout(() => setBuscaDebounced(busca), 300)
    return () => window.clearTimeout(t)
  }, [busca])

  // Reseta paginação quando filtro/busca muda.
  useEffect(() => {
    setVisiveis(PAGE_SIZE)
  }, [buscaDebounced, filtroCategoria, filtroFornecedor, filtroEstoque])

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

  // Filtra inventários.
  const filtrados = useMemo(() => {
    return inventarios.filter((inv) => {
      // Busca por nome, SKU, código de barras.
      if (buscaDebounced) {
        const q = buscaDebounced.toLowerCase()
        const match =
          inv.produto.nome.toLowerCase().includes(q) ||
          inv.produto.skuInterno.toLowerCase().includes(q) ||
          (inv.produto.codigoBarras?.toLowerCase().includes(q) ?? false)
        if (!match) return false
      }

      // Filtro de categoria.
      if (filtroCategoria !== "todas" && inv.categoria !== filtroCategoria) {
        return false
      }

      // Filtro de fornecedor.
      if (filtroFornecedor !== "todos" && inv.fornecedor !== filtroFornecedor) {
        return false
      }

      // Filtro de estoque.
      if (filtroEstoque === "baixo" && inv.status !== "baixo") return false
      if (filtroEstoque === "zerado" && inv.status !== "zerado") return false

      return true
    })
  }, [inventarios, buscaDebounced, filtroCategoria, filtroFornecedor, filtroEstoque])

  // Fornecedores únicos disponíveis.
  const fornecedoresDisp = useMemo(() => {
    const fornecedores = new Set(inventarios.map((inv) => inv.fornecedor))
    return Array.from(fornecedores).sort()
  }, [inventarios])

  const handleViewProduto = useCallback(
    (inv: (typeof inventarios)[0]) => {
      setProdutoEmVisao(inv.produto)
      setDrawerOpen(true)
    },
    []
  )

  const handleHistorico = useCallback((inv: (typeof inventarios)[0]) => {
    // Placeholder: navegaria para /estoque/historico?produtoId=...
    const placeholder = `/estoque/historico?produtoId=${inv.produto.id}`
    console.log("[v0] Histórico placeholder:", placeholder)
  }, [])

  const handleEntrada = useCallback((inv: (typeof inventarios)[0]) => {
    // Navega para a tela de Entrada com o produto pré-selecionado.
    router.push(`/estoque/entrada?produtoId=${inv.produto.id}`)
  }, [router])

  const handleInventario = useCallback((inv: (typeof inventarios)[0]) => {
    // Placeholder: navegaria para /estoque/inventario?produtoId=...
    const placeholder = `/estoque/inventario?produtoId=${inv.produto.id}`
    console.log("[v0] Inventário placeholder:", placeholder)
  }, [])

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-muted rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  const mostraVazio = filtrados.length === 0

  return (
    <div className="flex flex-col gap-6">
      {/* Barra de filtros */}
      <div className="flex flex-col gap-3">
        {/* Busca */}
        <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-card h-10">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            placeholder='Procurar por nome, SKU ou código de barras... (atalho: "/")'
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none text-sm placeholder-muted-foreground"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Categoria */}
          <Menu.Root>
            <Menu.Trigger
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium",
                filtroCategoria === "todas"
                  ? "border-border text-foreground hover:bg-muted"
                  : "border-primary bg-primary/5 text-primary"
              )}
            >
              {filtroCategoria === "todas"
                ? "Categoria"
                : filtroCategoria}
              <ChevronDown className="w-4 h-4" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="start" sideOffset={8} className="z-50">
                <Menu.Popup
                  className="bg-card border border-border rounded-lg shadow-lg p-1 min-w-48"
                >
                  <Menu.Item
                    onClick={() => setFiltroCategoria("todas")}
                    className={cn(
                      "px-3 py-2 text-sm rounded cursor-pointer hover:bg-muted",
                      filtroCategoria === "todas"
                        ? "bg-primary/10 text-primary font-medium"
                        : ""
                    )}
                  >
                    Todas
                  </Menu.Item>
                  {CATEGORIAS.map((cat) => (
                    <Menu.Item
                      key={cat}
                      onClick={() => setFiltroCategoria(cat)}
                      className={cn(
                        "px-3 py-2 text-sm rounded cursor-pointer hover:bg-muted",
                        filtroCategoria === cat
                          ? "bg-primary/10 text-primary font-medium"
                          : ""
                      )}
                    >
                      {cat}
                    </Menu.Item>
                  ))}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>

          {/* Filtro Fornecedor */}
          <Menu.Root>
            <Menu.Trigger
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium",
                filtroFornecedor === "todos"
                  ? "border-border text-foreground hover:bg-muted"
                  : "border-primary bg-primary/5 text-primary"
              )}
            >
              {filtroFornecedor === "todos"
                ? "Fornecedor"
                : filtroFornecedor}
              <ChevronDown className="w-4 h-4" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="start" sideOffset={8} className="z-50">
                <Menu.Popup
                  className="bg-card border border-border rounded-lg shadow-lg p-1 min-w-48"
                >
                  <Menu.Item
                    onClick={() => setFiltroFornecedor("todos")}
                    className={cn(
                      "px-3 py-2 text-sm rounded cursor-pointer hover:bg-muted",
                      filtroFornecedor === "todos"
                        ? "bg-primary/10 text-primary font-medium"
                        : ""
                    )}
                  >
                    Todos
                  </Menu.Item>
                  {fornecedoresDisp.map((forn) => (
                    <Menu.Item
                      key={forn}
                      onClick={() => setFiltroFornecedor(forn)}
                      className={cn(
                        "px-3 py-2 text-sm rounded cursor-pointer hover:bg-muted",
                        filtroFornecedor === forn
                          ? "bg-primary/10 text-primary font-medium"
                          : ""
                      )}
                    >
                      {forn}
                    </Menu.Item>
                  ))}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>

          {/* Toggle Estoque baixo */}
          <button
            onClick={() =>
              setFiltroEstoque(filtroEstoque === "todos" ? "baixo" : "todos")
            }
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
              filtroEstoque === "baixo"
                ? "border-warning bg-warning/10 text-warning"
                : "border-border text-foreground hover:bg-muted"
            )}
          >
            Estoque baixo
          </button>

          {/* Toggle Sem estoque */}
          <button
            onClick={() =>
              setFiltroEstoque(filtroEstoque === "todos" ? "zerado" : "todos")
            }
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
              filtroEstoque === "zerado"
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-border text-foreground hover:bg-muted"
            )}
          >
            Sem estoque
          </button>
        </div>
      </div>

      {/* Tabela ou mensagem vazia */}
      {mostraVazio ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
          <Package className="w-12 h-12 opacity-40" />
          {inventarios.length === 0 ? (
            <>
              <p className="font-medium">Nenhum produto cadastrado ainda.</p>
              <p className="text-sm">
                Crie seu primeiro produto na tela de Produtos.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">Nenhum produto encontrado com esse filtro.</p>
              <p className="text-sm">Tente mudar os filtros ou refinar sua busca.</p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Tabela */}
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Produto
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Categoria
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground w-20">
                    Físico
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground w-20">
                    <Tooltip.Root>
                      <Tooltip.Trigger className="inline-flex items-center justify-end gap-1 cursor-help outline-none">
                        Reservado
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1" />
                          <text x="8" y="10" textAnchor="middle" fontSize="10" fill="currentColor" className="font-bold">?</text>
                        </svg>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Positioner sideOffset={8}>
                          <Tooltip.Popup className="bg-foreground text-background px-2 py-1 rounded text-xs max-w-xs">
                            Quantidade comprometida em pedidos aguardando separação.
                          </Tooltip.Popup>
                        </Tooltip.Positioner>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground w-20">
                    Disponível
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground w-20">
                    Mínimo
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground max-w-xs">
                    Última movimentação
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground w-12">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtrados.slice(0, visiveis).map((inv) => (
                  <tr
                    key={inv.produtoId}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {inv.produto.nome}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {inv.produto.skuInterno}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.categoria}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums">
                      {inv.estoqueFisico} {inv.produto.unidadeMedida}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums">
                      {inv.reservado} {inv.produto.unidadeMedida}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums">
                      {inv.disponivel} {inv.produto.unidadeMedida}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums">
                      {inv.estoqueMinimo} {inv.produto.unidadeMedida}
                    </td>
                    <td className="px-4 py-3">
                      <InventarioStatusBadge
                        status={inv.status}
                        tooltip={
                          inv.status === "baixo"
                            ? "Disponível está igual ou abaixo do mínimo definido."
                            : inv.status === "zerado"
                              ? "Produto sem estoque disponível."
                              : "Estoque em nível normal."
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(inv.ultimaMovimentacao).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Menu.Root>
                        <Menu.Trigger
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-muted transition-colors"
                          aria-label="Ações"
                        >
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </Menu.Trigger>
                        <Menu.Portal>
                          <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
                            <Menu.Popup
                              className="bg-card border border-border rounded-lg shadow-lg p-1 w-48"
                            >
                              <Menu.Item
                                onClick={() => handleViewProduto(inv)}
                                className="px-3 py-2 text-sm rounded cursor-pointer hover:bg-muted flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                Ver produto
                              </Menu.Item>
                              <Menu.Item
                                onClick={() => handleHistorico(inv)}
                                className="px-3 py-2 text-sm rounded cursor-pointer hover:bg-muted flex items-center gap-2"
                              >
                                <Clock className="w-4 h-4" />
                                Abrir histórico
                              </Menu.Item>
                              <Menu.Item
                                onClick={() => handleEntrada(inv)}
                                className="px-3 py-2 text-sm rounded cursor-pointer hover:bg-muted flex items-center gap-2"
                              >
                                <ArrowRight className="w-4 h-4" />
                                Ir para Entrada
                              </Menu.Item>
                              <Menu.Item
                                onClick={() => handleInventario(inv)}
                                className="px-3 py-2 text-sm rounded cursor-pointer hover:bg-muted flex items-center gap-2"
                              >
                                <Package className="w-4 h-4" />
                                Ir para Inventário
                              </Menu.Item>
                            </Menu.Popup>
                          </Menu.Positioner>
                        </Menu.Portal>
                      </Menu.Root>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Carregar mais */}
          {visiveis < filtrados.length && (
            <button
              onClick={() => setVisiveis((prev) => prev + PAGE_SIZE)}
              className="mx-auto px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors"
            >
              Carregar mais
            </button>
          )}
        </>
      )}

      {/* Drawer de visualização de produto (somente leitura) */}
      <ProdutoDrawer
        open={drawerOpen}
        produto={produtoEmVisao}
        onOpenChange={setDrawerOpen}
        onSave={async () => ({ ok: true })}
        readonly={true}
      />
    </div>
  )
}
