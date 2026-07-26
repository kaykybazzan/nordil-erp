import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Configuracoes, Usuario } from "@/types/domain"
import { actionRegistrarAuditoria } from "./actions/auditoria"

const CONFIGURACOES_PADRAO: Configuracoes = {
    empresaId: "emp-001",
    regrasOperacionais: {
        permitirAutoConferencia: false,
        permitirAprovacaoExcepcionalDivergencia: false,
    },
    dadosEmpresa: {
        razaoSocial: "",
        nomeFantasia: undefined,
        cnpj: "",
        email: undefined,
        telefone: undefined,
        endereco: undefined,
    },
    deposito: {
        nome: "",
        endereco: { logradouro: "", numero: "", bairro: "", cidade: "", uf: "", cep: "" },
        responsavel: undefined,
    },
    seguranca: {
        tempoExpiracaoSessaoMinutos: 30,
        politicaSenhaMinima: "MEDIA",
        duracaoSenhaTemporariaDias: 7,
    },
}

function formatarValor(valor: unknown): string {
    if (valor === undefined || valor === null || valor === "") return "—"
    if (typeof valor === "boolean") return valor ? "Sim" : "Não"
    if (typeof valor === "object") return JSON.stringify(valor)
    return String(valor)
}

function diffCampos(
    anterior: Record<string, unknown>,
    novo: Record<string, unknown>,
): { campo: string; valorAnterior: string; valorNovo: string }[] {
    const campos: { campo: string; valorAnterior: string; valorNovo: string }[] = []
    for (const chave of Object.keys(novo)) {
        if (JSON.stringify(anterior[chave]) !== JSON.stringify(novo[chave])) {
            campos.push({
                campo: chave,
                valorAnterior: formatarValor(anterior[chave]),
                valorNovo: formatarValor(novo[chave]),
            })
        }
    }
    return campos
}

interface ConfiguracoesState {
    configuracoes: Configuracoes
    atualizarRegrasOperacionais: (valores: Configuracoes["regrasOperacionais"], usuario: Usuario) => void
    atualizarDadosEmpresa: (valores: Configuracoes["dadosEmpresa"], usuario: Usuario) => void
    atualizarDeposito: (valores: Configuracoes["deposito"], usuario: Usuario) => void
    atualizarSeguranca: (valores: Configuracoes["seguranca"], usuario: Usuario) => void
}

export const useConfiguracoesStore = create<ConfiguracoesState>()(
    persist(
        (set, get) => ({
            configuracoes: CONFIGURACOES_PADRAO,

            atualizarRegrasOperacionais: (valores, usuario) => {
                const atual = get().configuracoes
                const camposAlterados = diffCampos(atual.regrasOperacionais, valores)
                if (camposAlterados.length === 0) return

                actionRegistrarAuditoria({
                    modulo: "CONFIGURACOES",
                    acao: "ATUALIZADO",
                    entidadeId: atual.empresaId,
                    descricao: "Regras operacionais atualizadas.",
                    camposAlterados,
                }).then((result) => {
                    if (!result.ok) console.error("Erro ao registrar auditoria:", result.error)
                })

                set((state) => ({
                    configuracoes: { ...state.configuracoes, regrasOperacionais: valores },
                }))
            },

            atualizarDadosEmpresa: (valores, usuario) => {
                const atual = get().configuracoes
                const camposAlterados = diffCampos(atual.dadosEmpresa, valores)
                if (camposAlterados.length === 0) return

                actionRegistrarAuditoria({
                    modulo: "CONFIGURACOES",
                    acao: "ATUALIZADO",
                    entidadeId: atual.empresaId,
                    descricao: "Dados da empresa atualizados.",
                    camposAlterados,
                }).then((result) => {
                    if (!result.ok) console.error("Erro ao registrar auditoria:", result.error)
                })

                set((state) => ({
                    configuracoes: { ...state.configuracoes, dadosEmpresa: valores },
                }))
            },

            atualizarDeposito: (valores, usuario) => {
                const atual = get().configuracoes
                const camposAlterados = diffCampos(atual.deposito, valores)
                if (camposAlterados.length === 0) return

                actionRegistrarAuditoria({
                    modulo: "CONFIGURACOES",
                    acao: "ATUALIZADO",
                    entidadeId: atual.empresaId,
                    descricao: "Dados do depósito atualizados.",
                    camposAlterados,
                }).then((result) => {
                    if (!result.ok) console.error("Erro ao registrar auditoria:", result.error)
                })

                set((state) => ({
                    configuracoes: { ...state.configuracoes, deposito: valores },
                }))
            },

            atualizarSeguranca: (valores, usuario) => {
                const atual = get().configuracoes
                const camposAlterados = diffCampos(atual.seguranca, valores)
                if (camposAlterados.length === 0) return

                actionRegistrarAuditoria({
                    modulo: "CONFIGURACOES",
                    acao: "ATUALIZADO",
                    entidadeId: atual.empresaId,
                    descricao: "Configurações de segurança atualizadas.",
                    camposAlterados,
                }).then((result) => {
                    if (!result.ok) console.error("Erro ao registrar auditoria:", result.error)
                })

                set((state) => ({
                    configuracoes: { ...state.configuracoes, seguranca: valores },
                }))
            },
        }),
        { name: "nordil-configuracoes-store" },
    ),
)