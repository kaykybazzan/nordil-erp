import type { Pedido, StatusPedido } from "@/types/domain"
import { MOCK_PEDIDOS } from "@/lib/mock-pedidos"
import { MOCK_CLIENTES } from "@/lib/mock-clientes"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"
import { compararComPeriodoAnterior, periodoAnteriorEquivalente, dataNoPeriodo, diferencaHoras } from "@/lib/relatorios-utils"

export interface IndicadoresPedidos {
  totalPedidos: ReturnType<typeof compararComPeriodoAnterior>
  cancelados: ReturnType<typeof compararComPeriodoAnterior>
  expedidos: ReturnType<typeof compararComPeriodoAnterior>
  ticketMedio: ReturnType<typeof compararComPeriodoAnterior>
  valorVendido: ReturnType<typeof compararComPeriodoAnterior>
}

export interface FiltrosPedidos {
  status?: StatusPedido
  clienteId?: string
  vendedorId?: string
}

export interface LinhaTabelaPedidos {
  numero: number
  cliente: string
  vendedor: string
  status: StatusPedido
  dataCriacao: string
  dataExpedicao: string | null
  tempoCriacaoExpedicao: number | null // em horas, null se não expedido
}

/**
 * Calcula indicadores do relatório de pedidos para uma empresa em um período.
 * Todos os cálculos filtram por empresaId antes de processar.
 */
export function calcularIndicadoresPedidos(
  empresaId: string,
  dataInicio: Date,
  dataFim: Date,
  filtros?: FiltrosPedidos
): { indicadores: IndicadoresPedidos; tabela: LinhaTabelaPedidos[] } {
  // Filtra pedidos por empresa (via vendedorId) e período
  const pedidosEmpresa = MOCK_PEDIDOS.filter((pedido) => {
    const vendedor = MOCK_USUARIOS.find((u) => u.id === pedido.vendedorId)
    if (!vendedor || vendedor.empresaId !== empresaId) return false
    if (!dataNoPeriodo(pedido.criadoEm, dataInicio, dataFim)) return false
    if (filtros?.status && pedido.status !== filtros.status) return false
    if (filtros?.clienteId && pedido.clienteId !== filtros.clienteId) return false
    if (filtros?.vendedorId && pedido.vendedorId !== filtros.vendedorId) return false
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
    if (filtros?.status && pedido.status !== filtros.status) return false
    if (filtros?.clienteId && pedido.clienteId !== filtros.clienteId) return false
    if (filtros?.vendedorId && pedido.vendedorId !== filtros.vendedorId) return false
    return true
  })

  // Função auxiliar para calcular métricas (excluindo cancelados para valor)
  const calcularMetricas = (pedidos: Pedido[]) => {
    const total = pedidos.length
    const cancelados = pedidos.filter((p) => p.status === "CANCELADO").length
    const expedidos = pedidos.filter((p) => p.status === "EXPEDIDO").length
    const naoCancelados = pedidos.filter((p) => p.status !== "CANCELADO")
    const valorVendido = naoCancelados.reduce((acc, p) => acc + p.valorTotal, 0)
    const ticketMedio = naoCancelados.length > 0 ? valorVendido / naoCancelados.length : 0
    return { total, cancelados, expedidos, valorVendido, ticketMedio }
  }

  const metricasAtual = calcularMetricas(pedidosEmpresa)
  const metricasAnterior = calcularMetricas(pedidosAnterior)

  // Gera dados da tabela
  const tabela: LinhaTabelaPedidos[] = pedidosEmpresa.map((pedido) => {
    const cliente = MOCK_CLIENTES.find((c) => c.id === pedido.clienteId)
    const vendedor = MOCK_USUARIOS.find((u) => u.id === pedido.vendedorId)
    
    // Busca evento de expedição
    const eventoExpedicao = pedido.eventos.find((e) => e.tipo === "PEDIDO_EXPEDIDO")
    const dataExpedicao = eventoExpedicao ? eventoExpedicao.dataHora : null
    
    // Calcula tempo entre criação e expedição (em horas)
    const tempoCriacaoExpedicao =
      pedido.status === "EXPEDIDO" && dataExpedicao
        ? diferencaHoras(pedido.criadoEm, dataExpedicao)
        : null

    return {
      numero: pedido.numero,
      cliente: cliente?.nome || "Desconhecido",
      vendedor: vendedor?.nome || "Desconhecido",
      status: pedido.status,
      dataCriacao: pedido.criadoEm,
      dataExpedicao,
      tempoCriacaoExpedicao,
    }
  })

  return {
    indicadores: {
      totalPedidos: compararComPeriodoAnterior(
        metricasAtual.total,
        metricasAnterior.total
      ),
      cancelados: compararComPeriodoAnterior(
        metricasAtual.cancelados,
        metricasAnterior.cancelados
      ),
      expedidos: compararComPeriodoAnterior(
        metricasAtual.expedidos,
        metricasAnterior.expedidos
      ),
      ticketMedio: compararComPeriodoAnterior(
        metricasAtual.ticketMedio,
        metricasAnterior.ticketMedio
      ),
      valorVendido: compararComPeriodoAnterior(
        metricasAtual.valorVendido,
        metricasAnterior.valorVendido
      ),
    },
    tabela,
  }
}
