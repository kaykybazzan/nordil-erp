import type { Usuario } from "@/types/domain"

export const MOCK_USUARIOS: Usuario[] = [
  { id: "usr-001", nome: "Carla Mendes", email: "carla@nordil.com", empresaId: "emp-001", role: "OPERADOR", funcao: "VENDAS" },
  { id: "usr-002", nome: "Rafael Torres", email: "rafael@nordil.com", empresaId: "emp-001", role: "OPERADOR", funcao: "VENDAS" },
  { id: "usr-003", nome: "Patrícia Lima", email: "patricia@nordil.com", empresaId: "emp-001", role: "SUPERVISOR", funcao: "ADMINISTRATIVO" },
  { id: "usr-004", nome: "Marcos Souza", email: "marcos@nordil.com", empresaId: "emp-001", role: "OPERADOR", funcao: "ESTOQUE" },
  { id: "usr-005", nome: "Juliana Alves", email: "juliana@nordil.com", empresaId: "emp-001", role: "OPERADOR", funcao: "CONFERENCIA" },
  { id: "usr-006", nome: "Diego Fontes", email: "diego@nordil.com", empresaId: "emp-001", role: "OPERADOR", funcao: "EXPEDICAO" },
]