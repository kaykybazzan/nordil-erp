import "dotenv/config"
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

const connectionString = process.env.DATABASE_URL!

// Log para confirmar que DATABASE_URL foi carregado
console.log('DATABASE_URL prefixo:', connectionString.substring(0, 20) + '...')

const adapter = new PrismaNeon({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Primeiro, busca os usuários que precisam ser corrigidos
  const usuariosParaCorrigir = await prisma.usuario.findMany({
    where: {
      role: {
        in: ['ADMIN', 'SUPERVISOR']
      },
      funcao: {
        not: 'ADMINISTRATIVO'
      }
    },
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
      funcao: true,
      empresaId: true,
    }
  })

  console.log('Usuários encontrados para correção:', usuariosParaCorrigir.length)
  console.log('================================================================')

  if (usuariosParaCorrigir.length === 0) {
    console.log('Nenhum usuário precisa de correção.')
    await prisma.$disconnect()
    return
  }

  // Corrige cada usuário individualmente
  for (const usuario of usuariosParaCorrigir) {
    const funcaoAntiga = usuario.funcao
    
    console.log(`\nCorrigindo: ${usuario.nome} (${usuario.email})`)
    console.log(`  Role: ${usuario.role}`)
    console.log(`  Função antiga: ${funcaoAntiga}`)
    console.log(`  Função nova: ADMINISTRATIVO`)

    // Atualiza a função
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { funcao: 'ADMINISTRATIVO' }
    })

    // Registra na auditoria
    await prisma.auditoria.create({
      data: {
        modulo: 'USUARIOS',
        acao: 'ATUALIZADO',
        entidadeId: usuario.id,
        descricao: `Função ajustada automaticamente de ${funcaoAntiga} para ADMINISTRATIVO — correção de consistência role/função`,
        usuarioId: usuario.id,
        usuarioNome: usuario.nome,
        empresaId: usuario.empresaId,
        camposAlterados: [
          {
            campo: 'funcao',
            valorAnterior: funcaoAntiga,
            valorNovo: 'ADMINISTRATIVO'
          }
        ]
      }
    })

    console.log(`  ✓ Corrigido com sucesso`)
  }

  console.log('\n================================================================')
  console.log('Correção concluída.')
  console.log('Total de usuários corrigidos:', usuariosParaCorrigir.length)

  await prisma.$disconnect()
}

main()
