/**
 * Utilitários para cálculos de relatórios.
 * Funções de comparação de período e helpers comuns.
 */

export interface ComparacaoPeriodo {
  valorAtual: number
  valorAnterior: number
  variacaoPercentual: number | null // null se valorAnterior for 0
}

/**
 * Compara um valor atual com um valor anterior, calculando variação percentual.
 * Retorna null para variação percentual se valorAnterior for 0 (evita divisão por zero).
 */
export function compararComPeriodoAnterior(
  valorAtual: number,
  valorAnterior: number
): ComparacaoPeriodo {
  const variacaoPercentual =
    valorAnterior === 0
      ? null
      : ((valorAtual - valorAnterior) / valorAnterior) * 100
  return { valorAtual, valorAnterior, variacaoPercentual }
}

/**
 * Calcula o período imediatamente anterior, de mesma duração.
 * Exemplo: se o filtro é 1-30 de junho, o anterior é 2-31 de maio.
 */
export function periodoAnteriorEquivalente(
  dataInicio: Date,
  dataFim: Date
): { inicio: Date; fim: Date } {
  const duracaoDias = Math.ceil(
    (dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)
  )
  const inicio = new Date(dataInicio)
  inicio.setDate(inicio.getDate() - duracaoDias)
  const fim = new Date(dataInicio)
  fim.setDate(fim.getDate() - 1)
  return { inicio, fim }
}

/**
 * Verifica se uma data está dentro de um período (inclusive).
 */
export function dataNoPeriodo(data: Date | string, inicio: Date, fim: Date): boolean {
  const d = typeof data === "string" ? new Date(data) : data
  const inicioNormalizado = new Date(inicio)
  inicioNormalizado.setHours(0, 0, 0, 0)
  const fimNormalizado = new Date(fim)
  fimNormalizado.setHours(23, 59, 59, 999)
  const dNormalizado = new Date(d)
  dNormalizado.setHours(0, 0, 0, 0)
  return dNormalizado >= inicioNormalizado && dNormalizado <= fimNormalizado
}

/**
 * Calcula a diferença em horas entre duas datas.
 */
export function diferencaHoras(dataInicio: Date | string, dataFim: Date | string): number {
  const inicio = typeof dataInicio === "string" ? new Date(dataInicio) : dataInicio
  const fim = typeof dataFim === "string" ? new Date(dataFim) : dataFim
  return (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60)
}

/**
 * Calcula a diferença em dias entre duas datas.
 */
export function diferencaDias(dataInicio: Date | string, dataFim: Date | string): number {
  return diferencaHoras(dataInicio, dataFim) / 24
}

/**
 * Calcula dias desde a última movimentação até hoje (ou uma data de referência).
 */
export function diasDesdeUltimaMovimentacao(
  ultimaMovimentacao: string,
  referencia: Date = new Date()
): number {
  const ultima = new Date(ultimaMovimentacao)
  return diferencaDias(ultima, referencia)
}
