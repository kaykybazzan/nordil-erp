import type { PoliticaSenhaMinima } from "@/types/domain"

export interface SenhaValidacao {
  valido: boolean
  erro?: string
}

/**
 * Valida uma senha de acordo com a política configurada da empresa.
 * Pode ser usada tanto no client quanto no server.
 */
export function validarSenha(
  senha: string,
  politica: PoliticaSenhaMinima
): SenhaValidacao {
  if (!senha || senha.length === 0) {
    return { valido: false, erro: "Senha é obrigatória." }
  }

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

  // Validar comprimento mínimo
  if (senha.length < regras.minLength) {
    return {
      valido: false,
      erro: `A senha deve ter pelo menos ${regras.minLength} caracteres.`,
    }
  }

  // Validar letras e números (para MÉDIA e FORTE)
  if (regras.requerLetrasNumeros) {
    const temLetra = /[a-zA-Z]/.test(senha)
    const temNumero = /[0-9]/.test(senha)

    if (!temLetra || !temNumero) {
      return {
        valido: false,
        erro: "A senha deve conter letras e números.",
      }
    }
  }

  // Validar símbolo (para FORTE)
  if (regras.requerSimbolo) {
    const temSimbolo = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)

    if (!temSimbolo) {
      return {
        valido: false,
        erro: "A senha deve conter pelo menos um símbolo (!@#$% etc.).",
      }
    }
  }

  return { valido: true }
}

/**
 * Obtém uma descrição amigável dos requisitos da política de senha.
 */
export function obterDescricaoPoliticaSenha(politica: PoliticaSenhaMinima): string {
  const descricoes: Record<PoliticaSenhaMinima, string> = {
    BASICA: "Mínimo 8 caracteres",
    MEDIA: "Mínimo 10 caracteres, letras e números",
    FORTE: "Mínimo 12 caracteres, letras, números e símbolo",
  }

  return descricoes[politica]
}
