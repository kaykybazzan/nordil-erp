import { prisma } from "../lib/db.ts"
import bcrypt from "bcryptjs"

const hash = await bcrypt.hash("teste1234", 10)
await prisma.usuario.update({
  where: { email: "helena@nordil.com" },
  data: { senhaHash: hash, precisaTrocarSenha: false },
})
console.log("[v0] senha atualizada")
process.exit(0)
