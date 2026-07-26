// lib/dashboard.ts
//
// Camada de cálculo do Dashboard (Módulo 3). Só depende dos tipos de domínio
// — nenhuma lógica de UI aqui, pra poder ser testada isolada e reaproveitada
// se um dia isso virar endpoint de API em vez de leitura direta dos mocks.

import type { Pedido, StatusPedido, Produto, InventarioEstoque } from "@/types/domain"


// ─── Limiares de atraso ────────────────────────────────────────────────────
// Direto da definição do tooltip do Módulo 3. Fixo por enquanto; se algum dia
// virar configurável por empresa, entra como parâmetro nessas funções.
const LIMIAR_RESERVADO_HORAS = 24
const LIMIAR_SEPARACAO_HORAS = 48

function horasDesde(dataIso: string): number {
    return (Date.now() - new Date(dataIso).getTime()) / (1000 * 60 * 60)
}

function ehHoje(dataIso: string): boolean {
    const d = new Date(dataIso)
    const agora = new Date()
    return (
        d.getFullYear() === agora.getFullYear() &&
        d.getMonth() === agora.getMonth() &&
        d.getDate() === agora.getDate()
    )
}

export function isAtrasado(pedido: Pedido): boolean {
    if (pedido.status === "RESERVADO") {
        return horasDesde(pedido.statusAlteradoEm) > LIMIAR_RESERVADO_HORAS
    }
    if (pedido.status === "EM_SEPARACAO") {
        return horasDesde(pedido.statusAlteradoEm) > LIMIAR_SEPARACAO_HORAS
    }
    return false
}

// ─── KPIs (Admin + Supervisor) ─────────────────────────────────────────────

export interface ProdutoAbaixoMinimo {
    produto: Produto
    inventario: InventarioEstoque
    disponivel: number
}

export function getAguardandoSeparacao(pedidos: Pedido[]): Pedido[] {
    return pedidos.filter((p) => p.status === "RESERVADO")
}

export function getEmSeparacao(pedidos: Pedido[]): Pedido[] {
    return pedidos.filter((p) => p.status === "EM_SEPARACAO")
}

export function getAtrasados(pedidos: Pedido[]): Pedido[] {
    return pedidos.filter(isAtrasado)
}

export function getEntreguesHoje(pedidos: Pedido[]): Pedido[] {
    return pedidos.filter((p) => p.status === "ENTREGUE" && ehHoje(p.statusAlteradoEm))
}

export function getCanceladosHoje(pedidos: Pedido[]): Pedido[] {
    return pedidos.filter((p) => p.status === "CANCELADO" && ehHoje(p.statusAlteradoEm))
}

export function getProdutosAbaixoMinimo(
    produtos: Produto[],
    inventarios: InventarioEstoque[],
): ProdutoAbaixoMinimo[] {
    const inventarioPorProduto = new Map(inventarios.map((i) => [i.produtoId, i]))

    return produtos
        .filter((p) => p.status === "ativo")
        .map((produto) => {
            const inventario = inventarioPorProduto.get(produto.id)
            if (!inventario) return null
            const disponivel = inventario.estoqueFisico - inventario.reservado
            if (disponivel >= inventario.estoqueMinimo) return null
            return { produto, inventario, disponivel }
        })
        .filter((x): x is ProdutoAbaixoMinimo => x !== null)
}

// ─── Extras do Supervisor ──────────────────────────────────────────────────

const STATUS_ATIVOS: StatusPedido[] = [
    "CRIADO",
    "RESERVADO",
    "EM_SEPARACAO",
    "EM_CONFERENCIA",
    "CONFERIDO",
    "EXPEDIDO",
]

export const STATUS_LABELS: Record<StatusPedido, string> = {
    CRIADO: "Criado",
    RESERVADO: "Aguardando separação",
    EM_SEPARACAO: "Em separação",
    EM_CONFERENCIA: "Em conferência",
    CONFERIDO: "Conferido",
    EXPEDIDO: "Expedido",
    ENTREGUE: "Entregue",
    CANCELADO: "Cancelado",
}

export interface Gargalo {
    status: StatusPedido
    quantidade: number
}

export function getGargalo(pedidos: Pedido[]): Gargalo | null {
    const contagem = new Map<StatusPedido, number>()
    for (const status of STATUS_ATIVOS) contagem.set(status, 0)

    for (const pedido of pedidos) {
        if (STATUS_ATIVOS.includes(pedido.status)) {
            contagem.set(pedido.status, (contagem.get(pedido.status) ?? 0) + 1)
        }
    }

    let maior: Gargalo | null = null
    for (const [status, quantidade] of contagem) {
        if (quantidade > 0 && (!maior || quantidade > maior.quantidade)) {
            maior = { status, quantidade }
        }
    }
    return maior
}

export interface ProdutividadeEtapa {
    status: StatusPedido
    tempoMedioHoras: number
    quantidade: number
}

/**
 * Proxy simplificado: tempo médio que os pedidos ATUALMENTE em cada status
 * já estão parados nele. Não é o tempo histórico real de transição (isso
 * exigiria uma taxonomia fechada de PedidoEvento.tipo, que ainda não existe).
 * Trocar por cálculo baseado em eventos quando os tipos forem definidos.
 */
export function getProdutividadePorEtapa(pedidos: Pedido[]): ProdutividadeEtapa[] {
    return STATUS_ATIVOS.map((status) => {
        const doStatus = pedidos.filter((p) => p.status === status)
        const tempoMedioHoras =
            doStatus.length === 0
                ? 0
                : doStatus.reduce((soma, p) => soma + horasDesde(p.statusAlteradoEm), 0) / doStatus.length

        return { status, tempoMedioHoras, quantidade: doStatus.length }
    }).filter((etapa) => etapa.quantidade > 0)
}

// ─── Alertas ────────────────────────────────────────────────────────────

export interface Alerta {
    id: string
    mensagem: string
    href: string
    severidade: number // maior = mais crítico, usado só pra ordenar
}

export function getAlertas(
    pedidos: Pedido[],
    produtos: Produto[],
    inventarios: InventarioEstoque[],
): Alerta[] {
    const alertasAtraso: Alerta[] = getAtrasados(pedidos).map((pedido) => {
        const horas = Math.round(horasDesde(pedido.statusAlteradoEm))
        return {
            id: `atraso-${pedido.id}`,
            mensagem: `Pedido #${pedido.numero} atrasado há ${horas}h (${STATUS_LABELS[pedido.status]})`,
            href: `/pedidos?atrasado=true&id=${pedido.id}`,
            severidade: horas,
        }
    })

    const alertasEstoque: Alerta[] = getProdutosAbaixoMinimo(produtos, inventarios).map(
        ({ produto, inventario, disponivel }) => ({
            id: `estoque-${produto.id}`,
            mensagem: `${produto.nome} abaixo do mínimo (${disponivel}/${inventario.estoqueMinimo})`,
            href: `/estoque?abaixoMinimo=true&produtoId=${produto.id}`,
            // quanto mais negativo o saldo em relação ao mínimo, mais crítico
            severidade: inventario.estoqueMinimo - disponivel + 100, // +100: estoque zerado nunca perde pra atraso de poucas horas
        }),
    )

    return [...alertasAtraso, ...alertasEstoque].sort((a, b) => b.severidade - a.severidade)
}