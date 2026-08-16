/*
  Warnings:

  - You are about to alter the column `estoqueAtual` on the `produtos` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.

*/
-- AlterTable
ALTER TABLE "produtos" ALTER COLUMN "estoqueAtual" SET DEFAULT 0,
ALTER COLUMN "estoqueAtual" SET DATA TYPE DECIMAL(12,3);
