import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
    Pedido,
    ItemPedido,
    PedidoEvento,
    TipoPedidoEvento,
    EnderecoPedido,
    Usuario,
    StatusPedido,
} from "@/types/domain"
import { MOCK_PEDIDOS } from "./mock-pedidos"
import { MOCK_PRODUTOS } from "./mock-produtos"
import { registrarMovimentacao, calcularReservado } from "./estoque-ledger"
import { actionRegistrarAuditoria } from "./actions/auditoria"

function gerarId(prefixo: string) {
    return `${prefixo}-${Math.random().toString(36).slice(2, 9)}`
}

function novoEvento(
    tipo: TipoPedidoEvento,
    descricao: string,
    usuario: Usuario,
): PedidoEvento {
    return {
        id: gerarId("evt"),
        tipo,
        descricao,
        dataHora: new Date().toISOString(),
        usuarioId: usuario.id,
    }
}

function isVendedor(usuario: Usuario) {
    return usuario.role === "OPERADOR" && usuario.funcao === "VENDAS"
}
function isSupervisorOuAdmin(usuario: Usuario) {
    return usuario.role === "SUPERVISOR" || usuario.role === "ADMIN"
}

const STATUS_CANCELAVEL: StatusPedido[] = [
    "CRIADO",
    "RESERVADO",
    "EM_SEPARACAO",
    "EM_CONFERENCIA",
    "CONFERIDO",
]

export function podeCancelarPedido(pedido: Pedido, usuario: Usuario): boolean {
    if (!STATUS_CANCELAVEL.includes(pedido.status)) return false
    if (isSupervisorOuAdmin(usuario)) return true
    if (isVendedor(usuario)) return pedido.vendedorId === usuario.id
    return false
}

/**
 * Só o supervisor/admin que iniciou a separação (ou outro supervisor/admin)
 * pode continuar mexendo num pedido travado por separação.
 */
function podeOperarSeparacao(pedido: Pedido, usuario: Usuario): boolean {
    if (!pedido.separadorId) return true
    if (pedido.separadorId === usuario.id) return true
    return isSupervisorOuAdmin(usuario)
}

interface NovoPedidoItemInput {
    produtoId: string
    quantidade: number
    precoUnitario: number
    desconto: number
}

interface CriarPedidoInput {
    clienteId: string
    endereco: EnderecoPedido
    itens: NovoPedidoItemInput[]
    observacao?: string
    usuario: Usuario
}

type AcaoResultado = { ok: true } | { ok: false; error: string }

interface PedidosState {
    pedidos: Pedido[]
    proximoNumero: number

    criarPedido: (input: CriarPedidoInput) => Pedido

    // Supervisor reprocessa reserva de um pedido CRIADO (Cenário 1 — tenta de novo)
    reprocessarReserva: (pedidoId: string, usuario: Usuario) => void

    cancelarPedido: (pedidoId: string, usuario: Usuario, motivo: string) => Promise<AcaoResultado>

    // Separação
    iniciarSeparacao: (pedidoId: string, usuario: Usuario) => AcaoResultado
    marcarItemSeparado: (pedidoId: string, itemId: string, usuario: Usuario) => void
    concluirSeparacao: (pedidoId: string, usuario: Usuario) => AcaoResultado

    // Conferência
    confirmarConferencia: (pedidoId: string, usuario: Usuario) => void
    registrarDivergenciaConferencia: (
        pedidoId: string,
        usuario: Usuario,
        descricao: string,
    ) => void

    // Expedição
    expedirPedido: (pedidoId: string, usuario: Usuario, transportadora: string) => void
    marcarEntregue: (pedidoId: string, usuario: Usuario) => void
}

