import type { Pedido, StatusPedido } from "@/types/domain"
import { actionObterPedidos } from "@/lib/actions/pedidos"
import { listarClientes } from "@/lib/actions/clientes"
import { actionObterUsuarios } from "@/lib/actions/usuarios"
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
 * Fonte: Prisma via actionObterPedidos/actionObterClientes/actionObterUsuarios
 * (empresaId já escopado no server via sessão).
 */
export async function calcularIndicadoresPedidos(
  empresaId: string,
  dataInicio: Date,
  dataFim: Date,
  filtros?: FiltrosPedidos
): Promise<{ indicadores: IndicadoresPedidos; tabela: LinhaTabelaPedidos[] }> {
  const [pedidosResultado, clientesResultado, usuariosResultado] = await Promise.all([
    actionObterPedidos(),
    listarClientes(),
    actionObterUsuarios(),
  ])

  const todosPedidos = pedidosResultado.ok && pedidosResultado.data ? pedidosResultado.data : []
  const clientes = clientesResultado.ok && clientesResultado.data ? clientesResultado.data : []
  const usuarios = usuariosResultado.ok && usuariosResultado.data ? usuariosResultado.data : []

  const aplicarFiltros = (pedido: Pedido, dataInicioFiltro: Date, dataFimFiltro: Date) => {
    if (!dataNoPeriodo(pedido.criadoEm, dataInicioFiltro, dataFimFiltro)) return false
    if (filtros?.status && pedido.status !== filtros.status) return false
    if (filtros?.clienteId && pedido.clienteId !== filtros.clienteId) return false
    if (filtros?.vendedorId && pedido.vendedorId !== filtros.vendedorId) return false
    return true
  }

  const pedidosEmpresa = todosPedidos.filter((pedido) => aplicarFiltros(pedido, dataInicio, dataFim))

  const { inicio: inicioAnterior, fim: fimAnterior } = periodoAnteriorEquivalente(
    dataInicio,
    dataFim
  )

  const pedidosAnterior = todosPedidos.filter((pedido) => aplicarFiltros(pedido, inicioAnterior, fimAnterior))

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

  const tabela: LinhaTabelaPedidos[] = pedidosEmpresa.map((pedido) => {
    const cliente = clientes.find((c) => c.id === pedido.clienteId)
    const vendedor = usuarios.find((u) => u.id === pedido.vendedorId)

    const eventoExpedicao = pedido.eventos.find((e) => e.tipo === "PEDIDO_EXPEDIDO")
    const dataExpedicao = eventoExpedicao ? eventoExpedicao.dataHora : null

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