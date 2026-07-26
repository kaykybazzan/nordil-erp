"use server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"

export async function trocarSenha(novaSenha: string) {
  const session = await auth()
  if (!session?.user) return { sucesso: false, erro: "Não autenticado." }

  const novoHash = await bcrypt.hash(novaSenha, 10)

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: { senhaHash: novoHash, precisaTrocarSenha: false },
  })

  return { sucesso: true }
}
