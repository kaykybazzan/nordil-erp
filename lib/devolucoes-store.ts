import { create } from "zustand"
import type { Devolucao, ItemDevolucao } from "@/types/domain"
import {
  actionSolicitarDevolucao,
  actionConfirmarDevolucao,
  actionCancelarDevolucao,
  actionCalcularSaldoDevolvivel,
  actionListarDevolucoes,
} from "./actions/devolucoes"

// Mapeamento de formato: Actions retornam { ok, data/error }, components esperam { sucesso, devolucao/erro }
// Traduzimos na borda da store para não quebrar componentes existentes.
//
// Mapeamento de campos: Schema Prisma usa nomes diferentes de types/domain.ts.
// Mapeamos aqui para manter escopo restrito à store (opção a).
// - motivoDescricao → motivoOutroTexto
// - solicitadoPorId → solicitadoPor
// - confirmadoPorId → confirmadoPor
// - canceladoPorId → canceladoPor
// - criadoEm → solicitadoEm
// - statusAlteradoEm → confirmadoEm/canceladoEm
// - motivo (lowercase: avariado) → motivo (uppercase: PRODUTO_AVARIADO)
// - itemPedido.produtoId (via relation) → produtoId direto

type ResultadoDevolucao = { sucesso: true; devolucao: Devolucao } | { sucesso: false; erro: string }

interface SolicitarDevolucaoInput {
  pedidoId: string
  itens: {
    itemPedidoId: string
    quantidadeSolicitada: number
  }[]
  motivo: "PRODUTO_AVARIADO" | "PRODUTO_INCORRETO" | "DEFEITO" | "DESISTENCIA_CLIENTE" | "EXCESSO_COMPRA" | "OUTRO"
  motivoOutroTexto?: string
}

interface ConfirmarDevolucaoInput {
  itens: {
    itemPedidoId: string
    quantidadeConfirmada: number
    observacaoAjuste?: string
  }[]
}

interface DevolucoesState {
  devolucoes: Devolucao[]
  loading: boolean
  error: string | null

  carregarDevolucoes: (filtros?: { status?: string; pedidoId?: string }) => Promise<{ ok: boolean; error?: string }>
  solicitarDevolucao: (input: SolicitarDevolucaoInput) => Promise<ResultadoDevolucao>
  confirmarDevolucao: (devolucaoId: string, input: ConfirmarDevolucaoInput) => Promise<ResultadoDevolucao>
  cancelarDevolucao: (devolucaoId: string) => Promise<ResultadoDevolucao>
  calcularSaldoDevolvivel: (pedidoId: string, itemPedidoId: string) => Promise<number>
}

