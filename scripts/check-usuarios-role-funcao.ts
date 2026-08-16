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
  const usuarios = await prisma.usuario.findMany({
    where: {
      role: {
        in: ['ADMIN', 'SUPERVISOR']
      },
      funcao: {
        not: 'ADMINISTRATIVO'
      }
    },
    select: {
      nome: true,
      role: true,
      funcao: true,
      email: true
    }
  })

  console.log('Usuários com role ADMIN/SUPERVISOR e função != ADMINISTRATIVO:')
  console.log('================================================================')
  
  if (usuarios.length === 0) {
    console.log('Nenhum usuário encontrado.')
  } else {
    usuarios.forEach(u => {
      console.log(`Nome: ${u.nome}`)
      console.log(`Email: ${u.email}`)
      console.log(`Role: ${u.role}`)
      console.log(`Função: ${u.funcao}`)
      console.log('---')
    })
  }

  await prisma.$disconnect()
}

main()
