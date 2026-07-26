import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        senha: {},
      },
      authorize: async (credentials) => {
        const email = credentials.email as string
        const senha = credentials.senha as string
        if (!email || !senha) return null

        const usuario = await prisma.usuario.findUnique({ where: { email } })
        if (!usuario) return null
        if (usuario.status === "inativo") return null

        const senhaValida = await bcrypt.compare(senha, usuario.senhaHash)
        if (!senhaValida) return null

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nome,
          empresaId: usuario.empresaId,
          role: usuario.role,
          funcao: usuario.funcao,
          precisaTrocarSenha: usuario.precisaTrocarSenha,
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.id = user.id
        token.empresaId = user.empresaId
        token.role = user.role
        token.funcao = user.funcao
        token.precisaTrocarSenha = user.precisaTrocarSenha
      }
      // Permite que o client force atualização do token via update()
      if (trigger === "update" && session?.precisaTrocarSenha !== undefined) {
        token.precisaTrocarSenha = session.precisaTrocarSenha
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string
        session.user.empresaId = token.empresaId as string
        session.user.role = token.role as string
        session.user.funcao = token.funcao as string
        session.user.precisaTrocarSenha = token.precisaTrocarSenha as boolean
      }
      return session
    },
  },
})
