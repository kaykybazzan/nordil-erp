import { create } from "zustand"
import type {
    Pedido,
    ItemPedido,
    EnderecoPedido,
    Usuario,
    StatusPedido,
    Conferencia,
} from "@/types/domain"
import {
    actionCriarPedido,
    actionReprocessarReserva,
    actionCancelarPedido,
    actionExpedirPedido,
    actionMarcarEntregue,
    actionObterPedidos,
} from "./actions/pedidos"
import {
    actionIniciarSeparacao,
    actionFinalizarSeparacao,
} from "./actions/separacao"
import {
    actionListarFilaConferencia,
    actionIniciarConferencia,
    actionRegistrarItemConferencia,
    actionFinalizarConferencia,
} from "./actions/conferencia"


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
}

type AcaoResultado = { ok: true; data?: Pedido } | { ok: false; error?: string }
type AcaoResultadoConferencia = { ok: true; data?: Conferencia } | { ok: false; error?: string }

interface PedidosState {
    pedidos: Pedido[]
    filaConferencia: Pedido[]
    conferenciaAtual: Conferencia | null

    carregarPedidos: () => Promise<{ ok: boolean; error?: string }>

    criarPedido: (input: CriarPedidoInput) => Promise<AcaoResultado>

    reprocessarReserva: (pedidoId: string) => Promise<AcaoResultado>

    cancelarPedido: (pedidoId: string, motivo: string) => Promise<AcaoResultado>

    iniciarSeparacao: (pedidoId: string) => Promise<AcaoResultado>
    concluirSeparacao: (pedidoId: string, itens: Array<{ itemPedidoId: string; quantidadeSeparada: number }>) => Promise<AcaoResultado>
    carregarFilaConferencia: () => Promise<{ ok: boolean; error?: string }>
    iniciarConferencia: (pedidoId: string) => Promise<AcaoResultadoConferencia>
    registrarItemConferencia: (input: {
        conferenciaId: string
        conferenciaItemId: string
        quantidadeConferida: number
    }) => Promise<AcaoResultadoConferencia>
    finalizarConferencia: (conferenciaId: string) => Promise<AcaoResultado>

    expedirPedido: (pedidoId: string, transportadora: string) => Promise<AcaoResultado>
    marcarEntregue: (pedidoId: string) => Promise<AcaoResultado>
}

