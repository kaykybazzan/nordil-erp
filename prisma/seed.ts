import "dotenv/config"
import { prisma } from "../lib/db"
import { MOCK_USUARIOS } from "../lib/mock-usuarios"
import bcrypt from "bcryptjs"

async function main() {
  const empresa = await prisma.empresa.create({
    data: {
      razaoSocial: "Nordil Distribuidora de Materiais Elétricos Ltda",
      cnpj: "00.000.000/0001-00", // placeholder — ajustar com dado real depois
    },
  })
  for (const u of MOCK_USUARIOS) {
    await prisma.usuario.create({
      data: {
        empresaId: empresa.id,
        nome: u.nome,
        email: u.email,
        senhaHash: await bcrypt.hash(u.senha, 10),
        precisaTrocarSenha: u.precisaTrocarSenha,
        role: u.role,
        funcao: u.funcao,
        cargo: u.cargo,
        status: u.status,
      },
    })
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => await prisma.$disconnect())