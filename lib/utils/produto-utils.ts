import type { UnidadeMedida } from "@/types/domain"

/** Unidades de medida disponíveis, com rótulos legíveis. */
export const UNIDADES: { value: UnidadeMedida; label: string }[] = [
  { value: "UN", label: "Unidade (UN)" },
  { value: "M", label: "Metro (M)" },
  { value: "KG", label: "Quilograma (KG)" },
  { value: "CX", label: "Caixa (CX)" },
]

/**
 * Default de "permite fracionado" por unidade:
 * UN/CX vendidos inteiros (false), M/KG admitem fração (true).
 */
export function fracionadoPadrao(unidade: UnidadeMedida): boolean {
  return unidade === "M" || unidade === "KG"
}

/** Marcas do catálogo — usadas no seletor do drawer e no filtro da lista. */
export const MARCAS = [
  "Tramontina",
  "Vonder",
  "Tigre",
  "Amanco",
  "Gerdau",
  "Belgo",
  "3M",
  "Suvinil",
] as const

/** Remove tudo que não é dígito. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "")
}

/**
 * Converte a string digitada no campo de preço (aceita "1234", "12,34")
 * para número. Retorna NaN quando inválida.
 */
export function parsePreco(value: string): number {
  const normalizado = value.replace(/\./g, "").replace(",", ".").trim()
  if (normalizado === "") return Number.NaN
  return Number(normalizado)
}
