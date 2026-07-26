import type { ModuloAuditoria, AcaoAuditoria } from "@/types/domain"
import { tenantDb } from "./tenant-db"

/**
 * Registra um novo evento de auditoria (append-only).
 * Persiste no banco via tenantDb com filtro automático de empresaId.
 *
 * @param params - Dados do registro de auditoria
 * @param params.modulo - Módulo do sistema (ex: PEDIDOS, CLIENTES)
 * @param params.acao - Ação realizada (ex: CRIADO, ATUALIZADO)
 * @param params.entidadeId - ID da entidade afetada
 * @param params.descricao - Descrição do evento
 * @param params.usuarioId - ID do usuário que realizou a ação
 * @param params.usuarioNome - Nome do usuário que realizou a ação
 * @param params.empresaId - ID da empresa (multi-tenant)
 * @param params.motivo - Motivo opcional (ex: para cancelamentos)
 * @param params.camposAlterados - Lista de campos alterados com valores antes/depois
 */
export async function registrarAuditoria(params: {
  modulo: ModuloAuditoria
  acao: AcaoAuditoria
  entidadeId: string
  descricao: string
  usuarioId: string
  usuarioNome: string
  empresaId: string
  motivo?: string
  camposAlterados?: {
    campo: string
    valorAnterior: string
    valorNovo: string
  }[]
}): Promise<void> {
  const db = tenantDb(params.empresaId)

  await db.auditoria.create({
    data: {
      modulo: params.modulo,
      acao: params.acao,
      entidadeId: params.entidadeId,
      descricao: params.descricao,
      usuarioId: params.usuarioId,
      usuarioNome: params.usuarioNome,
      motivo: params.motivo,
      camposAlterados: params.camposAlterados,
      empresaId: params.empresaId,
    },
  })
}

/**
 * Retorna todos os registros de auditoria de uma empresa.
 * @param empresaId - ID da empresa para filtro multi-tenant
 */
export async function obterAuditoria(empresaId: string) {
  const db = tenantDb(empresaId)

  return db.auditoria.findMany({
    orderBy: { dataHora: "desc" },
  })
}
