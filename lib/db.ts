import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"
import ws from "ws"

neonConfig.webSocketConstructor = ws

const connectionString = process.env.DATABASE_URL!

const adapter = new PrismaNeon({ connectionString })

declare global {
  var prismaGlobal: PrismaClient | undefined
}

export const prisma = globalThis.prismaGlobal ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma
}