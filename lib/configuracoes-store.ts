import { create } from "zustand"
import type { Configuracoes } from "@/types/domain"
import { actionObterConfiguracoes } from "./actions/configuracoes"
import { actionAtualizarRegrasOperacionais } from "./actions/configuracoes"
import { actionAtualizarDadosEmpresa } from "./actions/configuracoes"
import { actionAtualizarDeposito } from "./actions/configuracoes"
import { actionAtualizarSeguranca } from "./actions/configuracoes"


interface ConfiguracoesState {
    configuracoes: Configuracoes | null
    loading: boolean
    error: string | null
    carregarConfiguracoes: () => Promise<void>
    atualizarRegrasOperacionais: (valores: Configuracoes["regrasOperacionais"]) => Promise<{ ok: boolean; error?: string }>
    atualizarDadosEmpresa: (valores: Configuracoes["dadosEmpresa"]) => Promise<{ ok: boolean; error?: string }>
    atualizarDeposito: (valores: Configuracoes["deposito"]) => Promise<{ ok: boolean; error?: string }>
    atualizarSeguranca: (valores: Configuracoes["seguranca"]) => Promise<{ ok: boolean; error?: string }>
}

export const useConfiguracoesStore = create<ConfiguracoesState>()((set, get) => ({
    configuracoes: null,
    loading: false,
    error: null,

    carregarConfiguracoes: async () => {
        set({ loading: true, error: null })
        const result = await actionObterConfiguracoes()
        if (result.ok) {
            set({ configuracoes: result.data, loading: false })
        } else {
            set({ error: result.error, loading: false })
        }
    },

    atualizarRegrasOperacionais: async (valores) => {
        const result = await actionAtualizarRegrasOperacionais(valores)
        if (result.ok) {
            set({ configuracoes: result.data })
        }
        return result
    },

    atualizarDadosEmpresa: async (valores) => {
        const result = await actionAtualizarDadosEmpresa(valores)
        if (result.ok) {
            set({ configuracoes: result.data })
        }
        return result
    },

    atualizarDeposito: async (valores) => {
        const result = await actionAtualizarDeposito(valores)
        if (result.ok) {
            set({ configuracoes: result.data })
        }
        return result
    },

    atualizarSeguranca: async (valores) => {
        const result = await actionAtualizarSeguranca(valores)
        if (result.ok) {
            set({ configuracoes: result.data })
        }
        return result
    },
}))