export const usePedidosStore = create<PedidosState>()(
    persist(
        (set, get) => ({
            pedidos: MOCK_PEDIDOS,
            proximoNumero: Math.max(0, ...MOCK_PEDIDOS.map((p) => p.numero)) + 1,

            criarPedido: (input) => {
                const { usuario } = input
                const agora = new Date().toISOString()
                const pedidoId = gerarId("ped")
                const numero = get().proximoNumero

                let algumReservado = false
                let algumFalhou = false

                const itens: ItemPedido[] = input.itens.map((itemInput) => {
                    const produto = MOCK_PRODUTOS.find((p) => p.id === itemInput.produtoId)
                    const jaReservado = produto
                        ? calcularReservado(produto.id, usuario.empresaId)
                        : 0
                    const disponivel = produto ? produto.estoqueAtual - jaReservado : 0
                    const reservou = produto ? disponivel >= itemInput.quantidade : false

                    if (reservou && produto) {
                        registrarMovimentacao({
                            id: gerarId("mov"),
                            empresaId: usuario.empresaId,
                            produtoId: produto.id,
                            tipo: "RESERVA",
                            quantidade: itemInput.quantidade,
                            pedidoId,
                            dataHora: agora,
                            usuarioId: usuario.id,
                        })
                        algumReservado = true
                    } else {
                        algumFalhou = true
                    }

                    return {
                        id: gerarId("item"),
                        produtoId: itemInput.produtoId,
                        quantidade: itemInput.quantidade,
                        precoUnitario: itemInput.precoUnitario,
                        desconto: itemInput.desconto,
                        status: reservou ? "PENDENTE" : "PENDENTE_ESTOQUE",
                    }
                })

                const status: StatusPedido = algumReservado ? "RESERVADO" : "CRIADO"

                const eventos: PedidoEvento[] = [
                    novoEvento(
                        "PEDIDO_CRIADO",
                        algumReservado
                            ? "Pedido criado."
                            : "Pedido criado, sem estoque suficiente para nenhum item.",
                        usuario,
                    ),
                ]

                if (algumReservado) {
                    eventos.push(
                        novoEvento(
                            "ESTOQUE_RESERVADO",
                            algumFalhou
                                ? "Reserva parcial — 1 ou mais itens sem estoque suficiente."
                                : "Reserva de todos os itens concluída com sucesso.",
                            usuario,
                        ),
                    )
                }

                const valorTotal = itens.reduce(
                    (acc, i) => acc + i.precoUnitario * i.quantidade * (1 - i.desconto / 100),
                    0,
                )

                const pedido: Pedido = {
                    id: pedidoId,
                    numero,
                    clienteId: input.clienteId,
                    vendedorId: usuario.id,
                    endereco: input.endereco,
                    itens,
                    observacao: input.observacao,
                    status,
                    pendencia: algumFalhou ? "RUPTURA_ESTOQUE" : "NENHUMA",
                    valorTotal,
                    criadoEm: agora,
                    statusAlteradoEm: agora,
                    eventos,
                }

                set((state) => ({
                    pedidos: [...state.pedidos, pedido],
                    proximoNumero: state.proximoNumero + 1,
                }))

                return pedido
            },

            // Cenário 1 (decidido): supervisor pede novo processamento — o sistema
            // consulta o ledger de novo e tenta reservar. Nunca força RESERVADO.
            reprocessarReserva: (pedidoId, usuario) => {
                const pedido = get().pedidos.find((p) => p.id === pedidoId)
                if (!pedido || pedido.status !== "CRIADO") return

                const agora = new Date().toISOString()
                let algumReservado = false
                let algumFalhou = false

                const itensAtualizados: ItemPedido[] = pedido.itens.map((item) => {
                    if (item.status === "CANCELADO") return item

                    const produto = MOCK_PRODUTOS.find((p) => p.id === item.produtoId)
                    const jaReservado = produto
                        ? calcularReservado(produto.id, usuario.empresaId)
                        : 0
                    const disponivel = produto ? produto.estoqueAtual - jaReservado : 0
                    const reservouAgora = produto ? disponivel >= item.quantidade : false

                    if (reservouAgora && produto) {
                        registrarMovimentacao({
                            id: gerarId("mov"),
                            empresaId: usuario.empresaId,
                            produtoId: produto.id,
                            tipo: "RESERVA",
                            quantidade: item.quantidade,
                            pedidoId: pedido.id,
                            dataHora: agora,
                            usuarioId: usuario.id,
                        })
                        algumReservado = true
                        return { ...item, status: "PENDENTE" as const }
                    }

                    algumFalhou = true
                    return item
                })

                const novoStatus: StatusPedido = algumReservado ? "RESERVADO" : "CRIADO"
                const descricao = algumReservado
                    ? algumFalhou
                        ? "Reprocessamento: reserva parcial concluída."
                        : "Reprocessamento: reserva de todos os itens concluída com sucesso."
                    : "Reprocessamento: ainda sem estoque suficiente para nenhum item."

                set((state) => ({
                    pedidos: state.pedidos.map((p) =>
                        p.id === pedidoId
                            ? {
                                ...p,
                                itens: itensAtualizados,
                                status: novoStatus,
                                statusAlteradoEm: agora,
                                eventos: [
                                    ...p.eventos,
                                    novoEvento("PEDIDO_REPROCESSADO", descricao, usuario),
                                ],
                            }
                            : p,
                    ),
                }))
            },

            cancelarPedido: async (pedidoId, usuario, motivo) => {
                const pedido = get().pedidos.find((p) => p.id === pedidoId)
                if (!pedido) return { ok: false, error: "Pedido não encontrado." }
                if (!motivo.trim()) return { ok: false, error: "Informe o motivo do cancelamento." }
                if (!podeCancelarPedido(pedido, usuario)) {
                    return {
                        ok: false,
                        error: "Não foi possível cancelar — verifique se o pedido ainda está em um estado cancelável.",
                    }
                }

                const agora = new Date().toISOString()

                // Só libera reserva de itens que de fato tinham reserva ativa
                // (PENDENTE ou SEPARADO). Item PENDENTE_ESTOQUE nunca reservou —
                // liberar geraria um evento fantasma no ledger.
                const statusComReserva: StatusPedido[] = [
                    "RESERVADO",
                    "EM_SEPARACAO",
                    "EM_CONFERENCIA",
                    "CONFERIDO",
                ]
                if (statusComReserva.includes(pedido.status)) {
                    pedido.itens.forEach((item) => {
                        if (item.status === "PENDENTE" || item.status === "SEPARADO") {
                            registrarMovimentacao({
                                id: gerarId("mov"),
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

                const resultado = await actionRegistrarAuditoria({
                    modulo: "PEDIDOS",
                    acao: "CANCELADO",
                    entidadeId: pedido.id,
                    descricao: `Pedido #${pedido.numero} cancelado.`,
                    motivo: motivo.trim(),
                })
                if (!resultado.ok) {
                    console.error("Erro ao registrar auditoria:", resultado.error)
                }

                set((state) => ({
                    pedidos: state.pedidos.map((p) =>
                        p.id === pedidoId
                            ? {
                                ...p,
                                status: "CANCELADO" as const,
                                motivoCancelamento: motivo.trim(),
                                statusAlteradoEm: agora,
                                separadorId: undefined,
                                itens: p.itens.map((item) =>
                                    item.status === "CANCELADO" ? item : { ...item, status: "CANCELADO" as const },
                                ),
                                eventos: [
                                    ...p.eventos,
                                    novoEvento("PEDIDO_CANCELADO", motivo.trim(), usuario),
                                ],
                            }
                            : p,
                    ),
                }))

                return { ok: true }
            },

            iniciarSeparacao: (pedidoId, usuario) => {
                const pedido = get().pedidos.find((p) => p.id === pedidoId)
                if (!pedido) return { ok: false, error: "Pedido não encontrado." }
                if (pedido.status !== "RESERVADO") {
                    return { ok: false, error: "Pedido não está disponível para separação." }
                }
                if (!podeOperarSeparacao(pedido, usuario)) {
                    return { ok: false, error: "Este pedido já está sendo separado por outro usuário." }
                }

                set((state) => ({
                    pedidos: state.pedidos.map((p) =>
                        p.id === pedidoId
                            ? {
                                ...p,
                                status: "EM_SEPARACAO" as const,
                                separadorId: usuario.id,
                                statusAlteradoEm: new Date().toISOString(),
                                eventos: [
                                    ...p.eventos,
                                    novoEvento("SEPARACAO_INICIADA", "Separação iniciada pelo estoquista.", usuario),
                                ],
                            }
                            : p,
                    ),
                }))

                return { ok: true }
            },

            marcarItemSeparado: (pedidoId, itemId, usuario) => {
                const pedido = get().pedidos.find((p) => p.id === pedidoId)
                if (!pedido || !podeOperarSeparacao(pedido, usuario)) return

                set((state) => ({
                    pedidos: state.pedidos.map((p) =>
                        p.id === pedidoId
                            ? {
                                ...p,
                                itens: p.itens.map((i) =>
                                    i.id === itemId && i.status !== "PENDENTE_ESTOQUE" && i.status !== "CANCELADO"
                                        ? { ...i, status: "SEPARADO" as const }
                                        : i,
                                ),
                            }
                            : p,
                    ),
                }))
            },

            concluirSeparacao: (pedidoId, usuario) => {
                const pedido = get().pedidos.find((p) => p.id === pedidoId)
                if (!pedido) return { ok: false, error: "Pedido não encontrado." }
                if (!podeOperarSeparacao(pedido, usuario)) {
                    return { ok: false, error: "Este pedido está travado por outro separador." }
                }

                const separaveis = pedido.itens.filter(
                    (i) => i.status !== "PENDENTE_ESTOQUE" && i.status !== "CANCELADO",
                )
                const todosSeparados = separaveis.length > 0 && separaveis.every((i) => i.status === "SEPARADO")
                if (!todosSeparados) {
                    return { ok: false, error: "Ainda há itens não separados." }
                }

                set((state) => ({
                    pedidos: state.pedidos.map((p) =>
                        p.id === pedidoId
                            ? {
                                ...p,
                                status: "EM_CONFERENCIA" as const,
                                separadorId: undefined,
                                statusAlteradoEm: new Date().toISOString(),
                                eventos: [
                                    ...p.eventos,
                                    novoEvento(
                                        "SEPARACAO_CONCLUIDA",
                                        "Todos os itens separados.",
                                        usuario,
                                    ),
                                ],
                            }
                            : p,
                    ),
                }))

                return { ok: true }
            },

            confirmarConferencia: (pedidoId, usuario) => {
                set((state) => ({
                    pedidos: state.pedidos.map((p) =>
                        p.id === pedidoId
                            ? {
                                ...p,
                                status: "CONFERIDO" as const,
                                statusAlteradoEm: new Date().toISOString(),
                                eventos: [
                                    ...p.eventos,
                                    novoEvento(
                                        "CONFERENCIA_CONCLUIDA",
                                        "Conferência concluída sem divergência.",
                                        usuario,
                                    ),
                                ],
                            }
                            : p,
                    ),
                }))
            },

            registrarDivergenciaConferencia: (pedidoId, usuario, descricao) => {
                set((state) => ({
                    pedidos: state.pedidos.map((p) =>
                        p.id === pedidoId
                            ? {
                                ...p,
                                pendencia: "DIVERGENCIA_CONFERENCIA" as const,
                                statusAlteradoEm: new Date().toISOString(),
                                eventos: [
                                    ...p.eventos,
                                    novoEvento("DIVERGENCIA_DETECTADA", descricao, usuario),
                                ],
                            }
                            : p,
                    ),
                }))
            },

            expedirPedido: (pedidoId, usuario, transportadora) => {
                const pedido = get().pedidos.find((p) => p.id === pedidoId)
                if (!pedido) return
                const agora = new Date().toISOString()

                pedido.itens.forEach((item) => {
                    if (item.status === "CANCELADO") return
                    registrarMovimentacao({
                        id: gerarId("mov"),
                        empresaId: usuario.empresaId,
                        produtoId: item.produtoId,
                        tipo: "SAIDA",
                        quantidade: item.quantidade,
                        pedidoId: pedido.id,
                        dataHora: agora,
                        usuarioId: usuario.id,
                    })
                })

                set((state) => ({
                    pedidos: state.pedidos.map((p) =>
                        p.id === pedidoId
                            ? {
                                ...p,
                                status: "EXPEDIDO" as const,
                                transportadora,
                                statusAlteradoEm: agora,
                                eventos: [
                                    ...p.eventos,
                                    novoEvento(
                                        "PEDIDO_EXPEDIDO",
                                        "Mercadoria despachada. Baixa física de estoque efetivada.",
                                        usuario,
                                    ),
                                ],
                            }
                            : p,
                    ),
                }))
            },

            marcarEntregue: (pedidoId, usuario) => {
                set((state) => ({
                    pedidos: state.pedidos.map((p) =>
                        p.id === pedidoId
                            ? {
                                ...p,
                                status: "ENTREGUE" as const,
                                statusAlteradoEm: new Date().toISOString(),
                                eventos: [
                                    ...p.eventos,
                                    novoEvento("PEDIDO_ENTREGUE", "Entrega confirmada.", usuario),
                                ],
                            }
                            : p,
                    ),
                }))
            },
        }),
        { name: "nordil-pedidos-store" },
    ),
)