import "dotenv/config"
import { prisma } from "../lib/db"

async function main() {
  const us = await prisma.usuario.findMany({
    select: { nome: true, email: true, role: true, funcao: true, status: true },
    orderBy: { nome: "asc" },
  })
  console.log(JSON.stringify(us, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
