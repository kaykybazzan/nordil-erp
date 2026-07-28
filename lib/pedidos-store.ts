import { create } from "zustand"
import type {
    Pedido,
    ItemPedido,
    EnderecoPedido,
    Usuario,
    StatusPedido,
} from "@/types/domain"
import {
    actionCriarPedido,
    actionReprocessarReserva,
    actionCancelarPedido,
    actionIniciarSeparacao,
    actionMarcarItemSeparado,
    actionConcluirSeparacao,
    actionConfirmarConferencia,
    actionRegistrarDivergenciaConferencia,
    actionExpedirPedido,
    actionMarcarEntregue,
    actionObterPedidos,
} from "./actions/pedidos"


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

interface PedidosState {
    pedidos: Pedido[]

    carregarPedidos: () => Promise<{ ok: boolean; error?: string }>

    criarPedido: (input: CriarPedidoInput) => Promise<AcaoResultado>

    reprocessarReserva: (pedidoId: string) => Promise<AcaoResultado>

    cancelarPedido: (pedidoId: string, motivo: string) => Promise<AcaoResultado>

    iniciarSeparacao: (pedidoId: string) => Promise<AcaoResultado>
    marcarItemSeparado: (pedidoId: string, itemId: string) => Promise<AcaoResultado>
    concluirSeparacao: (pedidoId: string) => Promise<AcaoResultado>

    confirmarConferencia: (pedidoId: string) => Promise<AcaoResultado>
    registrarDivergenciaConferencia: (pedidoId: string, descricao: string) => Promise<AcaoResultado>

    expedirPedido: (pedidoId: string, transportadora: string) => Promise<AcaoResultado>
    marcarEntregue: (pedidoId: string) => Promise<AcaoResultado>
}

export const usePedidosStore = create<PedidosState>()(
    (set, get) => ({
        pedidos: [],

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
            const resultado = await actionIniciarSeparacao(pedidoId)
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

        marcarItemSeparado: async (pedidoId, itemId) => {
            const resultado = await actionMarcarItemSeparado(pedidoId, itemId)
            if (!resultado.ok) {
                return { ok: false, error: resultado.error || "Erro ao marcar item separado" }
            }
            if (!resultado.data) {
                return { ok: false, error: "Erro ao marcar item separado: dados não retornados" }
            }
            set((state) => ({
                pedidos: state.pedidos.map((p) => (p.id === pedidoId ? resultado.data : p)),
            }))
            return { ok: true, data: resultado.data }
        },

        concluirSeparacao: async (pedidoId) => {
            const resultado = await actionConcluirSeparacao(pedidoId)
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

        confirmarConferencia: async (pedidoId) => {
            const resultado = await actionConfirmarConferencia(pedidoId)
            if (!resultado.ok) {
                return { ok: false, error: resultado.error || "Erro ao confirmar conferência" }
            }
            if (!resultado.data) {
                return { ok: false, error: "Erro ao confirmar conferência: dados não retornados" }
            }
            set((state) => ({
                pedidos: state.pedidos.map((p) => (p.id === pedidoId ? resultado.data : p)),
            }))
            return { ok: true, data: resultado.data }
        },

        registrarDivergenciaConferencia: async (pedidoId, descricao) => {
            const resultado = await actionRegistrarDivergenciaConferencia(pedidoId, descricao)
            if (!resultado.ok) {
                return { ok: false, error: resultado.error || "Erro ao registrar divergência" }
            }
            if (!resultado.data) {
                return { ok: false, error: "Erro ao registrar divergência: dados não retornados" }
            }
            set((state) => ({
                pedidos: state.pedidos.map((p) => (p.id === pedidoId ? resultado.data : p)),
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