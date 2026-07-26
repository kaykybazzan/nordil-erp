import type { Pedido, Usuario, PedidoEvento } from "@/types/domain"
import { registrarMovimentacao } from "./estoque-ledger"
import { actionRegistrarAuditoria } from "@/lib/actions/auditoria"

const STATUS_CANCELAVEL: Pedido["status"][] = [
    "CRIADO",
    "RESERVADO",
    "EM_SEPARACAO",
    "EM_CONFERENCIA",
    "CONFERIDO",
]

function isVendedor(usuario: Usuario) {
    return usuario.role === "OPERADOR" && usuario.funcao === "VENDAS"
}

function isSupervisorOuAdmin(usuario: Usuario) {
    return usuario.role === "SUPERVISOR" || usuario.role === "ADMIN"
}

/**
 * Vendedor cancela só até CONFERIDO, e só o próprio pedido.
 * Supervisor/Admin cancelam qualquer pedido até CONFERIDO.
 * A partir de EXPEDIDO, ninguém cancela (regra congelada do domínio).
 */
export function podeCancelarPedido(pedido: Pedido, usuario: Usuario): boolean {
    if (!STATUS_CANCELAVEL.includes(pedido.status)) return false

    if (isSupervisorOuAdmin(usuario)) return true

    if (isVendedor(usuario)) return pedido.vendedorId === usuario.id

    return false
}

type CancelarPedidoResultado = { ok: true; pedido: Pedido } | { ok: false; error: string }

export async function cancelarPedido(
    pedido: Pedido,
    usuario: Usuario,
    motivo: string,
): Promise<CancelarPedidoResultado> {
    if (!motivo.trim()) {
        return { ok: false, error: "Informe o motivo do cancelamento." }
    }

    if (!podeCancelarPedido(pedido, usuario)) {
        return {
            ok: false,
            error: "Não foi possível cancelar — verifique se o pedido ainda está em um estado cancelável.",
        }
    }

    const agora = new Date().toISOString()

    // Reverter reserva de estoque para itens que tinham reserva ativa
    const statusComReserva = ["RESERVADO", "EM_SEPARACAO", "EM_CONFERENCIA", "CONFERIDO"]
    if (statusComReserva.includes(pedido.status)) {
        pedido.itens.forEach((item) => {
            if (item.status !== "CANCELADO") {
                registrarMovimentacao({
                    id: `mov-liberacao-${Math.random().toString(36).slice(2, 9)}`,
                    empresaId: usuario.empresaId,
                    produtoId: item.produtoId,
                    tipo: "LIBERACAO_RESERVA",
                    quantidade: item.quantidade,
                    pedidoId: pedido.id,
                    dataHora: agora,
                    usuarioId: usuario.id,
                })
            }
        })
    }

    const evento: PedidoEvento = {
        id: `evt-${Math.random().toString(36).slice(2, 9)}`,
        tipo: "PEDIDO_CANCELADO",
        descricao: motivo.trim(),
        dataHora: agora,
        usuarioId: usuario.id,
    }

    const pedidoCancelado: Pedido = {
        ...pedido,
        status: "CANCELADO",
        motivoCancelamento: motivo.trim(),
        statusAlteradoEm: agora,
        itens: pedido.itens.map((item) =>
            item.status === "CANCELADO" ? item : { ...item, status: "CANCELADO" },
        ),
        eventos: [...pedido.eventos, evento],
    }

    // Registrar auditoria separada do PedidoEvento
    const resultadoAuditoria = await actionRegistrarAuditoria({
        modulo: "PEDIDOS",
        acao: "CANCELADO",
        entidadeId: pedido.id,
        descricao: `Pedido #${pedido.numero} cancelado.`,
        motivo: motivo.trim(),
    })
    if (!resultadoAuditoria.ok) {
        console.error("Falha ao registrar auditoria:", resultadoAuditoria.error)
    }

    return { ok: true, pedido: pedidoCancelado }
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