import type { Cliente, Endereco } from "@/types/domain"
import { onlyDigits } from "@/lib/utils/cliente-utils"

export function isValidCPF(value: string): boolean {
    const digits = onlyDigits(value)
    if (digits.length !== 11) return false
    if (/^(\d)\1{10}$/.test(digits)) return false

    let sum = 0
    for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i)
    let rev = 11 - (sum % 11)
    if (rev >= 10) rev = 0
    if (rev !== Number(digits[9])) return false

    sum = 0
    for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i)
    rev = 11 - (sum % 11)
    if (rev >= 10) rev = 0
    return rev === Number(digits[10])
}

export function isValidCNPJ(value: string): boolean {
    const digits = onlyDigits(value)
    if (digits.length !== 14) return false
    if (/^(\d)\1{13}$/.test(digits)) return false

    function checkDigit(base: string): number {
        const weights =
            base.length === 12
                ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
                : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        const sum = base.split("").reduce((acc, d, i) => acc + Number(d) * weights[i], 0)
        const rest = sum % 11
        return rest < 2 ? 0 : 11 - rest
    }

    const base = digits.slice(0, 12)
    const d1 = checkDigit(base)
    const d2 = checkDigit(base + d1)
    return digits === base + String(d1) + String(d2)
}

export function isDocumentoValido(value: string): boolean {
    const digits = onlyDigits(value)
    if (digits.length === 11) return isValidCPF(value)
    if (digits.length === 14) return isValidCNPJ(value)
    return false
}

export function documentoJaExiste(clientes: Cliente[], documento: string, excluindoId?: string): boolean {
    const alvo = onlyDigits(documento)
    return clientes.some((c) => c.id !== excluindoId && onlyDigits(c.documento) === alvo)
}

export function podeRemoverEndereco(enderecos: Endereco[]): boolean {
    return enderecos.length > 1
}

export function marcarEnderecoPrincipal(enderecos: Endereco[], enderecoId: string): Endereco[] {
    return enderecos.map((e) => ({ ...e, principal: e.id === enderecoId }))
}

export function removerEndereco(enderecos: Endereco[], enderecoId: string): Endereco[] {
    const removidoEraPrincipal = enderecos.find((e) => e.id === enderecoId)?.principal
    const restantes = enderecos.filter((e) => e.id !== enderecoId)

    // Se o removido era o principal, promove o primeiro restante — nunca fica
    // sem um principal definido enquanto houver ao menos um endereço.
    if (removidoEraPrincipal && restantes.length > 0 && !restantes.some((e) => e.principal)) {
        restantes[0] = { ...restantes[0], principal: true }
    }
    return restantes
}

export interface DadosClienteFormulario {
    nome: string
    documento: string
    enderecos: Endereco[]
}

export function validarCliente(
    dados: DadosClienteFormulario,
    clientesExistentes: Cliente[],
    excluindoId?: string,
): string | null {
    if (!dados.nome.trim()) return "Nome/razão social é obrigatório."
    if (!dados.documento.trim()) return "Documento é obrigatório."
    if (!isDocumentoValido(dados.documento)) return "Documento em formato inválido."
    if (documentoJaExiste(clientesExistentes, dados.documento, excluindoId)) {
        return "Já existe um cliente com este documento."
    }
    return null
}