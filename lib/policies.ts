import type { Usuario } from "@/types/domain"

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
 * Verifica se um usuário tem permissão para acessar Configurações.
 * Único perfil com acesso é o Administrador.
 */
export function podeVerConfiguracoes(usuario: Usuario): boolean {
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