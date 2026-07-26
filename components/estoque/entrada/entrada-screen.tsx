"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  X,
  ChevronDown,
  TriangleAlert,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { EntradaEstoque, EntradaItem, Produto } from "@/types/domain"
import {
  MOCK_FORNECEDORES,
  MOCK_ENTRADAS,
  gerarIdEntrada,
  calcularTotalEntrada,
  formatDataBR,
  formatDataHoraBR,
  hoje,
  isDuplicata,
} from "@/lib/mock-entradas"
import { MOCK_PRODUTOS, formatBRL } from "@/lib/mock-produtos"

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

type Linha = {
  id: string
  produto: Produto | null
  quantidade: string
  custoUnitario: string
  // estado do seletor de produto
  busca: string
  seletorAberto: boolean
}

type Vista = "historico" | "nova-entrada" | "visualizar"

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

function novaLinha(): Linha {
  return {
    id: crypto.randomUUID(),
    produto: null,
    quantidade: "",
    custoUnitario: "",
    busca: "",
    seletorAberto: false,
  }
}

function parseNum(v: string): number {
  const n = parseFloat(v.replace(",", "."))
  return Number.isFinite(n) && n > 0 ? n : 0
}

function subtotal(linha: Linha): number {
  return parseNum(linha.quantidade) * parseNum(linha.custoUnitario)
}

function linhaCompleta(l: Linha): boolean {
  return (
    l.produto !== null &&
    parseNum(l.quantidade) > 0 &&
    parseNum(l.custoUnitario) > 0
  )
}

function buscarProdutos(q: string): Produto[] {
  if (!q.trim()) return MOCK_PRODUTOS.slice(0, 8)
  const t = q.toLowerCase()
  return MOCK_PRODUTOS.filter(
    (p) =>
      p.nome.toLowerCase().includes(t) ||
      p.skuInterno.toLowerCase().includes(t) ||
      (p.codigoBarras ?? "").includes(t)
  ).slice(0, 8)
}

function nomeFornecedor(id: string): string {
  return MOCK_FORNECEDORES.find((f) => f.id === id)?.nome ?? "—"
}

