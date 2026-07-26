import type { Usuario } from "@/types/domain"

export function emailDuplicado(usuarios: Usuario[], email: string, ignorarId?: string): boolean {
  const alvo = email.trim().toLowerCase()
  return usuarios.some((u) => u.id !== ignorarId && u.email.toLowerCase() === alvo)
}

export function alternarStatusUsuario(usuario: Usuario): Usuario {
  return { ...usuario, status: usuario.status === "ativo" ? "inativo" : "ativo" }
}

export function gerarSenhaTemporaria(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  let senha = ""
  for (let i = 0; i < 8; i++) {
    senha += chars[Math.floor(Math.random() * chars.length)]
  }
  return senha
}