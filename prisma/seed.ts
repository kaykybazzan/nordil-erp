import "dotenv/config"
import { prisma } from "../lib/db"
import bcrypt from "bcryptjs"

const MOCK_USUARIOS = [
  { id: "usr-000", nome: "Helena Duarte", email: "helena@nordil.com", precisaTrocarSenha: false, cargo: "Administradora", empresaId: "emp-001", role: "ADMIN", funcao: "ADMINISTRATIVO", status: "ativo" },
  { id: "usr-002", nome: "Rafael Torres", email: "rafael@nordil.com", precisaTrocarSenha: true, cargo: "Vendedor", empresaId: "emp-001", role: "OPERADOR", funcao: "VENDAS", status: "ativo" },
  { id: "usr-003", nome: "Patrícia Lima", email: "patricia@nordil.com", precisaTrocarSenha: false, cargo: "Supervisora de Operações", empresaId: "emp-001", role: "SUPERVISOR", funcao: "ADMINISTRATIVO", status: "ativo" },
  { id: "usr-004", nome: "Marcos Souza", email: "marcos@nordil.com", precisaTrocarSenha: true, cargo: "Estoquista", empresaId: "emp-001", role: "OPERADOR", funcao: "ESTOQUE", status: "ativo" },
  { id: "usr-005", nome: "Juliana Alves", email: "juliana@nordil.com", precisaTrocarSenha: false, cargo: "Conferente", empresaId: "emp-001", role: "OPERADOR", funcao: "CONFERENCIA", status: "ativo" },
  { id: "usr-006", nome: "Diego Fontes", email: "diego@nordil.com", precisaTrocarSenha: false, cargo: "Expedicionista", empresaId: "emp-001", role: "OPERADOR", funcao: "EXPEDICAO", status: "ativo" },
]

function gerarSenhaTemporariaSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}

async function main() {
  const empresa = await prisma.empresa.create({
    data: {
      razaoSocial: "Nordil Distribuidora de Materiais Elétricos Ltda",
      cnpj: "00.000.000/0001-00", // placeholder — ajustar com dado real depois
    },
  })
  for (const u of MOCK_USUARIOS) {
    const senhaTemporaria = gerarSenhaTemporariaSeed()
    await prisma.usuario.create({
      data: {
        empresaId: empresa.id,
        nome: u.nome,
        email: u.email,
        senhaHash: await bcrypt.hash(senhaTemporaria, 10),
        precisaTrocarSenha: true,
        role: u.role,
        funcao: u.funcao,
        cargo: u.cargo,
        status: u.status,
      },
    })
    console.log(`Usuário ${u.email} criado. Senha temporária: ${senhaTemporaria}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => await prisma.$disconnect())