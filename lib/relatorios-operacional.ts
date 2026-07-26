import type { Pedido } from "@/types/domain"
import { MOCK_PEDIDOS } from "@/lib/mock-pedidos"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"
import { compararComPeriodoAnterior, periodoAnteriorEquivalente, dataNoPeriodo, diferencaHoras } from "@/lib/relatorios-utils"

export interface IndicadoresOperacional {
  tempoMedioSeparacao: ReturnType<typeof compararComPeriodoAnterior> // em horas
  tempoMedioConferencia: ReturnType<typeof compararComPeriodoAnterior> // em horas
  tempoMedioExpedicao: ReturnType<typeof compararComPeriodoAnterior> // em horas
}

export interface FiltrosOperacional {
  operadorId?: string
}

export interface LinhaTabelaOperacional {
  operador: string
  pedidosSeparados: number
  pedidosConferidos: number
  pedidosExpedidos: number
  tempoMedioSeparacao: number | null // em horas
  tempoMedioConferencia: number | null // em horas
  tempoMedioExpedicao: number | null // em horas
}

// Interface temporária para agregação
interface LinhaTabelaOperacionalTemp {
  operador: string
  pedidosSeparados: number
  pedidosConferidos: number
  pedidosExpedidos: number
  tempoMedioSeparacao: number | null
  tempoMedioConferencia: number | null
  tempoMedioExpedicao: number | null
  temposSeparacao: number[]
  temposConferencia: number[]
  temposExpedicao: number[]
}

/**
 * Calcula indicadores do relatório operacional para uma empresa em um período.
 * Filtra por empresaId antes de processar (via vendedorId do pedido).
 * 
 * Nota: Não há campo de prazo alvo SLA no domínio, então esse indicador é omitido.
 * Tempos médios são calculados a partir de PedidoEvento, usando usuarioId do evento.
 */
