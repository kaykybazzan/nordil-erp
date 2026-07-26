import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      empresaId: string
      role: string
      funcao: string
      precisaTrocarSenha: boolean
    }
  }

  interface User {
    id: string
    email: string
    name: string
    empresaId: string
    role: string
    funcao: string
    precisaTrocarSenha: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    empresaId?: string
    role?: string
    funcao?: string
    precisaTrocarSenha?: boolean
  }
}
