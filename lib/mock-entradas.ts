import type { EntradaEstoque, Fornecedor } from "@/types/domain"
import { MOCK_PRODUTOS } from "./mock-produtos"

export const MOCK_FORNECEDORES: Fornecedor[] = [
  { id: "for-001", nome: "Tramontina" },
  { id: "for-002", nome: "Vonder" },
  { id: "for-003", nome: "Tigre" },
  { id: "for-004", nome: "Amanco" },
  { id: "for-005", nome: "Gerdau" },
  { id: "for-006", nome: "Belgo" },
  { id: "for-007", nome: "3M" },
  { id: "for-008", nome: "Suvinil" },
]

/** Gera um ID sequencial simples para o mock. */
let _nextId = 10

export function gerarIdEntrada(): string {
  return `ent-0${String(_nextId++).padStart(2, "0")}`
}

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

/**
 * Verifica se já existe uma entrada com o mesmo fornecedor + número de NF.
 * Retorna true se houver duplicata (aviso não-bloqueante).
 */
export function isDuplicata(
  entradas: EntradaEstoque[],
  fornecedorId: string,
  numeroNF: string,
  ignorarId?: string
): boolean {
  if (!fornecedorId || !numeroNF) return false
  return entradas.some(
    (e) =>
      e.id !== ignorarId &&
      e.fornecedorId === fornecedorId &&
      e.numeroNF.trim().toLowerCase() === numeroNF.trim().toLowerCase()
  )
}

// ---------------------------------------------------------------------------
// Mock de histórico (ordenado mais recente primeiro)
// ---------------------------------------------------------------------------

export const MOCK_ENTRADAS: EntradaEstoque[] = [
  {
    id: "ent-001",
    fornecedorId: "for-001",
    numeroNF: "002541",
    serie: "1",
    dataEmissao: "2025-06-28",
    dataRecebimento: "2025-06-30",
    observacao: "Entrega parcial do pedido 874.",
    itens: [
      { produtoId: "prd-001", quantidade: 20, custoUnitario: 148.0 },
    ],
    lancadoPor: "Bruno Teixeira",
    dataHoraLancamento: "2025-06-30T09:14:00",
  },
  {
    id: "ent-002",
    fornecedorId: "for-002",
    numeroNF: "001188",
    dataEmissao: "2025-07-01",
    dataRecebimento: "2025-07-02",
    itens: [
      { produtoId: "prd-002", quantidade: 8, custoUnitario: 265.0 },
    ],
    lancadoPor: "Bruno Teixeira",
    dataHoraLancamento: "2025-07-02T11:30:00",
  },
  {
    id: "ent-003",
    fornecedorId: "for-003",
    numeroNF: "007734",
    serie: "2",
    dataEmissao: "2025-07-03",
    dataRecebimento: "2025-07-04",
    observacao: "",
    itens: [
      { produtoId: "prd-003", quantidade: 500, custoUnitario: 5.9 },
      { produtoId: "prd-004", quantidade: 200, custoUnitario: 1.8 },
    ],
    lancadoPor: "Bruno Teixeira",
    dataHoraLancamento: "2025-07-04T08:55:00",
  },
  {
    id: "ent-004",
    fornecedorId: "for-005",
    numeroNF: "009901",
    dataEmissao: "2025-07-07",
    dataRecebimento: "2025-07-08",
    itens: [
      { produtoId: "prd-005", quantidade: 1000, custoUnitario: 5.4 },
      { produtoId: "prd-006", quantidade: 150, custoUnitario: 9.8 },
    ],
    lancadoPor: "Bruno Teixeira",
    dataHoraLancamento: "2025-07-08T14:20:00",
  },
]
