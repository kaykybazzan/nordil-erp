import type { Usuario, InventarioContagem } from "@/types/domain"

type UsuarioComRole = {
  role: string
}

type UsuarioComRoleEFuncao = {
  role: string
  funcao: string
}

/**
 * Verifica se um usuário tem permissão para visualizar relatórios.
 * ADMIN sempre pode ver relatórios.
 * SUPERVISOR também pode ver relatórios.
 * OPERADOR não pode ver relatórios.
 */
export function podeVerRelatorios(usuario: Usuario): boolean {
  return usuario.role === "ADMIN" || usuario.role === "SUPERVISOR"
}

/**
 * Verifica se um usuário tem permissão para acessar Auditoria.
 * ADMIN sempre pode ver auditoria.
 * SUPERVISOR também pode ver auditoria.
 * OPERADOR não pode ver auditoria.
 */
export function podeVerAuditoria(usuario: UsuarioComRole): boolean {
  return usuario.role === "ADMIN" || usuario.role === "SUPERVISOR"
}

/**
 * Verifica se um usuário tem permissão para acessar Configurações.
 * Único perfil com acesso é o Administrador.
 */
export function podeVerConfiguracoes(usuario: Usuario): boolean {
  return usuario.role === "ADMIN"
}

/**
 * Verifica se um usuário tem permissão para gerenciar usuários
 * (criar, editar, ativar/inativar). Único perfil com acesso é o Administrador —
 * mais restrito que Configurações porque mexe em credenciais de outras pessoas.
 * Tipado com UsuarioComRole (não Usuario completo) porque é chamado a partir
 * de session.user no server, que não tem o shape completo de Usuario.
 */
export function podeGerenciarUsuarios(usuario: UsuarioComRole): boolean {
  return usuario.role === "ADMIN"
}

// ─── Devoluções

/**
 * Verifica se um usuário tem permissão para acessar o módulo de Devoluções.
 * ADMIN e SUPERVISOR sempre podem acessar.
 * OPERADOR com função VENDAS também pode acessar.
 */
export function podeAcessarDevolucoes(usuario: Usuario): boolean {
  return (
    usuario.role === "ADMIN" ||
    usuario.role === "SUPERVISOR" ||
    usuario.funcao === "VENDAS"
  )
}

/**
 * Verifica se um usuário tem permissão para gerenciar devoluções (confirmar/cancelar).
 * Confirmar recebimento ou cancelar uma devolução — Vendas não tem essa permissão,
 * apenas Supervisor e Admin.
 */
export function podeGerenciarDevolucao(usuario: Usuario): boolean {
  return usuario.role === "ADMIN" || usuario.role === "SUPERVISOR"
}

// ─── Inventário Contagem

/**
 * Verifica se um usuário tem permissão para abrir um inventário de contagem.
 * Apenas Supervisor e Admin podem abrir inventários.
 */
export function podeAbrirInventario(usuario: Usuario): boolean {
  return usuario.role === "SUPERVISOR" || usuario.role === "ADMIN"
}

/**
 * Verifica se um usuário tem permissão para contar produtos em um inventário.
 * Responsável designado sempre pode. Supervisor/Admin também podem contar
 * (a matriz trata os dois como classe geral, não restrita ao inventário específico).
 */
export function podeContarInventario(usuario: Usuario, inventario: InventarioContagem): boolean {
  if (usuario.role === "SUPERVISOR" || usuario.role === "ADMIN") return true
  return usuario.id === inventario.responsavelContagemId
}

/**
 * Verifica se um usuário tem permissão para aplicar ajustes de estoque
 * decorrentes de divergências de inventário.
 * Apenas Supervisor e Admin podem aplicar ajustes.
 */
export function podeAplicarAjusteInventario(usuario: Usuario): boolean {
  return usuario.role === "SUPERVISOR" || usuario.role === "ADMIN"
}

/**
 * Verifica se um usuário tem permissão para finalizar um inventário.
 * Apenas Supervisor e Admin podem finalizar.
 */
export function podeFinalizarInventario(usuario: Usuario): boolean {
  return usuario.role === "SUPERVISOR" || usuario.role === "ADMIN"
}

/**
 * Verifica se um usuário tem permissão para reatribuir o responsável
 * pela contagem de um inventário.
 * Qualquer Supervisor/Admin, não só quem abriu o inventário original.
 */
export function podeReatribuirResponsavelInventario(usuario: Usuario): boolean {
  return usuario.role === "SUPERVISOR" || usuario.role === "ADMIN"
}

// ─── Pedidos - Conferência

/**
 * Verifica se um usuário tem permissão para operar em conferência de pedidos.
 * ADMIN e SUPERVISOR sempre podem operar.
 * OPERADOR com função CONFERENCIA também pode operar.
 */
type UsuarioParaConferencia = { id: string; role: string; funcao: string }

/**
 * Verifica se um usuário tem permissão para operar a conferência de um pedido.
 * Precisa ter a permissão de função (ADMIN/SUPERVISOR/funcao CONFERENCIA) E,
 * se o pedido já estiver travado por outro conferente, só esse conferente
 * ou um Supervisor/Admin pode continuar. Mesmo espírito de podeOperarSeparacao.
 */
export function podeOperarConferencia(
  pedido: { conferenteId?: string | null },
  usuario: UsuarioParaConferencia,
): boolean {
  const temPermissaoDeFuncao =
    usuario.role === "ADMIN" || usuario.role === "SUPERVISOR" || usuario.funcao === "CONFERENCIA"

  if (!temPermissaoDeFuncao) return false

  if (!pedido.conferenteId) return true
  if (pedido.conferenteId === usuario.id) return true
  return usuario.role === "SUPERVISOR" || usuario.role === "ADMIN"
}

// ─── Pedidos - Expedição

/**
 * Verifica se um usuário tem permissão para operar em expedição de pedidos.
 * ADMIN e SUPERVISOR sempre podem operar.
 * OPERADOR com função EXPEDICAO também pode operar.
 */
export function podeOperarExpedicao(usuario: UsuarioComRoleEFuncao): boolean {
  return (
    usuario.role === "ADMIN" ||
    usuario.role === "SUPERVISOR" ||
    usuario.funcao === "EXPEDICAO"
  )
}