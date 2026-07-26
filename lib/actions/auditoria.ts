"use server"

import { auth } from "@/lib/auth"
import { registrarAuditoria, obterAuditoria } from "@/lib/auditoria"
import { podeVerAuditoria } from "@/lib/policies"
import { MODULOS_AUDITORIA, ACOES_AUDITORIA, type ModuloAuditoria, type AcaoAuditoria } from "@/types/domain"
import { z } from "zod"

const registrarAuditoriaSchema = z.object({
  modulo: z.enum(MODULOS_AUDITORIA),
  acao: z.enum(ACOES_AUDITORIA),
  entidadeId: z.string().min(1),
  descricao: z.string().min(1),
  motivo: z.string().optional(),
  camposAlterados: z.array(
    z.object({
      campo: z.string(),
      valorAnterior: z.string(),
      valorNovo: z.string(),
    })
  ).optional(),
})

export async function actionRegistrarAuditoria(input: {
  modulo: ModuloAuditoria
  acao: AcaoAuditoria
  entidadeId: string
  descricao: string
  motivo?: string
  camposAlterados?: {
    campo: string
    valorAnterior: string
    valorNovo: string
  }[]
}) {
  const session = await auth()
  if (!session?.user) {
    return { ok: false, error: "Não autenticado." }
  }

  const validationResult = registrarAuditoriaSchema.safeParse(input)
  if (!validationResult.success) {
    return { ok: false, error: "Dados inválidos." }
  }

  try {
    await registrarAuditoria({
      ...input,
      usuarioId: session.user.id,
      usuarioNome: session.user.name || session.user.email || "Usuário",
      empresaId: session.user.empresaId,
    })

    return { ok: true, data: null }
  } catch (error) {
    console.error("Erro ao registrar auditoria:", error)
    return { ok: false, error: "Erro ao registrar auditoria." }
  }
}

export async function actionObterAuditoria() {
  const session = await auth()
  if (!session?.user) {
    return { ok: false, error: "Não autenticado." }
  }

  if (!podeVerAuditoria(session.user)) {
    return { ok: false, error: "Sem permissão." }
  }

  try {
    const data = await obterAuditoria(session.user.empresaId)
    return { ok: true, data }
  } catch (error) {
    console.error("Erro ao obter auditoria:", error)
    return { ok: false, error: "Erro ao obter auditoria." }
  }
}