export const usePedidosStore = create<PedidosState>()(
    (set, get) => ({
        pedidos: [],
        filaConferencia: [],
        conferenciaAtual: null,

        carregarPedidos: async () => {
            const resultado = await actionObterPedidos()
            if (!resultado.ok) {
                return { ok: false, error: resultado.error || "Erro ao carregar pedidos" }
            }
            set({ pedidos: resultado.data })
            return { ok: true }
        },

        criarPedido: async (input) => {
            const resultado = await actionCriarPedido(input)
            if (!resultado.ok) {
                return { ok: false, error: resultado.error || "Erro ao criar pedido" }
            }
            if (!resultado.data) {
                return { ok: false, error: "Erro ao criar pedido: dados não retornados" }
            }
            set((state) => ({ pedidos: [...state.pedidos, resultado.data] }))
            return { ok: true, data: resultado.data }
        },

        reprocessarReserva: async (pedidoId) => {
            const resultado = await actionReprocessarReserva(pedidoId)
            if (!resultado.ok) {
                return { ok: false, error: resultado.error || "Erro ao reprocessar reserva" }
            }
            if (!resultado.data) {
                return { ok: false, error: "Erro ao reprocessar reserva: dados não retornados" }
            }
            set((state) => ({
                pedidos: state.pedidos.map((p) => (p.id === pedidoId ? resultado.data : p)),
            }))
            return { ok: true, data: resultado.data }
        },

        cancelarPedido: async (pedidoId, motivo) => {
            const resultado = await actionCancelarPedido(pedidoId, motivo)
            if (!resultado.ok) {
                return { ok: false, error: resultado.error || "Erro ao cancelar pedido" }
            }
            if (!resultado.data) {
                return { ok: false, error: "Erro ao cancelar pedido: dados não retornados" }
            }
            set((state) => ({
                pedidos: state.pedidos.map((p) => (p.id === pedidoId ? resultado.data : p)),
            }))
            return { ok: true, data: resultado.data }
        },

        iniciarSeparacao: async (pedidoId) => {
            const resultado = await actionIniciarSeparacao({ pedidoId })
            if (!resultado.ok) {
                return { ok: false, error: resultado.error || "Erro ao iniciar separação" }
            }
            if (!resultado.data) {
                return { ok: false, error: "Erro ao iniciar separação: dados não retornados" }
            }
            set((state) => ({
                pedidos: state.pedidos.map((p) => (p.id === pedidoId ? resultado.data : p)),
            }))
            return { ok: true, data: resultado.data }
        },

        concluirSeparacao: async (pedidoId, itens) => {
            const resultado = await actionFinalizarSeparacao({ pedidoId, itens })
            if (!resultado.ok) {
                return { ok: false, error: resultado.error || "Erro ao concluir separação" }
            }
            if (!resultado.data) {
                return { ok: false, error: "Erro ao concluir separação: dados não retornados" }
            }
            set((state) => ({
                pedidos: state.pedidos.map((p) => (p.id === pedidoId ? resultado.data : p)),
            }))
            return { ok: true, data: resultado.data }
        },

        carregarFilaConferencia: async () => {
            const resultado = await actionListarFilaConferencia()
            if (!resultado.ok) {
                return { ok: false, error: resultado.error || "Erro ao carregar fila de conferência" }
            }
            set({ filaConferencia: resultado.data ?? [] })
            return { ok: true }
        },

        iniciarConferencia: async (pedidoId) => {
            const resultado = await actionIniciarConferencia({ pedidoId })
            if (!resultado.ok) {
                return { ok: false, error: resultado.error || "Erro ao iniciar conferência" }
            }
            if (!resultado.data) {
                return { ok: false, error: "Erro ao iniciar conferência: dados não retornados" }
            }
            set({ conferenciaAtual: resultado.data })
            return { ok: true, data: resultado.data }
        },

        registrarItemConferencia: async (input) => {
            const resultado = await actionRegistrarItemConferencia(input)
            if (!resultado.ok) {
                return { ok: false, error: resultado.error || "Erro ao registrar item de conferência" }
            }
            if (!resultado.data) {
                return { ok: false, error: "Erro ao registrar item de conferência: dados não retornados" }
            }
            set({ conferenciaAtual: resultado.data })
            return { ok: true, data: resultado.data }
        },

        finalizarConferencia: async (conferenciaId) => {
            const resultado = await actionFinalizarConferencia({ conferenciaId })
            if (!resultado.ok) {
                return { ok: false, error: resultado.error || "Erro ao finalizar conferência" }
            }
            if (!resultado.data) {
                return { ok: false, error: "Erro ao finalizar conferência: dados não retornados" }
            }
            set((state) => ({
                pedidos: state.pedidos.map((p) => (p.id === resultado.data!.id ? resultado.data! : p)),
                filaConferencia: state.filaConferencia.filter((p) => p.id !== resultado.data!.id),
                conferenciaAtual: null,
            }))
            return { ok: true, data: resultado.data }
        },

        expedirPedido: async (pedidoId, transportadora) => {
            const resultado = await actionExpedirPedido(pedidoId, transportadora)
            if (!resultado.ok) {
                return { ok: false, error: resultado.error || "Erro ao expedir pedido" }
            }
            if (!resultado.data) {
                return { ok: false, error: "Erro ao expedir pedido: dados não retornados" }
            }
            set((state) => ({
                pedidos: state.pedidos.map((p) => (p.id === pedidoId ? resultado.data : p)),
            }))
            return { ok: true, data: resultado.data }
        },

        marcarEntregue: async (pedidoId) => {
            const resultado = await actionMarcarEntregue(pedidoId)
            if (!resultado.ok) {
                return { ok: false, error: resultado.error || "Erro ao marcar entregue" }
            }
            if (!resultado.data) {
                return { ok: false, error: "Erro ao marcar entregue: dados não retornados" }
            }
            set((state) => ({
                pedidos: state.pedidos.map((p) => (p.id === pedidoId ? resultado.data : p)),
            }))
            return { ok: true, data: resultado.data }
        },
    }),
)