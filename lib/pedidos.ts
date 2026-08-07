import type { Pedido, Usuario } from "@/types/domain"

type UsuarioBasico = { id: string; role: string; funcao: string }

const STATUS_CANCELAVEL: Pedido["status"][] = [
    "CRIADO",
    "RESERVADO",
    "EM_SEPARACAO",
    "EM_CONFERENCIA",
    "CONFERIDO",
]

function isVendedor(usuario: UsuarioBasico) {
    return usuario.role === "OPERADOR" && usuario.funcao === "VENDAS"
}

function isSupervisorOuAdmin(usuario: UsuarioBasico) {
    return usuario.role === "SUPERVISOR" || usuario.role === "ADMIN"
}

/**
 * Vendedor cancela só até CONFERIDO, e só o próprio pedido.
 * Supervisor/Admin cancelam qualquer pedido até CONFERIDO.
 * A partir de EXPEDIDO, ninguém cancela (regra congelada do domínio).
 */
export function podeCancelarPedido(pedido: Pedido, usuario: UsuarioBasico): boolean {
    if (!STATUS_CANCELAVEL.includes(pedido.status)) return false

    if (isSupervisorOuAdmin(usuario)) return true

    if (isVendedor(usuario)) return pedido.vendedorId === usuario.id

    return false
}

/**
 * Só o supervisor/admin que iniciou a separação (ou outro supervisor/admin)
 * pode continuar mexendo num pedido travado por separação.
 */
export function podeOperarSeparacao(pedido: Pedido, usuario: UsuarioBasico): boolean {
    if (!pedido.separadorId) return true
    if (pedido.separadorId === usuario.id) return true
    return isSupervisorOuAdmin(usuario)
}

/**
 * Mesmo critério de podeOperarSeparacao, mas para a trava de conferência (conferenteId).
 */
export function podeOperarConferenciaSessao(
    pedido: { conferenteId?: string },
    usuario: UsuarioBasico
): boolean {
    if (!pedido.conferenteId) return true
    if (pedido.conferenteId === usuario.id) return true
    return isSupervisorOuAdmin(usuario)
}

// Mesmo critério de "atrasado" do Dashboard (Módulo 3, seção 23): RESERVADO
// há mais de 24h sem iniciar separação, ou EM_SEPARACAO há mais de 48h sem
// conferência. Se lib/dashboard.ts já implementa isso, vale consolidar num
// único lugar depois — deixei aqui pra Pedidos não depender de um arquivo
// que eu não vi por completo.
const HORA_MS = 60 * 60 * 1000

export function isPedidoAtrasado(pedido: Pedido, agora: Date): boolean {
    const desde = agora.getTime() - new Date(pedido.statusAlteradoEm).getTime()
    if (pedido.status === "RESERVADO") return desde > 24 * HORA_MS
    if (pedido.status === "EM_SEPARACAO") return desde > 48 * HORA_MS
    return false
}

export function formatTempoNoStatus(pedido: Pedido, agora: Date): string {
    const ms = agora.getTime() - new Date(pedido.statusAlteradoEm).getTime()
    const horas = Math.floor(ms / HORA_MS)

    if (horas < 1) return "menos de 1h"
    if (horas < 24) return `${horas}h`

    const dias = Math.floor(horas / 24)
    const resto = horas % 24
    return resto > 0 ? `${dias}d ${resto}h` : `${dias}d`
}