export function calcularIndicadoresOperacional(
  empresaId: string,
  dataInicio: Date,
  dataFim: Date,
  filtros?: FiltrosOperacional
): { indicadores: IndicadoresOperacional; tabela: LinhaTabelaOperacional[] } {
  // Filtra pedidos por empresa (via vendedorId) e período
  const pedidosEmpresa = MOCK_PEDIDOS.filter((pedido) => {
    const vendedor = MOCK_USUARIOS.find((u) => u.id === pedido.vendedorId)
    if (!vendedor || vendedor.empresaId !== empresaId) return false
    if (!dataNoPeriodo(pedido.criadoEm, dataInicio, dataFim)) return false
    return true
  })

  // Calcula período anterior equivalente
  const { inicio: inicioAnterior, fim: fimAnterior } = periodoAnteriorEquivalente(
    dataInicio,
    dataFim
  )

  // Filtra pedidos do período anterior
  const pedidosAnterior = MOCK_PEDIDOS.filter((pedido) => {
    const vendedor = MOCK_USUARIOS.find((u) => u.id === pedido.vendedorId)
    if (!vendedor || vendedor.empresaId !== empresaId) return false
    if (!dataNoPeriodo(pedido.criadoEm, inicioAnterior, fimAnterior)) return false
    return true
  })

  // Função auxiliar para calcular tempos por pedido
  const calcularTemposPedido = (pedido: Pedido) => {
    const eventos = pedido.eventos

    // Tempo de separação: SEPARACAO_CONCLUIDA - SEPARACAO_INICIADA
    const separacaoIniciada = eventos.find((e) => e.tipo === "SEPARACAO_INICIADA")
    const separacaoConcluida = eventos.find((e) => e.tipo === "SEPARACAO_CONCLUIDA")
    const tempoSeparacao =
      separacaoIniciada && separacaoConcluida
        ? diferencaHoras(separacaoIniciada.dataHora, separacaoConcluida.dataHora)
        : null

    // Tempo de conferência: CONFERENCIA_CONCLUIDA - CONFERENCIA_INICIADA
    const conferenciaIniciada = eventos.find((e) => e.tipo === "CONFERENCIA_INICIADA")
    const conferenciaConcluida = eventos.find((e) => e.tipo === "CONFERENCIA_CONCLUIDA")
    const tempoConferencia =
      conferenciaIniciada && conferenciaConcluida
        ? diferencaHoras(conferenciaIniciada.dataHora, conferenciaConcluida.dataHora)
        : null

    // Tempo de expedição: PEDIDO_EXPEDIDO - PEDIDO_CRIADO
    const pedidoCriado = eventos.find((e) => e.tipo === "PEDIDO_CRIADO")
    const pedidoExpedido = eventos.find((e) => e.tipo === "PEDIDO_EXPEDIDO")
    const tempoExpedicao =
      pedidoCriado && pedidoExpedido
        ? diferencaHoras(pedidoCriado.dataHora, pedidoExpedido.dataHora)
        : null

    // Operadores responsáveis por cada etapa
    const operadorSeparacao = separacaoConcluida?.usuarioId || null
    const operadorConferencia = conferenciaConcluida?.usuarioId || null
    const operadorExpedicao = pedidoExpedido?.usuarioId || null

    return {
      tempoSeparacao,
      tempoConferencia,
      tempoExpedicao,
      operadorSeparacao,
      operadorConferencia,
      operadorExpedicao,
    }
  }

  // Função auxiliar para calcular métricas agregadas
  const calcularMetricas = (pedidos: Pedido[]) => {
    const temposSeparacao: number[] = []
    const temposConferencia: number[] = []
    const temposExpedicao: number[] = []

    pedidos.forEach((pedido) => {
      const tempos = calcularTemposPedido(pedido)
      if (tempos.tempoSeparacao !== null) temposSeparacao.push(tempos.tempoSeparacao)
      if (tempos.tempoConferencia !== null) temposConferencia.push(tempos.tempoConferencia)
      if (tempos.tempoExpedicao !== null) temposExpedicao.push(tempos.tempoExpedicao)
    })

    const tempoMedioSeparacao =
      temposSeparacao.length > 0
        ? temposSeparacao.reduce((acc, t) => acc + t, 0) / temposSeparacao.length
        : 0
    const tempoMedioConferencia =
      temposConferencia.length > 0
        ? temposConferencia.reduce((acc, t) => acc + t, 0) / temposConferencia.length
        : 0
    const tempoMedioExpedicao =
      temposExpedicao.length > 0
        ? temposExpedicao.reduce((acc, t) => acc + t, 0) / temposExpedicao.length
        : 0

    return { tempoMedioSeparacao, tempoMedioConferencia, tempoMedioExpedicao }
  }

  const metricasAtual = calcularMetricas(pedidosEmpresa)
  const metricasAnterior = calcularMetricas(pedidosAnterior)

  // Gera dados da tabela (agregado por operador)
  const operadoresMap = new Map<string, LinhaTabelaOperacionalTemp>()

  const processarPedidos = (pedidos: Pedido[]) => {
    pedidos.forEach((pedido) => {
      const tempos = calcularTemposPedido(pedido)

      // Agrega por operador de separação
      if (tempos.operadorSeparacao) {
        const operador = MOCK_USUARIOS.find((u) => u.id === tempos.operadorSeparacao)
        if (operador && (!filtros?.operadorId || operador.id === filtros.operadorId)) {
          const atual: LinhaTabelaOperacionalTemp = operadoresMap.get(operador.id) || {
            operador: operador.nome,
            pedidosSeparados: 0,
            pedidosConferidos: 0,
            pedidosExpedidos: 0,
            tempoMedioSeparacao: null,
            tempoMedioConferencia: null,
            tempoMedioExpedicao: null,
            temposSeparacao: [] as number[],
            temposConferencia: [] as number[],
            temposExpedicao: [] as number[],
          }
          atual.pedidosSeparados++
          if (tempos.tempoSeparacao !== null) atual.temposSeparacao.push(tempos.tempoSeparacao)
          operadoresMap.set(operador.id, atual)
        }
      }

      // Agrega por operador de conferência
      if (tempos.operadorConferencia) {
        const operador = MOCK_USUARIOS.find((u) => u.id === tempos.operadorConferencia)
        if (operador && (!filtros?.operadorId || operador.id === filtros.operadorId)) {
          const atual: LinhaTabelaOperacionalTemp = operadoresMap.get(operador.id) || {
            operador: operador.nome,
            pedidosSeparados: 0,
            pedidosConferidos: 0,
            pedidosExpedidos: 0,
            tempoMedioSeparacao: null,
            tempoMedioConferencia: null,
            tempoMedioExpedicao: null,
            temposSeparacao: [] as number[],
            temposConferencia: [] as number[],
            temposExpedicao: [] as number[],
          }
          atual.pedidosConferidos++
          if (tempos.tempoConferencia !== null) atual.temposConferencia.push(tempos.tempoConferencia)
          operadoresMap.set(operador.id, atual)
        }
      }

      // Agrega por operador de expedição
      if (tempos.operadorExpedicao) {
        const operador = MOCK_USUARIOS.find((u) => u.id === tempos.operadorExpedicao)
        if (operador && (!filtros?.operadorId || operador.id === filtros.operadorId)) {
          const atual: LinhaTabelaOperacionalTemp = operadoresMap.get(operador.id) || {
            operador: operador.nome,
            pedidosSeparados: 0,
            pedidosConferidos: 0,
            pedidosExpedidos: 0,
            tempoMedioSeparacao: null,
            tempoMedioConferencia: null,
            tempoMedioExpedicao: null,
            temposSeparacao: [] as number[],
            temposConferencia: [] as number[],
            temposExpedicao: [] as number[],
          }
          atual.pedidosExpedidos++
          if (tempos.tempoExpedicao !== null) atual.temposExpedicao.push(tempos.tempoExpedicao)
          operadoresMap.set(operador.id, atual)
        }
      }
    })
  }

  processarPedidos(pedidosEmpresa)

  // Calcula médias e remove arrays temporários
  const tabela: LinhaTabelaOperacional[] = Array.from(operadoresMap.values()).map((linha): LinhaTabelaOperacional => ({
    operador: linha.operador,
    pedidosSeparados: linha.pedidosSeparados,
    pedidosConferidos: linha.pedidosConferidos,
    pedidosExpedidos: linha.pedidosExpedidos,
    tempoMedioSeparacao:
      linha.temposSeparacao.length > 0
        ? linha.temposSeparacao.reduce((acc: number, t: number) => acc + t, 0) / linha.temposSeparacao.length
        : null,
    tempoMedioConferencia:
      linha.temposConferencia.length > 0
        ? linha.temposConferencia.reduce((acc: number, t: number) => acc + t, 0) / linha.temposConferencia.length
        : null,
    tempoMedioExpedicao:
      linha.temposExpedicao.length > 0
        ? linha.temposExpedicao.reduce((acc: number, t: number) => acc + t, 0) / linha.temposExpedicao.length
        : null,
  }))

  // Ordena por nome do operador
  tabela.sort((a, b) => a.operador.localeCompare(b.operador))

  return {
    indicadores: {
      tempoMedioSeparacao: compararComPeriodoAnterior(
        metricasAtual.tempoMedioSeparacao,
        metricasAnterior.tempoMedioSeparacao
      ),
      tempoMedioConferencia: compararComPeriodoAnterior(
        metricasAtual.tempoMedioConferencia,
        metricasAnterior.tempoMedioConferencia
      ),
      tempoMedioExpedicao: compararComPeriodoAnterior(
        metricasAtual.tempoMedioExpedicao,
        metricasAnterior.tempoMedioExpedicao
      ),
    },
    tabela,
  }
}
