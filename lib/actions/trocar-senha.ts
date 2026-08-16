"use server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { actionObterConfiguracoes } from "./configuracoes"
import { validarSenha } from "@/lib/senha-utils"

export async function trocarSenha(novaSenha: string) {
  const session = await auth()
  if (!session?.user?.empresaId || !session?.user?.id) {
    return { sucesso: false, erro: "Não autenticado." }
  }

  // Obter configurações da empresa para validar a política de senha
  const configResult = await actionObterConfiguracoes()
  if (!configResult.ok || !configResult.data) {
    return { sucesso: false, erro: "Erro ao obter configurações da empresa." }
  }

  const politicaSenha = configResult.data.seguranca.politicaSenhaMinima

  // Validar senha de acordo com a política configurada
  const validacao = validarSenha(novaSenha, politicaSenha)
  if (!validacao.valido) {
    return { sucesso: false, erro: validacao.erro }
  }

  const novoHash = await bcrypt.hash(novaSenha, 10)

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: { senhaHash: novoHash, precisaTrocarSenha: false },
  })

  return { sucesso: true }
}
