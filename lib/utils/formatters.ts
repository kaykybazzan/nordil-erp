import type { EntradaEstoque } from "@/types/domain"

/** Calcula o valor total de uma entrada. */
export function calcularTotalEntrada(entrada: EntradaEstoque): number {
  return entrada.itens.reduce(
    (acc, item) => acc + item.quantidade * item.custoUnitario,
    0
  )
}

/** Formata data ISO para "DD/MM/AAAA". */
export function formatDataBR(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso + "T12:00:00")
  return d.toLocaleDateString("pt-BR")
}

/** Formata data+hora ISO para "DD/MM/AAAA HH:mm". */
export function formatDataHoraBR(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Hoje em formato YYYY-MM-DD. */
export function hoje(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Formata um número como moeda brasileira (R$). */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}
