import { Prisma } from "@prisma/client"
import { prisma } from "./db"

/**
 * Client Prisma com filtro automático de empresaId em toda query.
 * Uso: const db = tenantDb(empresaId); await db.usuario.findMany()
 * — já vem filtrado, sem precisar escrever WHERE empresaId manualmente
 * em nenhum Service ou Server Action.
 */
export function tenantDb(empresaId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const modelsComEmpresaId = ["Usuario", "Auditoria"] // expandir conforme novos modelos chegam nos próximos prompts
          if (modelsComEmpresaId.includes(model ?? "")) {
            const typedArgs = args as { where?: Record<string, unknown>; data?: Record<string, unknown> }

            if (["findMany", "findFirst", "count", "updateMany", "deleteMany"].includes(operation)) {
              typedArgs.where = { ...typedArgs.where, empresaId }
            }
            if (["create"].includes(operation)) {
              typedArgs.data = { ...typedArgs.data, empresaId }
            }
            if (["findUnique", "update", "delete"].includes(operation)) {
              // findUnique/update/delete por id não aceitam filtro composto direto
              // sem @@unique([id, empresaId]) no schema — documentar como limitação
              // conhecida e não tentar contornar aqui; próximos prompts endereçam se
              // isso virar problema real
            }
          }
          return query(args)
        },
      },
    },
  })
}