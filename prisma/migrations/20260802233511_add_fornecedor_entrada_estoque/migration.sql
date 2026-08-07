-- DropForeignKey
ALTER TABLE "conferencia_itens" DROP CONSTRAINT "conferencia_itens_conferenciaId_fkey";

-- DropForeignKey
ALTER TABLE "conferencias" DROP CONSTRAINT "conferencias_pedidoId_fkey";

-- DropForeignKey
ALTER TABLE "configuracoes" DROP CONSTRAINT "configuracoes_empresaId_fkey";

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "categoria" TEXT,
ADD COLUMN     "estoqueMinimo" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "fornecedor" TEXT;

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresaId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "contato" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entradas_estoque" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "empresaId" UUID NOT NULL,
    "fornecedorId" UUID NOT NULL,
    "numeroNF" TEXT NOT NULL,
    "serie" TEXT,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "dataRecebimento" TIMESTAMP(3) NOT NULL,
    "observacao" TEXT,
    "lancadoPorId" UUID NOT NULL,
    "dataHoraLancamento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entradas_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrada_itens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entradaId" UUID NOT NULL,
    "produtoId" UUID NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "custoUnitario" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "entrada_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fornecedores_empresaId_idx" ON "fornecedores"("empresaId");

-- CreateIndex
CREATE INDEX "entradas_estoque_empresaId_dataRecebimento_idx" ON "entradas_estoque"("empresaId", "dataRecebimento");

-- CreateIndex
CREATE UNIQUE INDEX "entradas_estoque_empresaId_fornecedorId_numeroNF_key" ON "entradas_estoque"("empresaId", "fornecedorId", "numeroNF");

-- CreateIndex
CREATE INDEX "entrada_itens_entradaId_idx" ON "entrada_itens"("entradaId");

-- AddForeignKey
ALTER TABLE "fornecedores" ADD CONSTRAINT "fornecedores_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entradas_estoque" ADD CONSTRAINT "entradas_estoque_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entradas_estoque" ADD CONSTRAINT "entradas_estoque_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entradas_estoque" ADD CONSTRAINT "entradas_estoque_lancadoPorId_fkey" FOREIGN KEY ("lancadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada_itens" ADD CONSTRAINT "entrada_itens_entradaId_fkey" FOREIGN KEY ("entradaId") REFERENCES "entradas_estoque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada_itens" ADD CONSTRAINT "entrada_itens_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conferencias" ADD CONSTRAINT "conferencias_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conferencia_itens" ADD CONSTRAINT "conferencia_itens_conferenciaId_fkey" FOREIGN KEY ("conferenciaId") REFERENCES "conferencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
