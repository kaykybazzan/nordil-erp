"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionRegistrarAuditoria } from "@/lib/actions/auditoria"
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

const DadosEmpresaSchema = z.object({
  razaoSocial: z.string().min(1, "Razão Social é obrigatória"),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().min(1, "CNPJ é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  endereco: z
    .object({
      logradouro: z.string().optional(),
      numero: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().optional(),
      cep: z.string().optional(),
    })
    .optional(),
})

const DepositoSchema = z.object({
  nome: z.string().min(1, "Nome do depósito é obrigatório"),
  endereco: z.object({
    logradouro: z.string().min(1, "Logradouro é obrigatório"),
    numero: z.string().min(1, "Número é obrigatório"),
    bairro: z.string().min(1, "Bairro é obrigatório"),
    cidade: z.string().min(1, "Cidade é obrigatória"),
    uf: z.string().min(1, "UF é obrigatória"),
    cep: z.string().min(1, "CEP é obrigatório"),
  }),
  responsavel: z.string().optional(),
})

const SegurancaSchema = z.object({
  tempoExpiracaoSessaoMinutos: z.number().int().min(5, "Mínimo de 5 minutos"),
  politicaSenhaMinima: z.enum(["BASICA", "MEDIA", "FORTE"]),
  duracaoSenhaTemporariaDias: z.number().int().min(1, "Mínimo de 1 dia"),
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
        entidadeDescricao: "Configurações: Regras Operacionais",
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

export async function actionAtualizarDadosEmpresa(
  valores: z.infer<typeof DadosEmpresaSchema>,
) {
  const session = await auth()
  if (!session?.user?.empresaId || !session.user.id) return { ok: false, error: "Não autenticado." }
  if (session.user.role !== "ADMIN") return { ok: false, error: "Sem permissão." }

  const validado = DadosEmpresaSchema.safeParse(valores)
  if (!validado.success) return { ok: false, error: "Dados inválidos." }

  try {
    const atual = await obterOuCriarRow(session.user.empresaId)
    const camposAlterados = [
      { campo: "razaoSocial", valorAnterior: formatarValor(atual.razaoSocial), valorNovo: formatarValor(valores.razaoSocial) },
      { campo: "nomeFantasia", valorAnterior: formatarValor(atual.nomeFantasia), valorNovo: formatarValor(valores.nomeFantasia) },
      { campo: "cnpj", valorAnterior: formatarValor(atual.cnpj), valorNovo: formatarValor(valores.cnpj) },
      { campo: "email", valorAnterior: formatarValor(atual.email), valorNovo: formatarValor(valores.email) },
      { campo: "telefone", valorAnterior: formatarValor(atual.telefone), valorNovo: formatarValor(valores.telefone) },
      { campo: "enderecoLogradouro", valorAnterior: formatarValor(atual.enderecoLogradouro), valorNovo: formatarValor(valores.endereco?.logradouro) },
      { campo: "enderecoNumero", valorAnterior: formatarValor(atual.enderecoNumero), valorNovo: formatarValor(valores.endereco?.numero) },
      { campo: "enderecoBairro", valorAnterior: formatarValor(atual.enderecoBairro), valorNovo: formatarValor(valores.endereco?.bairro) },
      { campo: "enderecoCidade", valorAnterior: formatarValor(atual.enderecoCidade), valorNovo: formatarValor(valores.endereco?.cidade) },
      { campo: "enderecoUf", valorAnterior: formatarValor(atual.enderecoUf), valorNovo: formatarValor(valores.endereco?.uf) },
      { campo: "enderecoCep", valorAnterior: formatarValor(atual.enderecoCep), valorNovo: formatarValor(valores.endereco?.cep) },
    ].filter((c) => c.valorAnterior !== c.valorNovo)

    const atualizado = await prisma.configuracoes.update({
      where: { empresaId: session.user.empresaId },
      data: {
        razaoSocial: validado.data.razaoSocial,
        nomeFantasia: validado.data.nomeFantasia || null,
        cnpj: validado.data.cnpj,
        email: validado.data.email || null,
        telefone: validado.data.telefone || null,
        enderecoLogradouro: validado.data.endereco?.logradouro || null,
        enderecoNumero: validado.data.endereco?.numero || null,
        enderecoBairro: validado.data.endereco?.bairro || null,
        enderecoCidade: validado.data.endereco?.cidade || null,
        enderecoUf: validado.data.endereco?.uf || null,
        enderecoCep: validado.data.endereco?.cep || null,
      },
    })

    if (camposAlterados.length > 0) {
      await actionRegistrarAuditoria({
        modulo: "CONFIGURACOES",
        acao: "ATUALIZADO",
        entidadeId: session.user.empresaId,
        entidadeDescricao: "Configurações: Dados da Empresa",
        descricao: "Dados da empresa atualizados.",
        camposAlterados,
      })
    }

    return { ok: true, data: formatarConfiguracoes(atualizado) }
  } catch (error) {
    console.error("Erro ao atualizar dados da empresa:", error)
    return { ok: false, error: "Erro ao atualizar dados da empresa." }
  }
}

export async function actionAtualizarDeposito(
  valores: z.infer<typeof DepositoSchema>,
) {
  const session = await auth()
  if (!session?.user?.empresaId || !session.user.id) return { ok: false, error: "Não autenticado." }
  if (session.user.role !== "ADMIN") return { ok: false, error: "Sem permissão." }

  const validado = DepositoSchema.safeParse(valores)
  if (!validado.success) return { ok: false, error: "Dados inválidos." }

  try {
    const atual = await obterOuCriarRow(session.user.empresaId)
    const camposAlterados = [
      { campo: "depositoNome", valorAnterior: formatarValor(atual.depositoNome), valorNovo: formatarValor(valores.nome) },
      { campo: "depositoLogradouro", valorAnterior: formatarValor(atual.depositoLogradouro), valorNovo: formatarValor(valores.endereco.logradouro) },
      { campo: "depositoNumero", valorAnterior: formatarValor(atual.depositoNumero), valorNovo: formatarValor(valores.endereco.numero) },
      { campo: "depositoBairro", valorAnterior: formatarValor(atual.depositoBairro), valorNovo: formatarValor(valores.endereco.bairro) },
      { campo: "depositoCidade", valorAnterior: formatarValor(atual.depositoCidade), valorNovo: formatarValor(valores.endereco.cidade) },
      { campo: "depositoUf", valorAnterior: formatarValor(atual.depositoUf), valorNovo: formatarValor(valores.endereco.uf) },
      { campo: "depositoCep", valorAnterior: formatarValor(atual.depositoCep), valorNovo: formatarValor(valores.endereco.cep) },
      { campo: "depositoResponsavel", valorAnterior: formatarValor(atual.depositoResponsavel), valorNovo: formatarValor(valores.responsavel) },
    ].filter((c) => c.valorAnterior !== c.valorNovo)

    const atualizado = await prisma.configuracoes.update({
      where: { empresaId: session.user.empresaId },
      data: {
        depositoNome: validado.data.nome,
        depositoLogradouro: validado.data.endereco.logradouro,
        depositoNumero: validado.data.endereco.numero,
        depositoBairro: validado.data.endereco.bairro,
        depositoCidade: validado.data.endereco.cidade,
        depositoUf: validado.data.endereco.uf,
        depositoCep: validado.data.endereco.cep,
        depositoResponsavel: validado.data.responsavel || null,
      },
    })

    if (camposAlterados.length > 0) {
      await actionRegistrarAuditoria({
        modulo: "CONFIGURACOES",
        acao: "ATUALIZADO",
        entidadeId: session.user.empresaId,
        entidadeDescricao: "Configurações: Depósito",
        descricao: "Dados do depósito atualizados.",
        camposAlterados,
      })
    }

    return { ok: true, data: formatarConfiguracoes(atualizado) }
  } catch (error) {
    console.error("Erro ao atualizar dados do depósito:", error)
    return { ok: false, error: "Erro ao atualizar dados do depósito." }
  }
}

export async function actionAtualizarSeguranca(
  valores: z.infer<typeof SegurancaSchema>,
) {
  const session = await auth()
  if (!session?.user?.empresaId || !session.user.id) return { ok: false, error: "Não autenticado." }
  if (session.user.role !== "ADMIN") return { ok: false, error: "Sem permissão." }

  const validado = SegurancaSchema.safeParse(valores)
  if (!validado.success) return { ok: false, error: "Dados inválidos." }

  try {
    const atual = await obterOuCriarRow(session.user.empresaId)
    const camposAlterados = [
      { campo: "tempoExpiracaoSessaoMinutos", valorAnterior: formatarValor(atual.tempoExpiracaoSessaoMinutos), valorNovo: formatarValor(valores.tempoExpiracaoSessaoMinutos) },
      { campo: "politicaSenhaMinima", valorAnterior: formatarValor(atual.politicaSenhaMinima), valorNovo: formatarValor(valores.politicaSenhaMinima) },
      { campo: "duracaoSenhaTemporariaDias", valorAnterior: formatarValor(atual.duracaoSenhaTemporariaDias), valorNovo: formatarValor(valores.duracaoSenhaTemporariaDias) },
    ].filter((c) => c.valorAnterior !== c.valorNovo)

    const atualizado = await prisma.configuracoes.update({
      where: { empresaId: session.user.empresaId },
      data: {
        tempoExpiracaoSessaoMinutos: validado.data.tempoExpiracaoSessaoMinutos,
        politicaSenhaMinima: validado.data.politicaSenhaMinima,
        duracaoSenhaTemporariaDias: validado.data.duracaoSenhaTemporariaDias,
      },
    })

    if (camposAlterados.length > 0) {
      await actionRegistrarAuditoria({
        modulo: "CONFIGURACOES",
        acao: "ATUALIZADO",
        entidadeId: session.user.empresaId,
        entidadeDescricao: "Configurações: Segurança",
        descricao: "Configurações de segurança atualizadas.",
        camposAlterados,
      })
    }

    return { ok: true, data: formatarConfiguracoes(atualizado) }
  } catch (error) {
    console.error("Erro ao atualizar configurações de segurança:", error)
    return { ok: false, error: "Erro ao atualizar configurações de segurança." }
  }
}