export const useDevolucoesStore = create<DevolucoesState>()(
  (set, get) => ({
    devolucoes: [],
    loading: false,
    error: null,

    carregarDevolucoes: async (filtros) => {
      set({ loading: true, error: null })
      try {
        const resultado = await actionListarDevolucoes(filtros)
        if (!resultado.ok) {
          set({ error: resultado.error || "Erro ao carregar devoluções", loading: false })
          return { ok: false, error: resultado.error }
        }

        // Mapear do formato do Prisma para o formato de types/domain.ts
        const devolucoesMapeadas: Devolucao[] = resultado.data.map((d: any) => ({
          id: d.id,
          empresaId: d.empresaId,
          pedidoId: d.pedidoId,
          itens: d.itens.map((i: any) => ({
            itemPedidoId: i.itemPedidoId,
            produtoId: i.itemPedido?.produtoId || "", // Via relation do Prisma
            quantidadeSolicitada: Number(i.quantidadeSolicitada),
            quantidadeConfirmada: i.quantidadeConfirmada ? Number(i.quantidadeConfirmada) : null,
            observacaoAjuste: i.observacaoAjuste || undefined,
          })),
          motivo: mapearMotivoParaUppercase(d.motivo),
          motivoOutroTexto: d.motivoDescricao || undefined,
          status: d.status,
          solicitadoPor: d.solicitadoPorId,
          solicitadoEm: d.criadoEm,
          confirmadoPor: d.confirmadoPorId || undefined,
          confirmadoEm: d.status === "CONCLUIDA" ? d.statusAlteradoEm : undefined,
          canceladoPor: d.canceladoPorId || undefined,
          canceladoEm: d.status === "CANCELADA" ? d.statusAlteradoEm : undefined,
        }))

        set({ devolucoes: devolucoesMapeadas, loading: false })
        return { ok: true }
      } catch (error) {
        set({ error: "Erro ao carregar devoluções", loading: false })
        return { ok: false, error: "Erro ao carregar devoluções" }
      }
    },

    solicitarDevolucao: async (input) => {
      const { pedidoId, itens, motivo, motivoOutroTexto } = input

      // Mapear motivo de uppercase para lowercase (schema usa lowercase)
      const motivoLowercase = mapearMotivoParaLowercase(motivo)

      const resultado = await actionSolicitarDevolucao({
        pedidoId,
        itens,
        motivo: motivoLowercase,
        motivoDescricao: motivo === "OUTRO" ? motivoOutroTexto : undefined,
      })

      if (!resultado.ok) {
        return { sucesso: false, erro: resultado.error }
      }

      // Recarregar devoluções para ter o estado atualizado
      await get().carregarDevolucoes({ pedidoId })

      // Buscar a devolução criada para retornar no formato esperado
      const devolucaoAtualizada = get().devolucoes.find((d) => d.id === resultado.data.id)
      if (!devolucaoAtualizada) {
        return { sucesso: false, erro: "Erro ao recuperar devolução criada" }
      }

      return { sucesso: true, devolucao: devolucaoAtualizada }
    },

    confirmarDevolucao: async (devolucaoId, input) => {
      const resultado = await actionConfirmarDevolucao(devolucaoId, input)

      if (!resultado.ok) {
        return { sucesso: false, erro: resultado.error }
      }

      // Recarregar devoluções para ter o estado atualizado
      const devolucaoAntiga = get().devolucoes.find((d) => d.id === devolucaoId)
      const pedidoId = devolucaoAntiga?.pedidoId
      if (pedidoId) {
        await get().carregarDevolucoes({ pedidoId })
      }

      // Buscar a devolução atualizada para retornar no formato esperado
      const devolucaoAtualizada = get().devolucoes.find((d) => d.id === devolucaoId)
      if (!devolucaoAtualizada) {
        return { sucesso: false, erro: "Erro ao recuperar devolução atualizada" }
      }

      return { sucesso: true, devolucao: devolucaoAtualizada }
    },

    cancelarDevolucao: async (devolucaoId) => {
      const resultado = await actionCancelarDevolucao(devolucaoId)

      if (!resultado.ok) {
        return { sucesso: false, erro: resultado.error }
      }

      // Recarregar devoluções para ter o estado atualizado
      const devolucaoAntiga = get().devolucoes.find((d) => d.id === devolucaoId)
      const pedidoId = devolucaoAntiga?.pedidoId
      if (pedidoId) {
        await get().carregarDevolucoes({ pedidoId })
      }

      // Buscar a devolução atualizada para retornar no formato esperado
      const devolucaoAtualizada = get().devolucoes.find((d) => d.id === devolucaoId)
      if (!devolucaoAtualizada) {
        return { sucesso: false, erro: "Erro ao recuperar devolução atualizada" }
      }

      return { sucesso: true, devolucao: devolucaoAtualizada }
    },

    calcularSaldoDevolvivel: async (pedidoId, itemPedidoId) => {
      const resultado = await actionCalcularSaldoDevolvivel(pedidoId, itemPedidoId)
      if (!resultado.ok) {
        return 0
      }
      return resultado.data.saldo
    },
  }),
)

// Helpers de mapeamento de motivos (lowercase do schema ↔ uppercase do domain)
function mapearMotivoParaLowercase(motivo: string): "avariado" | "incorreto" | "defeito" | "desistencia" | "excesso" | "outro" {
  const mapa: Record<string, "avariado" | "incorreto" | "defeito" | "desistencia" | "excesso" | "outro"> = {
    "PRODUTO_AVARIADO": "avariado",
    "PRODUTO_INCORRETO": "incorreto",
    "DEFEITO": "defeito",
    "DESISTENCIA_CLIENTE": "desistencia",
    "EXCESSO_COMPRA": "excesso",
    "OUTRO": "outro",
  }
  return mapa[motivo] || "outro"
}

function mapearMotivoParaUppercase(motivo: string): string {
  const mapa: Record<string, string> = {
    "avariado": "PRODUTO_AVARIADO",
    "incorreto": "PRODUTO_INCORRETO",
    "defeito": "DEFEITO",
    "desistencia": "DESISTENCIA_CLIENTE",
    "excesso": "EXCESSO_COMPRA",
    "outro": "OUTRO",
  }
  return mapa[motivo] || motivo.toUpperCase()
}
