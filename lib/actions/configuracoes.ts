"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionRegistrarAuditoria } from "@/lib/actions/auditoria"
import { podeVerConfiguracoes } from "@/lib/policies"
import { z } from "zod"
import type { Configuracoes } from "@/types/domain"

function formatarConfiguracoes(row: any): Configuracoes {
  return {
    empresaId: row.empresaId,
    regrasOperacionais: {
      permitirAutoConferencia: row.permitirAutoConferencia,
      permitirAprovacaoExcepcionalDivergencia: row.permitirAprovacaoExcepcionalDivergencia,
    },
    dadosEmpresa: {
      razaoSocial: row.razaoSocial,
      nomeFantasia: row.nomeFantasia ?? undefined,
      cnpj: row.cnpj,
      email: row.email ?? undefined,
      telefone: row.telefone ?? undefined,
      endereco: row.enderecoLogradouro
        ? {
            logradouro: row.enderecoLogradouro,
            numero: row.enderecoNumero ?? "",
            bairro: row.enderecoBairro ?? "",
            cidade: row.enderecoCidade ?? "",
            uf: row.enderecoUf ?? "",
            cep: row.enderecoCep ?? "",
          }
        : undefined,
    },
    deposito: {
      nome: row.depositoNome,
      endereco: {
        logradouro: row.depositoLogradouro,
        numero: row.depositoNumero,
        bairro: row.depositoBairro,
        cidade: row.depositoCidade,
        uf: row.depositoUf,
        cep: row.depositoCep,
      },
      responsavel: row.depositoResponsavel ?? undefined,
    },
    seguranca: {
      tempoExpiracaoSessaoMinutos: row.tempoExpiracaoSessaoMinutos,
      politicaSenhaMinima: row.politicaSenhaMinima,
      duracaoSenhaTemporariaDias: row.duracaoSenhaTemporariaDias,
    },
  }
}

// Garante que a linha exista (lazy init na primeira leitura/escrita da empresa)
async function obterOuCriarRow(empresaId: string) {
  const existente = await prisma.configuracoes.findUnique({ where: { empresaId } })
  if (existente) return existente
  return prisma.configuracoes.create({ data: { empresaId } })
}

function formatarValor(valor: unknown): string {
  if (valor === undefined || valor === null || valor === "") return "—"
  if (typeof valor === "boolean") return valor ? "Sim" : "Não"
  if (typeof valor === "object") return JSON.stringify(valor)
  return String(valor)
}

/**
 * Leitura pública (server-side) — usada por outras actions (ex: Conferência,
 * Módulo 13) pra checar regras operacionais. Não exige role ADMIN, só auth.
 */
export async function actionObterConfiguracoes() {
  const session = await auth()
  if (!session?.user?.empresaId) return { ok: false, error: "Não autenticado." }

  try {
    const row = await obterOuCriarRow(session.user.empresaId)
    return { ok: true, data: formatarConfiguracoes(row) }
  } catch (error) {
    console.error("Erro ao obter configurações:", error)
    return { ok: false, error: "Erro ao obter configurações." }
  }
}

const RegrasOperacionaisSchema = z.object({
  permitirAutoConferencia: z.boolean(),
  permitirAprovacaoExcepcionalDivergencia: z.boolean(),
})

export async function actionAtualizarRegrasOperacionais(
  valores: z.infer<typeof RegrasOperacionaisSchema>,
) {
  const session = await auth()
  if (!session?.user?.empresaId || !session.user.id) return { ok: false, error: "Não autenticado." }
  if (session.user.role !== "ADMIN") return { ok: false, error: "Sem permissão." }

  const validado = RegrasOperacionaisSchema.safeParse(valores)
  if (!validado.success) return { ok: false, error: "Dados inválidos." }

  try {
    const atual = await obterOuCriarRow(session.user.empresaId)
    const camposAlterados = [
      { campo: "permitirAutoConferencia", valorAnterior: formatarValor(atual.permitirAutoConferencia), valorNovo: formatarValor(valores.permitirAutoConferencia) },
      { campo: "permitirAprovacaoExcepcionalDivergencia", valorAnterior: formatarValor(atual.permitirAprovacaoExcepcionalDivergencia), valorNovo: formatarValor(valores.permitirAprovacaoExcepcionalDivergencia) },
    ].filter((c) => c.valorAnterior !== c.valorNovo)

    const atualizado = await prisma.configuracoes.update({
      where: { empresaId: session.user.empresaId },
      data: validado.data,
    })

    if (camposAlterados.length > 0) {
      await actionRegistrarAuditoria({
        modulo: "CONFIGURACOES",
        acao: "ATUALIZADO",
        entidadeId: session.user.empresaId,
        descricao: "Regras operacionais atualizadas.",
        camposAlterados,
      })
    }

    return { ok: true, data: formatarConfiguracoes(atualizado) }
  } catch (error) {
    console.error("Erro ao atualizar regras operacionais:", error)
    return { ok: false, error: "Erro ao atualizar regras operacionais." }
  }
}