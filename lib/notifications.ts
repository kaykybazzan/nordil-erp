import type { Pedido, Produto, InventarioEstoque, Devolucao, Usuario } from "@/types/domain"
import { getAtrasados, getProdutosAbaixoMinimo, STATUS_LABELS } from "@/lib/dashboard"

export type NotificacaoTom = "info" | "warning" | "success" | "danger"

export interface Notificacao {
    id: string
    tom: NotificacaoTom
    titulo: string
    detalhe: string
    href: string
    dataHora: string
    paraRole?: Usuario["role"][]
    paraFuncao?: Usuario["funcao"][]
}

function visivelPara(n: Notificacao, usuario: Usuario): boolean {
    if (!n.paraRole && !n.paraFuncao) return true
    const porRole = n.paraRole?.includes(usuario.role) ?? false
    const porFuncao = n.paraFuncao?.includes(usuario.funcao) ?? false
    return porRole || porFuncao
}

export function getNotificacoes(
    usuario: Usuario,
    pedidos: Pedido[],
    produtos: Produto[],
    inventarios: InventarioEstoque[],
    devolucoes: Devolucao[],
): Notificacao[] {
    const todas: Notificacao[] = []

    // Atrasos — dono é o Supervisor, não o operador da etapa travada
    // (ele já sabe que está travado; quem precisa agir é quem desbloqueia).
    for (const pedido of getAtrasados(pedidos)) {
        todas.push({
            id: `atraso-${pedido.id}`,
            tom: "danger",
            titulo: `Pedido #${pedido.numero} atrasado`,
            detalhe: `Parado em "${STATUS_LABELS[pedido.status]}"`,
            href: `/pedidos?atrasado=true&id=${pedido.id}`,
            dataHora: pedido.statusAlteradoEm,
            paraRole: ["SUPERVISOR", "ADMIN"],
        })
    }

    // Estoque abaixo do mínimo — dono é quem repõe.
    for (const { produto, disponivel, inventario } of getProdutosAbaixoMinimo(produtos, inventarios)) {
        todas.push({
            id: `estoque-${produto.id}`,
            tom: "warning",
            titulo: produto.nome,
            detalhe: `${disponivel}/${inventario.estoqueMinimo} disponível`,
            href: `/estoque?abaixoMinimo=true&produtoId=${produto.id}`,
            dataHora: inventario.ultimaMovimentacao,
            paraFuncao: ["ESTOQUE"],
            paraRole: ["ADMIN"],
        })
    }

    // Devolução solicitada — só Supervisor confirma (mesma regra de
    // Devolucao.confirmadoPor no domínio).
    const pedidoPorId = new Map(pedidos.map((p) => [p.id, p]))
    for (const dev of devolucoes.filter((d) => d.status === "SOLICITADA")) {
        const pedido = pedidoPorId.get(dev.pedidoId)
        todas.push({
            id: `devolucao-${dev.id}`,
            tom: "info",
            titulo: pedido
                ? `Devolução do pedido #${pedido.numero} solicitada`
                : "Devolução solicitada",
            detalhe: "Aguardando análise",
            href: `/devolucoes?id=${dev.id}`,
            dataHora: dev.solicitadoEm,
            paraRole: ["SUPERVISOR", "ADMIN"],
        })
    }

    // Pedidos prontos pra próxima etapa — dono é a função responsável pela
    // etapa SEGUINTE, não quem acabou de concluir a etapa atual.
    for (const pedido of pedidos) {
        const ultimoEvento = pedido.eventos[pedido.eventos.length - 1]
        if (!ultimoEvento) continue

        if (ultimoEvento.tipo === "ESTOQUE_RESERVADO") {
            todas.push({
                id: `fila-separacao-${pedido.id}`,
                tom: "info",
                titulo: `Pedido #${pedido.numero} pronto para separação`,
                detalhe: "Estoque reservado",
                href: `/separacao?id=${pedido.id}`,
                dataHora: ultimoEvento.dataHora,
                paraFuncao: ["SEPARACAO"],
            })
        }

        if (ultimoEvento.tipo === "SEPARACAO_CONCLUIDA") {
            todas.push({
                id: `fila-conferencia-${pedido.id}`,
                tom: "info",
                titulo: `Pedido #${pedido.numero} pronto para conferência`,
                detalhe: "Separação concluída",
                href: `/conferencia?id=${pedido.id}`,
                dataHora: ultimoEvento.dataHora,
                paraFuncao: ["CONFERENCIA"],
            })
        }

        if (ultimoEvento.tipo === "DIVERGENCIA_DETECTADA") {
            todas.push({
                id: `divergencia-${pedido.id}`,
                tom: "danger",
                titulo: `Pedido #${pedido.numero} com divergência`,
                detalhe: "Aguardando aprovação excepcional",
                href: `/conferencia?id=${pedido.id}`,
                dataHora: ultimoEvento.dataHora,
                paraRole: ["SUPERVISOR", "ADMIN"],
            })
        }

        if (ultimoEvento.tipo === "CONFERENCIA_CONCLUIDA") {
            todas.push({
                id: `fila-expedicao-${pedido.id}`,
                tom: "success",
                titulo: `Pedido #${pedido.numero} pronto para expedição`,
                detalhe: "Conferência concluída sem divergência",
                href: `/expedicao?id=${pedido.id}`,
                dataHora: ultimoEvento.dataHora,
                paraFuncao: ["EXPEDICAO"],
            })
        }
    }

    return todas
        .filter((n) => visivelPara(n, usuario))
        .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
}