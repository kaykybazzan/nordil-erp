import type { Usuario } from "@/types/domain"
import type { PoliticaSenhaMinima } from "@/types/domain"

export function emailDuplicado(usuarios: Usuario[], email: string, ignorarId?: string): boolean {
  const alvo = email.trim().toLowerCase()
  return usuarios.some((u) => u.id !== ignorarId && u.email.toLowerCase() === alvo)
}

export function alternarStatusUsuario(usuario: Usuario): Usuario {
  return { ...usuario, status: usuario.status === "ativo" ? "inativo" : "ativo" }
}

/**
 * Gera uma senha temporária que já nasce válida para a política configurada.
 * A função é async porque precisa buscar a configuração da empresa.
 */
export async function gerarSenhaTemporaria(): Promise<string> {
  const { actionObterConfiguracoes } = await import("./actions/configuracoes")
  
  // Tenta obter a política configurada; falha silenciosamente para MEDIA (fallback seguro)
  let politica: PoliticaSenhaMinima = "MEDIA"
  try {
    const configResult = await actionObterConfiguracoes()
    if (configResult.ok && configResult.data) {
      politica = configResult.data.seguranca.politicaSenhaMinima
    }
  } catch (error) {
    console.error("Erro ao obter política de senha, usando fallback MEDIA:", error)
  }

  return gerarSenhaParaPolitica(politica)
}

/**
 * Gera uma senha válida para uma política específica.
 * Pode ser usada diretamente quando a política já é conhecida.
 */
export function gerarSenhaParaPolitica(politica: PoliticaSenhaMinima): string {
  const config: Record<
    PoliticaSenhaMinima,
    { minLength: number; requerLetrasNumeros: boolean; requerSimbolo: boolean }
  > = {
    BASICA: {
      minLength: 8,
      requerLetrasNumeros: false,
      requerSimbolo: false,
    },
    MEDIA: {
      minLength: 10,
      requerLetrasNumeros: true,
      requerSimbolo: false,
    },
    FORTE: {
      minLength: 12,
      requerLetrasNumeros: true,
      requerSimbolo: true,
    },
  }

  const regras = config[politica]
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz"
  const numeros = "23456789"
  const simbolos = "!@#$%^&*"
  
  let senha = ""
  let charsets: string[] = [letras]
  
  if (regras.requerLetrasNumeros) {
    charsets.push(numeros)
  }
  
  if (regras.requerSimbolo) {
    charsets.push(simbolos)
  }

  // Garante pelo menos um caractere de cada charset necessário
  for (const charset of charsets) {
    senha += charset[Math.floor(Math.random() * charset.length)]
  }

  // Preenche o restante com caracteres aleatórios de todos os charsets
  const todosChars = charsets.join("")
  while (senha.length < regras.minLength) {
    senha += todosChars[Math.floor(Math.random() * todosChars.length)]
  }

  // Embaralha para evitar padrão previsível
  return senha.split('').sort(() => Math.random() - 0.5).join('')
}