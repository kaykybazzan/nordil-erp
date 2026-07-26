import type { TipoEstoqueMovimentacao } from "@/types/domain"
import { obterMovimentacoes } from "@/lib/estoque-ledger"
import { MOCK_PRODUTOS } from "@/lib/mock-produtos"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"
import { compararComPeriodoAnterior, periodoAnteriorEquivalente, dataNoPeriodo } from "@/lib/relatorios-utils"

export interface IndicadoresMovimentacoes {
  reservas: ReturnType<typeof compararComPeriodoAnterior>
  liberacoes: ReturnType<typeof compararComPeriodoAnterior>
}

export interface FiltrosMovimentacoes {
  tipo?: TipoEstoqueMovimentacao
  produtoId?: string
  operadorId?: string
}

export interface LinhaTabelaMovimentacoes {
  dataHora: string
  produto: string
  tipo: TipoEstoqueMovimentacao
  quantidade: number
  operador: string
  origem: string // referência ao evento que gerou (pedidoId ou "Ajuste de Inventário")
}

/**
 * Calcula indicadores do relatório de movimentações para uma empresa em um período.
 * Filtra por empresaId antes de processar (via usuarioId da movimentação).
 * 
 * Nota: TipoEstoqueMovimentacao só tem "RESERVA" e "LIBERACAO_RESERVA".
 * Não há tipos "AJUSTE" ou "DIVERGENCIA", então esses indicadores são omitidos.
 * RESERVA representa estoque sendo comprometido por um pedido.
 * LIBERACAO_RESERVA representa liberação de reserva.
 */
export function calcularIndicadoresMovimentacoes(
  empresaId: string,
  dataInicio: Date,
  dataFim: Date,
  filtros?: FiltrosMovimentacoes
): { indicadores: IndicadoresMovimentacoes; tabela: LinhaTabelaMovimentacoes[] } {
  // Filtra movimentações por empresa (via usuarioId) e período
  const movimentacoesEmpresa = obterMovimentacoes().filter((mov) => {
    const operador = MOCK_USUARIOS.find((u) => u.id === mov.usuarioId)
    if (!operador || operador.empresaId !== empresaId) return false
    if (!dataNoPeriodo(mov.dataHora, dataInicio, dataFim)) return false
    if (filtros?.tipo && mov.tipo !== filtros.tipo) return false
    if (filtros?.produtoId && mov.produtoId !== filtros.produtoId) return false
    if (filtros?.operadorId && mov.usuarioId !== filtros.operadorId) return false
    return true
  })

  // Calcula período anterior equivalente
  const { inicio: inicioAnterior, fim: fimAnterior } = periodoAnteriorEquivalente(
    dataInicio,
    dataFim
  )

  // Filtra movimentações do período anterior
  const movimentacoesAnterior = obterMovimentacoes().filter((mov) => {
    const operador = MOCK_USUARIOS.find((u) => u.id === mov.usuarioId)
    if (!operador || operador.empresaId !== empresaId) return false
    if (!dataNoPeriodo(mov.dataHora, inicioAnterior, fimAnterior)) return false
    if (filtros?.tipo && mov.tipo !== filtros.tipo) return false
    if (filtros?.produtoId && mov.produtoId !== filtros.produtoId) return false
    if (filtros?.operadorId && mov.usuarioId !== filtros.operadorId) return false
    return true
  })

  // Função auxiliar para calcular métricas
  const calcularMetricas = (movimentacoes: typeof movimentacoesEmpresa) => {
    const reservas = movimentacoes
      .filter((m) => m.tipo === "RESERVA")
      .reduce((acc, m) => acc + m.quantidade, 0)
    const liberacoes = movimentacoes
      .filter((m) => m.tipo === "LIBERACAO_RESERVA")
      .reduce((acc, m) => acc + m.quantidade, 0)
    return { reservas, liberacoes }
  }

  const metricasAtual = calcularMetricas(movimentacoesEmpresa)
  const metricasAnterior = calcularMetricas(movimentacoesAnterior)

  // Gera dados da tabela
  const tabela: LinhaTabelaMovimentacoes[] = movimentacoesEmpresa.map((mov) => {
    const produto = MOCK_PRODUTOS.find((p) => p.id === mov.produtoId)
    const operador = MOCK_USUARIOS.find((u) => u.id === mov.usuarioId)
    
    // Origem: pedidoId se existir, senão "Ajuste de Inventário"
    const origem = mov.pedidoId ? `Pedido ${mov.pedidoId}` : "Ajuste de Inventário"

    return {
      dataHora: mov.dataHora,
      produto: produto?.nome || "Desconhecido",
      tipo: mov.tipo,
      quantidade: mov.quantidade,
      operador: operador?.nome || "Desconhecido",
      origem,
    }
  })

  // Ordena por data/hora, mais recente primeiro
  tabela.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())

  return {
    indicadores: {
      reservas: compararComPeriodoAnterior(
        metricasAtual.reservas,
        metricasAnterior.reservas
      ),
      liberacoes: compararComPeriodoAnterior(
        metricasAtual.liberacoes,
        metricasAnterior.liberacoes
      ),
    },
    tabela,
  }
}
