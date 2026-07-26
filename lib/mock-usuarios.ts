import type { Usuario } from "@/types/domain"

export const MOCK_USUARIOS: Usuario[] = [
  { id: "usr-000", nome: "Helena Duarte", email: "helena@nordil.com", senha: "helena123", precisaTrocarSenha: false, cargo: "Administradora", empresaId: "emp-001", role: "ADMIN", funcao: "ADMINISTRATIVO", status: "ativo" },
  { id: "usr-002", nome: "Rafael Torres", email: "rafael@nordil.com", senha: "rafael123", precisaTrocarSenha: true, cargo: "Vendedor", empresaId: "emp-001", role: "OPERADOR", funcao: "VENDAS", status: "ativo" },
  { id: "usr-003", nome: "Patrícia Lima", email: "patricia@nordil.com", senha: "patricia123", precisaTrocarSenha: false, cargo: "Supervisora de Operações", empresaId: "emp-001", role: "SUPERVISOR", funcao: "ADMINISTRATIVO", status: "ativo" },
  { id: "usr-004", nome: "Marcos Souza", email: "marcos@nordil.com", senha: "marcos123", precisaTrocarSenha: true, cargo: "Estoquista", empresaId: "emp-001", role: "OPERADOR", funcao: "ESTOQUE", status: "ativo" },
  { id: "usr-005", nome: "Juliana Alves", email: "juliana@nordil.com", senha: "juliana123", precisaTrocarSenha: false, cargo: "Conferente", empresaId: "emp-001", role: "OPERADOR", funcao: "CONFERENCIA", status: "ativo" },
  { id: "usr-006", nome: "Diego Fontes", email: "diego@nordil.com", senha: "diego123", precisaTrocarSenha: false, cargo: "Expedicionista", empresaId: "emp-001", role: "OPERADOR", funcao: "EXPEDICAO", status: "ativo" },
]