function totalItens(entrada: EntradaEstoque): number {
  return entrada.itens.reduce((a, i) => a + i.quantidade, 0)
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function EntradaScreen() {
  const [entradas, setEntradas] = useState<EntradaEstoque[]>([...MOCK_ENTRADAS])
  const [vista, setVista] = useState<Vista>("historico")
  const [entradaEmVisao, setEntradaEmVisao] = useState<EntradaEstoque | null>(null)

  // --- Filtros do histórico ---
  const [busca, setBusca] = useState("")
  const [filtroFornecedor, setFiltroFornecedor] = useState("todos")
  const [filtroMenuAberto, setFiltroMenuAberto] = useState(false)
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")

  // --- Formulário de nova entrada ---
  const [fornecedorId, setFornecedorId] = useState("")
  const [fornecedorBusca, setFornecedorBusca] = useState("")
  const [fornecedorMenuAberto, setFornecedorMenuAberto] = useState(false)
  const [numeroNF, setNumeroNF] = useState("")
  const [serie, setSerie] = useState("")
  const [dataEmissao, setDataEmissao] = useState("")
  const [dataRecebimento, setDataRecebimento] = useState(hoje())
  const [observacao, setObservacao] = useState("")
  const [linhas, setLinhas] = useState<Linha[]>([novaLinha()])
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState("")
  const [aviso, setAviso] = useState("")

  const fornecedorInputRef = useRef<HTMLInputElement>(null)
  const fornecedorMenuRef = useRef<HTMLDivElement>(null)
  const filtroMenuRef = useRef<HTMLDivElement>(null)

  // ---------------------------------------------------------------------------
  // Histórico filtrado
  // ---------------------------------------------------------------------------

  const historicoFiltrado = useMemo(() => {
    return [...entradas]
      .sort(
        (a, b) =>
          new Date(b.dataRecebimento).getTime() -
          new Date(a.dataRecebimento).getTime()
      )
      .filter((e) => {
        if (filtroFornecedor !== "todos" && e.fornecedorId !== filtroFornecedor)
          return false
        if (dataInicio && e.dataRecebimento < dataInicio) return false
        if (dataFim && e.dataRecebimento > dataFim) return false
        if (busca.trim()) {
          const t = busca.toLowerCase()
          return (
            e.numeroNF.toLowerCase().includes(t) ||
            nomeFornecedor(e.fornecedorId).toLowerCase().includes(t)
          )
        }
        return true
      })
  }, [entradas, filtroFornecedor, dataInicio, dataFim, busca])

  // ---------------------------------------------------------------------------
  // Close-on-outside-click para menus do filtro e fornecedor
  // ---------------------------------------------------------------------------

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        filtroMenuRef.current &&
        !filtroMenuRef.current.contains(e.target as Node)
      ) {
        setFiltroMenuAberto(false)
      }
      if (
        fornecedorMenuRef.current &&
        !fornecedorMenuRef.current.contains(e.target as Node)
      ) {
        setFornecedorMenuAberto(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Fecha menus de seletor de produto ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node
      const dentro = document.querySelectorAll("[data-produto-seletor]")
      let algum = false
      dentro.forEach((el) => { if (el.contains(target)) algum = true })
      if (!algum) {
        setLinhas((prev) =>
          prev.map((l) => (l.seletorAberto ? { ...l, seletorAberto: false } : l))
        )
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ---------------------------------------------------------------------------
  // Aviso de NF duplicada
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (fornecedorId && numeroNF && isDuplicata(entradas, fornecedorId, numeroNF)) {
      setAviso(
        "Já existe uma entrada com esta nota fiscal deste fornecedor. Deseja continuar?"
      )
    } else {
      setAviso("")
    }
  }, [fornecedorId, numeroNF, entradas])

  // ---------------------------------------------------------------------------
  // Validação do botão Salvar
  // ---------------------------------------------------------------------------

  const podeSalvar = useMemo(() => {
    if (!fornecedorId || !numeroNF.trim() || !dataEmissao || !dataRecebimento)
      return false
    return linhas.some(linhaCompleta)
  }, [fornecedorId, numeroNF, dataEmissao, dataRecebimento, linhas])

  // ---------------------------------------------------------------------------
  // Ações sobre linhas
  // ---------------------------------------------------------------------------

  const adicionarLinha = useCallback(() => {
    setLinhas((prev) => [...prev, novaLinha()])
  }, [])

  const removerLinha = useCallback((id: string) => {
    setLinhas((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((l) => l.id !== id)
    })
  }, [])

  const atualizarLinha = useCallback(
    (id: string, patch: Partial<Linha>) => {
      setLinhas((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
      )
    },
    []
  )

  const selecionarProduto = useCallback(
    (linhaId: string, produto: Produto) => {
      setLinhas((prev) =>
        prev.map((l) =>
          l.id === linhaId
            ? {
                ...l,
                produto,
                busca: produto.nome,
                seletorAberto: false,
              }
            : l
        )
      )
    },
    []
  )

  // Enter no último campo de uma linha → adiciona linha em branco
  function handleLinhaKeyDown(
    e: React.KeyboardEvent,
    linhaId: string,
    campo: "quantidade" | "custo"
  ) {
    if (e.nativeEvent.isComposing) return
    if (e.key !== "Enter") return
    e.preventDefault()
    const idx = linhas.findIndex((l) => l.id === linhaId)
    const linha = linhas[idx]
    // só adiciona se o campo atual está preenchido e é o último campo da linha
    if (campo === "custo" && linha?.produto && parseNum(linha.quantidade) > 0) {
      // se é a última linha, adiciona uma nova
      if (idx === linhas.length - 1) {
        adicionarLinha()
        // foca a busca de produto da nova linha (tentativa por timeout)
        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>(
            "[data-produto-busca]"
          )
          inputs[inputs.length - 1]?.focus()
        }, 50)
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Salvar entrada
  // ---------------------------------------------------------------------------

  async function handleSalvar() {
    if (!podeSalvar || salvando) return
    setSalvando(true)
    setErroSalvar("")

    await new Promise((r) => setTimeout(r, 900))

    // Simula erro randômico com 10% de chance para demonstrar o estado de erro
    // (remover em produção — apenas para fins de demonstração)
    // if (Math.random() < 0.1) { setSalvando(false); setErroSalvar("Falha de comunicação com o servidor. Tente novamente."); return; }

    const itens: EntradaItem[] = linhas
      .filter(linhaCompleta)
      .map((l) => ({
        produtoId: l.produto!.id,
        quantidade: parseNum(l.quantidade),
        custoUnitario: parseNum(l.custoUnitario),
      }))

    const nova: EntradaEstoque = {
      id: gerarIdEntrada(),
      fornecedorId,
      numeroNF: numeroNF.trim(),
      serie: serie.trim() || undefined,
      dataEmissao,
      dataRecebimento,
      observacao: observacao.trim() || undefined,
      itens,
      lancadoPor: "Bruno Teixeira",
      dataHoraLancamento: new Date().toISOString(),
    }

    setEntradas((prev) => [nova, ...prev])
    setSalvando(false)
    resetFormulario()
    setVista("historico")

    // Toast inline via estado temporário
    setToastMsg(`Entrada registrada. ${itens.length} ${itens.length === 1 ? "item lançado" : "itens lançados"}.`)
    setTimeout(() => setToastMsg(""), 4000)
  }

  function resetFormulario() {
    setFornecedorId("")
    setFornecedorBusca("")
    setNumeroNF("")
    setSerie("")
    setDataEmissao("")
    setDataRecebimento(hoje())
    setObservacao("")
    setLinhas([novaLinha()])
    setErroSalvar("")
    setAviso("")
  }

  function abrirNovaEntrada() {
    resetFormulario()
    setVista("nova-entrada")
  }

  function abrirVisualizacao(entrada: EntradaEstoque) {
    setEntradaEmVisao(entrada)
    setVista("visualizar")
  }

  function voltarHistorico() {
    setVista("historico")
    setEntradaEmVisao(null)
  }

  const [toastMsg, setToastMsg] = useState("")

  // ---------------------------------------------------------------------------
  // Fornecedores filtrados para o seletor
  // ---------------------------------------------------------------------------

  const fornecedoresFiltrados = useMemo(() => {
    if (!fornecedorBusca.trim()) return MOCK_FORNECEDORES
    const t = fornecedorBusca.toLowerCase()
    return MOCK_FORNECEDORES.filter((f) => f.nome.toLowerCase().includes(t))
  }, [fornecedorBusca])

  // ---------------------------------------------------------------------------
  // Totalizadores do formulário
  // ---------------------------------------------------------------------------

  const totalLinhas = useMemo(
    () => linhas.reduce((acc, l) => acc + subtotal(l), 0),
    [linhas]
  )

  const totalItensFormulario = useMemo(
    () =>
      linhas.reduce((acc, l) => acc + (parseNum(l.quantidade) || 0), 0),
    [linhas]
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Toast */}
      {toastMsg && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg text-sm font-medium text-foreground"
          role="status"
          aria-live="polite"
        >
          <span className="size-2 rounded-full bg-success shrink-0" />
          {toastMsg}
        </div>
      )}

      {vista === "historico" && (
        <VistaHistorico
          historico={historicoFiltrado}
          busca={busca}
          onBusca={setBusca}
          filtroFornecedor={filtroFornecedor}
          onFiltroFornecedor={setFiltroFornecedor}
          filtroMenuAberto={filtroMenuAberto}
          onToggleFiltroMenu={() => setFiltroMenuAberto((v) => !v)}
          filtroMenuRef={filtroMenuRef}
          dataInicio={dataInicio}
          onDataInicio={setDataInicio}
          dataFim={dataFim}
          onDataFim={setDataFim}
          onNovaEntrada={abrirNovaEntrada}
          onVisualizar={abrirVisualizacao}
        />
      )}

      {vista === "nova-entrada" && (
        <VistaFormulario
          fornecedorId={fornecedorId}
          fornecedorBusca={fornecedorBusca}
          onFornecedorBusca={(v) => { setFornecedorBusca(v); setFornecedorMenuAberto(true) }}
          fornecedorMenuAberto={fornecedorMenuAberto}
          onToggleFornecedorMenu={() => setFornecedorMenuAberto((v) => !v)}
          fornecedorMenuRef={fornecedorMenuRef}
          fornecedorInputRef={fornecedorInputRef}
          fornecedoresFiltrados={fornecedoresFiltrados}
          onSelecionarFornecedor={(f) => {
            setFornecedorId(f.id)
            setFornecedorBusca(f.nome)
            setFornecedorMenuAberto(false)
          }}
          numeroNF={numeroNF}
          onNumeroNF={setNumeroNF}
          serie={serie}
          onSerie={setSerie}
          dataEmissao={dataEmissao}
          onDataEmissao={setDataEmissao}
          dataRecebimento={dataRecebimento}
          onDataRecebimento={setDataRecebimento}
          observacao={observacao}
          onObservacao={setObservacao}
          linhas={linhas}
          onAtualizarLinha={atualizarLinha}
          onSelecionarProduto={selecionarProduto}
          onRemoverLinha={removerLinha}
          onAdicionarLinha={adicionarLinha}
          onLinhaKeyDown={handleLinhaKeyDown}
          totalLinhas={totalLinhas}
          totalItens={totalItensFormulario}
          podeSalvar={podeSalvar}
          salvando={salvando}
          onSalvar={handleSalvar}
          onVoltar={voltarHistorico}
          erroSalvar={erroSalvar}
          aviso={aviso}
        />
      )}

      {vista === "visualizar" && entradaEmVisao && (
        <VistaVisualizacao
          entrada={entradaEmVisao}
          onVoltar={voltarHistorico}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vista: Histórico
// ---------------------------------------------------------------------------

function VistaHistorico({
  historico,
  busca,
  onBusca,
  filtroFornecedor,
  onFiltroFornecedor,
  filtroMenuAberto,
  onToggleFiltroMenu,
  filtroMenuRef,
  dataInicio,
  onDataInicio,
  dataFim,
  onDataFim,
  onNovaEntrada,
  onVisualizar,
}: {
  historico: EntradaEstoque[]
  busca: string
  onBusca: (v: string) => void
  filtroFornecedor: string
  onFiltroFornecedor: (v: string) => void
  filtroMenuAberto: boolean
  onToggleFiltroMenu: () => void
  filtroMenuRef: React.RefObject<HTMLDivElement | null>
  dataInicio: string
  onDataInicio: (v: string) => void
  dataFim: string
  onDataFim: (v: string) => void
  onNovaEntrada: () => void
  onVisualizar: (e: EntradaEstoque) => void
}) {
  const nomeFornAtivo =
    filtroFornecedor === "todos"
      ? null
      : MOCK_FORNECEDORES.find((f) => f.id === filtroFornecedor)?.nome

  return (
    <div className="flex flex-col gap-4">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Busca */}
        <div className="relative flex-1 min-w-52">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="search"
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder="Buscar por Nº NF ou fornecedor…"
            className="h-9 w-full rounded-lg border border-input bg-card pl-8 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          {busca && (
            <button
              type="button"
              onClick={() => onBusca("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filtro Fornecedor */}
        <div className="relative" ref={filtroMenuRef}>
          <button
            type="button"
            onClick={onToggleFiltroMenu}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-colors",
              nomeFornAtivo
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-foreground hover:bg-muted"
            )}
          >
            {nomeFornAtivo ?? "Fornecedor"}
            <ChevronDown className="size-4" />
          </button>
          {filtroMenuAberto && (
            <div className="absolute left-0 top-full mt-1 z-30 min-w-48 rounded-lg border border-border bg-card shadow-lg p-1">
              <button
                type="button"
                onClick={() => { onFiltroFornecedor("todos"); onToggleFiltroMenu() }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded hover:bg-muted",
                  filtroFornecedor === "todos" && "bg-primary/10 text-primary font-medium"
                )}
              >
                Todos
              </button>
              {MOCK_FORNECEDORES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { onFiltroFornecedor(f.id); onToggleFiltroMenu() }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded hover:bg-muted",
                    filtroFornecedor === f.id && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  {f.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Intervalo de datas */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => onDataInicio(e.target.value)}
            className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-label="Data de início"
          />
          <span className="text-sm text-muted-foreground">até</span>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => onDataFim(e.target.value)}
            className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-label="Data de fim"
          />
          {(dataInicio || dataFim) && (
            <button
              type="button"
              onClick={() => { onDataInicio(""); onDataFim("") }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Limpar intervalo"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Nova Entrada */}
        <button
          type="button"
          onClick={onNovaEntrada}
          className="ml-auto inline-flex items-center gap-2 h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 shrink-0"
        >
          <Plus className="size-4" />
          Nova Entrada
        </button>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {historico.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-6">
            <p className="text-sm font-medium text-foreground">Nenhuma entrada registrada ainda.</p>
            <p className="text-sm text-muted-foreground text-balance max-w-sm">
              {busca || filtroFornecedor !== "todos" || dataInicio || dataFim
                ? "Nenhuma entrada corresponde aos filtros aplicados."
                : "Use o botão abaixo para registrar a primeira nota fiscal de entrada."}
            </p>
            {!busca && filtroFornecedor === "todos" && !dataInicio && !dataFim && (
              <button
                type="button"
                onClick={onNovaEntrada}
                className="inline-flex items-center gap-2 h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Plus className="size-4" />
                Nova Entrada
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Nº NF</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Fornecedor</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Recebimento</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">Itens</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">Valor total</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Lançado por</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Data/hora</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((e, i) => (
                <tr
                  key={e.id}
                  className={cn(
                    "border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-muted/50",
                    i % 2 === 1 && "bg-muted/20"
                  )}
                  onClick={() => onVisualizar(e)}
                  tabIndex={0}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") onVisualizar(e)
                  }}
                  role="button"
                  aria-label={`Ver entrada NF ${e.numeroNF}`}
                >
                  <td className="px-4 py-3 font-mono tabular-nums text-foreground font-medium">
                    {e.numeroNF}
                    {e.serie && (
                      <span className="ml-1.5 text-xs text-muted-foreground">/{e.serie}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground">{nomeFornecedor(e.fornecedorId)}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-foreground">{formatDataBR(e.dataRecebimento)}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-right text-foreground">
                    {totalItens(e)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-right text-foreground">
                    {formatBRL(calcularTotalEntrada(e))}
                  </td>
                  <td className="px-4 py-3 text-foreground">{e.lancadoPor}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground text-sm">
                    {formatDataHoraBR(e.dataHoraLancamento)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vista: Formulário de Nova Entrada
// ---------------------------------------------------------------------------

function VistaFormulario({
  fornecedorId,
  fornecedorBusca,
  onFornecedorBusca,
  fornecedorMenuAberto,
  onToggleFornecedorMenu,
  fornecedorMenuRef,
  fornecedorInputRef,
  fornecedoresFiltrados,
  onSelecionarFornecedor,
  numeroNF,
  onNumeroNF,
  serie,
  onSerie,
  dataEmissao,
  onDataEmissao,
  dataRecebimento,
  onDataRecebimento,
  observacao,
  onObservacao,
  linhas,
  onAtualizarLinha,
  onSelecionarProduto,
  onRemoverLinha,
  onAdicionarLinha,
  onLinhaKeyDown,
  totalLinhas,
  totalItens,
  podeSalvar,
  salvando,
  onSalvar,
  onVoltar,
  erroSalvar,
  aviso,
}: {
  fornecedorId: string
  fornecedorBusca: string
  onFornecedorBusca: (v: string) => void
  fornecedorMenuAberto: boolean
  onToggleFornecedorMenu: () => void
  fornecedorMenuRef: React.RefObject<HTMLDivElement | null>
  fornecedorInputRef: React.RefObject<HTMLInputElement | null>
  fornecedoresFiltrados: typeof MOCK_FORNECEDORES
  onSelecionarFornecedor: (f: typeof MOCK_FORNECEDORES[0]) => void
  numeroNF: string
  onNumeroNF: (v: string) => void
  serie: string
  onSerie: (v: string) => void
  dataEmissao: string
  onDataEmissao: (v: string) => void
  dataRecebimento: string
  onDataRecebimento: (v: string) => void
  observacao: string
  onObservacao: (v: string) => void
  linhas: Linha[]
  onAtualizarLinha: (id: string, patch: Partial<Linha>) => void
  onSelecionarProduto: (linhaId: string, produto: Produto) => void
  onRemoverLinha: (id: string) => void
  onAdicionarLinha: () => void
  onLinhaKeyDown: (
    e: React.KeyboardEvent,
    linhaId: string,
    campo: "quantidade" | "custo"
  ) => void
  totalLinhas: number
  totalItens: number
  podeSalvar: boolean
  salvando: boolean
  onSalvar: () => void
  onVoltar: () => void
  erroSalvar: string
  aviso: string
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho de navegação */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onVoltar}
          disabled={salvando}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-50"
        >
          <ArrowLeft className="size-4" />
          Histórico
        </button>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-sm font-medium text-foreground">Nova Entrada</span>
      </div>

      {/* Aviso de NF duplicada */}
      {aviso && (
        <div className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning/8 px-4 py-3 text-sm text-warning-foreground">
          <TriangleAlert className="size-4 shrink-0 mt-0.5 text-warning" />
          <span>{aviso}</span>
        </div>
      )}

      {/* Erro de salvamento */}
      {erroSalvar && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0 mt-0.5" />
          <span>{erroSalvar}</span>
        </div>
      )}

      {/* Card principal */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">

        {/* Cabeçalho do formulário */}
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Dados da Nota Fiscal</h2>
        </div>

        <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 xl:grid-cols-6">

          {/* Fornecedor */}
          <div className="col-span-2 flex flex-col gap-1.5" ref={fornecedorMenuRef}>
            <label className="text-xs font-medium text-muted-foreground">
              Fornecedor <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                ref={fornecedorInputRef}
                type="text"
                value={fornecedorBusca}
                onChange={(e) => onFornecedorBusca(e.target.value)}
                onFocus={() => onToggleFornecedorMenu()}
                placeholder="Buscar fornecedor…"
                disabled={salvando}
                className={cn(
                  "h-9 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted/50 disabled:cursor-not-allowed",
                  fornecedorId ? "border-input" : "border-input"
                )}
              />
              {fornecedorMenuAberto && fornecedoresFiltrados.length > 0 && (
                <div className="absolute left-0 top-full mt-1 z-30 w-full min-w-48 rounded-lg border border-border bg-card shadow-lg max-h-52 overflow-y-auto p-1">
                  {fornecedoresFiltrados.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); onSelecionarFornecedor(f) }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded hover:bg-muted",
                        fornecedorId === f.id && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      {f.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Número da NF */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ent-nf" className="text-xs font-medium text-muted-foreground">
              Nº da NF <span className="text-destructive">*</span>
            </label>
            <input
              id="ent-nf"
              type="text"
              value={numeroNF}
              onChange={(e) => onNumeroNF(e.target.value)}
              placeholder="Ex.: 001234"
              disabled={salvando}
              className="h-9 rounded-lg border border-input bg-background px-3 font-mono text-sm tabular-nums text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted/50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Série */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ent-serie" className="text-xs font-medium text-muted-foreground">
              Série
            </label>
            <input
              id="ent-serie"
              type="text"
              value={serie}
              onChange={(e) => onSerie(e.target.value)}
              placeholder="Opcional"
              disabled={salvando}
              className="h-9 rounded-lg border border-input bg-background px-3 font-mono text-sm tabular-nums text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted/50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Data de emissão */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ent-emissao" className="text-xs font-medium text-muted-foreground">
              Data de emissão <span className="text-destructive">*</span>
            </label>
            <input
              id="ent-emissao"
              type="date"
              value={dataEmissao}
              onChange={(e) => onDataEmissao(e.target.value)}
              disabled={salvando}
              className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted/50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Data de recebimento */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ent-recebimento" className="text-xs font-medium text-muted-foreground">
              Data de recebimento <span className="text-destructive">*</span>
            </label>
            <input
              id="ent-recebimento"
              type="date"
              value={dataRecebimento}
              onChange={(e) => onDataRecebimento(e.target.value)}
              disabled={salvando}
              className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted/50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Observação — ocupa toda a largura */}
          <div className="col-span-full flex flex-col gap-1.5">
            <label htmlFor="ent-obs" className="text-xs font-medium text-muted-foreground">
              Observação
            </label>
            <input
              id="ent-obs"
              type="text"
              value={observacao}
              onChange={(e) => onObservacao(e.target.value)}
              placeholder="Opcional"
              disabled={salvando}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted/50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Grade de itens */}
        <div className="border-t border-border">
          <div className="px-5 py-3 flex items-center justify-between border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground">Itens</h3>
          </div>

          {/* Cabeçalho da grade */}
          <div className="grid grid-cols-[1fr_120px_140px_140px_120px_40px] gap-0 border-b border-border bg-muted/40 px-4 py-2.5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Produto</div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">SKU</div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 text-right">Quantidade</div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 text-right">Custo unitário</div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 text-right">Subtotal</div>
            <div />
          </div>

          {/* Linhas */}
          <div
            className={cn(
              "overflow-y-auto",
              salvando && "pointer-events-none opacity-60"
            )}
            style={{ maxHeight: "320px" }}
          >
            {linhas.map((linha, idx) => (
              <LinhaItem
                key={linha.id}
                linha={linha}
                index={idx}
                soUma={linhas.length === 1}
                onAtualizar={(patch) => onAtualizarLinha(linha.id, patch)}
                onSelecionar={(produto) => onSelecionarProduto(linha.id, produto)}
                onRemover={() => onRemoverLinha(linha.id)}
                onKeyDown={(e, campo) => onLinhaKeyDown(e, linha.id, campo)}
              />
            ))}
          </div>

          {/* Botão adicionar linha */}
          <div className="px-4 py-3 border-t border-border">
            <button
              type="button"
              onClick={onAdicionarLinha}
              disabled={salvando}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium disabled:pointer-events-none disabled:opacity-50"
            >
              <Plus className="size-4" />
              Adicionar Linha
            </button>
          </div>

          {/* Totalizador */}
          <div className="border-t border-border px-4 py-3 bg-muted/20 flex items-center justify-between">
            <p className="text-sm text-muted-foreground font-mono tabular-nums">
              {linhas.filter(linhaCompleta).length}{" "}
              {linhas.filter(linhaCompleta).length === 1 ? "item completo" : "itens completos"}
              {totalItens > 0 && (
                <span className="ml-2 text-foreground">
                  · {totalItens.toLocaleString("pt-BR")} {totalItens === 1 ? "unidade" : "unidades"}
                </span>
              )}
            </p>
            <p className="font-mono tabular-nums font-semibold text-foreground text-base">
              {formatBRL(totalLinhas)}
            </p>
          </div>
        </div>

        {/* Rodapé geral */}
        <div className="border-t border-border px-5 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onVoltar}
            disabled={salvando}
            className="h-9 rounded-lg px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSalvar}
            disabled={!podeSalvar || salvando}
            className="inline-flex items-center gap-2 h-9 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          >
            {salvando && (
              <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
            )}
            {salvando ? "Salvando…" : "Salvar Entrada"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Linha da grade de itens
// ---------------------------------------------------------------------------

function LinhaItem({
  linha,
  index,
  soUma,
  onAtualizar,
  onSelecionar,
  onRemover,
  onKeyDown,
}: {
  linha: Linha
  index: number
  soUma: boolean
  onAtualizar: (patch: Partial<Linha>) => void
  onSelecionar: (produto: Produto) => void
  onRemover: () => void
  onKeyDown: (e: React.KeyboardEvent, campo: "quantidade" | "custo") => void
}) {
  const resultados = useMemo(
    () => (linha.seletorAberto ? buscarProdutos(linha.busca) : []),
    [linha.seletorAberto, linha.busca]
  )

  const sub = subtotal(linha)

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_120px_140px_140px_120px_40px] items-center gap-0 border-b border-border last:border-0 px-4 py-2",
        index % 2 === 1 && "bg-muted/10"
      )}
    >
      {/* Seletor de produto */}
      <div className="relative pr-2" data-produto-seletor="">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            data-produto-busca=""
            value={linha.busca}
            onChange={(e) =>
              onAtualizar({
                busca: e.target.value,
                seletorAberto: true,
                produto: linha.busca !== e.target.value ? null : linha.produto,
              })
            }
            onFocus={() => onAtualizar({ seletorAberto: true })}
            placeholder="Buscar produto…"
            className="h-8 w-full rounded border border-input bg-background pl-8 pr-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40"
          />
        </div>
        {linha.seletorAberto && resultados.length > 0 && (
          <div
            className="absolute left-0 top-full mt-1 z-20 w-full min-w-64 rounded-lg border border-border bg-card shadow-lg max-h-52 overflow-y-auto p-1"
            data-produto-seletor=""
          >
            {resultados.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onSelecionar(p) }}
                className="w-full text-left flex items-start gap-2.5 px-3 py-2 rounded text-sm hover:bg-muted"
              >
                <span className="flex flex-col min-w-0">
                  <span className="font-medium text-foreground truncate">
                    {p.nome}
                    {p.status === "inativo" && (
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">(inativo)</span>
                    )}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {p.skuInterno}
                  </span>
                </span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground font-mono tabular-nums">
                  {p.unidadeMedida}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SKU */}
      <div className="px-2">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {linha.produto?.skuInterno ?? "—"}
        </span>
      </div>

      {/* Quantidade */}
      <div className="px-2">
        <input
          type="text"
          inputMode="decimal"
          value={linha.quantidade}
          onChange={(e) =>
            onAtualizar({ quantidade: e.target.value.replace(/[^\d.,]/g, "") })
          }
          onKeyDown={(e) => onKeyDown(e, "quantidade")}
          placeholder="0"
          className="h-8 w-full rounded border border-input bg-background px-2 text-right font-mono text-sm tabular-nums text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40"
        />
      </div>

      {/* Custo unitário */}
      <div className="px-2 relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">
          R$
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={linha.custoUnitario}
          onChange={(e) =>
            onAtualizar({
              custoUnitario: e.target.value.replace(/[^\d.,]/g, ""),
            })
          }
          onKeyDown={(e) => onKeyDown(e, "custo")}
          placeholder="0,00"
          className="h-8 w-full rounded border border-input bg-background pl-8 pr-2 text-right font-mono text-sm tabular-nums text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40"
        />
      </div>

      {/* Subtotal */}
      <div className="px-2 text-right">
        <span className={cn("font-mono text-sm tabular-nums", sub > 0 ? "text-foreground" : "text-muted-foreground")}>
          {sub > 0 ? formatBRL(sub) : "—"}
        </span>
      </div>

      {/* Remover */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={onRemover}
          disabled={soUma}
          aria-label="Remover linha"
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:pointer-events-none disabled:opacity-30"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vista: Visualização (somente leitura)
// ---------------------------------------------------------------------------

function VistaVisualizacao({
  entrada,
  onVoltar,
}: {
  entrada: EntradaEstoque
  onVoltar: () => void
}) {
  const total = calcularTotalEntrada(entrada)

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onVoltar}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Histórico
        </button>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-sm font-medium text-foreground">
          NF {entrada.numeroNF}
          {entrada.serie && <span className="text-muted-foreground">/{entrada.serie}</span>}
          {" "}— {nomeFornecedor(entrada.fornecedorId)}
        </span>
        <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
          Somente leitura
        </span>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Cabeçalho */}
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Dados da Nota Fiscal</h2>
        </div>

        <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 xl:grid-cols-6">
          <Campo label="Fornecedor" span={2}>
            {nomeFornecedor(entrada.fornecedorId)}
          </Campo>
          <Campo label="Nº da NF">
            <span className="font-mono tabular-nums">{entrada.numeroNF}</span>
          </Campo>
          <Campo label="Série">
            {entrada.serie ? (
              <span className="font-mono tabular-nums">{entrada.serie}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Campo>
          <Campo label="Data de emissão">
            <span className="font-mono tabular-nums">{formatDataBR(entrada.dataEmissao)}</span>
          </Campo>
          <Campo label="Data de recebimento">
            <span className="font-mono tabular-nums">{formatDataBR(entrada.dataRecebimento)}</span>
          </Campo>
          {entrada.observacao && (
            <Campo label="Observação" span="full">
              {entrada.observacao}
            </Campo>
          )}
          <Campo label="Lançado por">{entrada.lancadoPor}</Campo>
          <Campo label="Data/hora do lançamento">
            <span className="font-mono tabular-nums text-sm">{formatDataHoraBR(entrada.dataHoraLancamento)}</span>
          </Campo>
        </div>

        {/* Grade de itens */}
        <div className="border-t border-border">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground">Itens</h3>
          </div>

          <div className="grid grid-cols-[1fr_120px_140px_140px_120px] gap-0 border-b border-border bg-muted/40 px-4 py-2.5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Produto</div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">SKU</div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 text-right">Quantidade</div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 text-right">Custo unitário</div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 text-right">Subtotal</div>
          </div>

          {entrada.itens.map((item, i) => {
            const produto = MOCK_PRODUTOS.find((p) => p.id === item.produtoId)
            return (
              <div
                key={item.produtoId}
                className={cn(
                  "grid grid-cols-[1fr_120px_140px_140px_120px] items-center gap-0 border-b border-border last:border-0 px-4 py-2.5",
                  i % 2 === 1 && "bg-muted/10"
                )}
              >
                <div className="pr-2">
                  <span className="text-sm text-foreground">
                    {produto?.nome ?? item.produtoId}
                    {produto?.status === "inativo" && (
                      <span className="ml-1.5 text-xs text-muted-foreground">(inativo)</span>
                    )}
                  </span>
                </div>
                <div className="px-2">
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {produto?.skuInterno ?? "—"}
                  </span>
                </div>
                <div className="px-2 text-right font-mono tabular-nums text-sm text-foreground">
                  {item.quantidade.toLocaleString("pt-BR")}{" "}
                  <span className="text-xs text-muted-foreground">{produto?.unidadeMedida}</span>
                </div>
                <div className="px-2 text-right font-mono tabular-nums text-sm text-foreground">
                  {formatBRL(item.custoUnitario)}
                </div>
                <div className="px-2 text-right font-mono tabular-nums text-sm font-medium text-foreground">
                  {formatBRL(item.quantidade * item.custoUnitario)}
                </div>
              </div>
            )
          })}

          {/* Totalizador */}
          <div className="border-t border-border px-4 py-3 bg-muted/20 flex items-center justify-between">
            <p className="text-sm text-muted-foreground font-mono tabular-nums">
              {entrada.itens.length} {entrada.itens.length === 1 ? "item" : "itens"}
              {" "}· {totalItens(entrada).toLocaleString("pt-BR")} unidades
            </p>
            <p className="font-mono tabular-nums font-semibold text-foreground text-base">
              {formatBRL(total)}
            </p>
          </div>
        </div>

        {/* Rodapé */}
        <div className="border-t border-border px-5 py-4 flex justify-end">
          <button
            type="button"
            onClick={onVoltar}
            className="h-9 rounded-lg px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Utilitário: campo somente leitura
// ---------------------------------------------------------------------------

function Campo({
  label,
  children,
  span,
}: {
  label: string
  children: React.ReactNode
  span?: number | "full"
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        span === "full" && "col-span-full",
        typeof span === "number" && span === 2 && "col-span-2"
      )}
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{children}</span>
    </div>
  )
}
