import type { EstoqueMovimentacao, TipoEstoqueMovimentacao } from "@/types/domain"

let MOVIMENTACOES: EstoqueMovimentacao[] = []

export function registrarMovimentacao(movimentacao: EstoqueMovimentacao): void {
  MOVIMENTACOES.push(movimentacao)
}

export function calcularReservado(produtoId: string, empresaId: string): number {
  const total = MOVIMENTACOES
    .filter((m) => m.produtoId === produtoId && m.empresaId === empresaId)
    .reduce((acc, m) => {
      if (m.tipo === "RESERVA") {
        return acc + m.quantidade
      } else if (m.tipo === "LIBERACAO_RESERVA" || m.tipo === "SAIDA") {
        return acc - m.quantidade
      }
      return acc
    }, 0)

  return Math.max(0, total)
}

export function obterMovimentacoes(): EstoqueMovimentacao[] {
  return [...MOVIMENTACOES]
}

export function limparLedger(): void {
  MOVIMENTACOES = []
}