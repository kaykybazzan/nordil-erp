import type { Pedido } from "@/types/domain"
import { actionObterPedidos } from "@/lib/actions/pedidos"
import { actionObterUsuarios } from "@/lib/actions/usuarios"
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
 * Fonte de dados: Prisma via actionObterPedidos/actionObterUsuarios (empresaId
 * já é aplicado no server via sessão — o parâmetro empresaId aqui só é usado
 * para o filtro de período/comparação, não para escopo de tenant).
 *
 * Nota: Não há campo de prazo alvo SLA no domínio, então esse indicador é omitido.
 * Tempos médios são calculados a partir de PedidoEvento, usando usuarioId do evento.
 */
export async function calcularIndicadoresOperacional(
  empresaId: string,
  dataInicio: Date,
  dataFim: Date,
  filtros?: FiltrosOperacional
): Promise<{ indicadores: IndicadoresOperacional; tabela: LinhaTabelaOperacional[] }> {
  const [pedidosResultado, usuariosResultado] = await Promise.all([
    actionObterPedidos(),
    actionObterUsuarios(),
  ])

  const todosPedidos = pedidosResultado.ok && pedidosResultado.data ? pedidosResultado.data : []
  const usuarios = usuariosResultado.ok && usuariosResultado.data ? usuariosResultado.data : []

  // Filtra pedidos por período (empresaId já é escopado no server via sessão)
  const pedidosEmpresa = todosPedidos.filter((pedido) => dataNoPeriodo(pedido.criadoEm, dataInicio, dataFim))

  // Calcula período anterior equivalente
  const { inicio: inicioAnterior, fim: fimAnterior } = periodoAnteriorEquivalente(
    dataInicio,
    dataFim
  )

  const pedidosAnterior = todosPedidos.filter((pedido) => dataNoPeriodo(pedido.criadoEm, inicioAnterior, fimAnterior))

  // Função auxiliar para calcular tempos por pedido
  const calcularTemposPedido = (pedido: Pedido) => {
    const eventos = pedido.eventos

    const separacaoIniciada = eventos.find((e) => e.tipo === "SEPARACAO_INICIADA")
    const separacaoConcluida = eventos.find((e) => e.tipo === "SEPARACAO_CONCLUIDA")
    const tempoSeparacao =
      separacaoIniciada && separacaoConcluida
        ? diferencaHoras(separacaoIniciada.dataHora, separacaoConcluida.dataHora)
        : null

    const conferenciaIniciada = eventos.find((e) => e.tipo === "CONFERENCIA_INICIADA")
    const conferenciaConcluida = eventos.find((e) => e.tipo === "CONFERENCIA_CONCLUIDA")
    const tempoConferencia =
      conferenciaIniciada && conferenciaConcluida
        ? diferencaHoras(conferenciaIniciada.dataHora, conferenciaConcluida.dataHora)
        : null

    const pedidoCriado = eventos.find((e) => e.tipo === "PEDIDO_CRIADO")
    const pedidoExpedido = eventos.find((e) => e.tipo === "PEDIDO_EXPEDIDO")
    const tempoExpedicao =
      pedidoCriado && pedidoExpedido
        ? diferencaHoras(pedidoCriado.dataHora, pedidoExpedido.dataHora)
        : null

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

  const operadoresMap = new Map<string, LinhaTabelaOperacionalTemp>()

  const processarPedidos = (pedidos: Pedido[]) => {
    pedidos.forEach((pedido) => {
      const tempos = calcularTemposPedido(pedido)

      if (tempos.operadorSeparacao) {
        const operador = usuarios.find((u) => u.id === tempos.operadorSeparacao)
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

      if (tempos.operadorConferencia) {
        const operador = usuarios.find((u) => u.id === tempos.operadorConferencia)
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

      if (tempos.operadorExpedicao) {
        const operador = usuarios.find((u) => u.id === tempos.operadorExpedicao)
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