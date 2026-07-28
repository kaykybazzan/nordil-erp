/*
  Warnings:

  - A unique constraint covering the columns `[empresaId,documento]` on the table `clientes` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "clientes_documento_idx";

-- DropIndex
DROP INDEX "clientes_documento_key";

-- CreateIndex
CREATE UNIQUE INDEX "clientes_empresaId_documento_key" ON "clientes"("empresaId", "documento");
