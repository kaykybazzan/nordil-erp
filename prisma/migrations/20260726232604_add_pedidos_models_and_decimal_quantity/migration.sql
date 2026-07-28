/*
  Warnings:

  - You are about to alter the column `quantidade` on the `estoque_movimentacoes` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.

*/
-- AlterTable
ALTER TABLE "estoque_movimentacoes" ALTER COLUMN "quantidade" SET DATA TYPE DECIMAL(12,3);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "empresaId" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "clienteId" UUID NOT NULL,
    "vendedorId" UUID NOT NULL,
    "separadorId" UUID,
    "enderecoLogradouro" TEXT NOT NULL,
    "enderecoNumero" TEXT NOT NULL,
    "enderecoBairro" TEXT NOT NULL,
    "enderecoCidade" TEXT NOT NULL,
    "enderecoUf" TEXT NOT NULL,
    "enderecoCep" TEXT NOT NULL,
    "enderecoRefId" UUID,
    "observacao" TEXT,
    "transportadora" TEXT,
    "status" TEXT NOT NULL,
    "pendencia" TEXT NOT NULL DEFAULT 'NENHUMA',
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "motivoCancelamento" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusAlteradoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_pedido" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pedidoId" UUID NOT NULL,
    "produtoId" UUID NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "precoUnitario" DECIMAL(12,2) NOT NULL,
    "desconto" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,

    CONSTRAINT "itens_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_eventos" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "pedidoId" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" UUID NOT NULL,

    CONSTRAINT "pedido_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pedidos_empresaId_status_idx" ON "pedidos"("empresaId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_empresaId_numero_key" ON "pedidos"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "itens_pedido_pedidoId_idx" ON "itens_pedido"("pedidoId");

-- CreateIndex
CREATE INDEX "pedido_eventos_pedidoId_dataHora_idx" ON "pedido_eventos"("pedidoId", "dataHora");

-- AddForeignKey
ALTER TABLE "estoque_movimentacoes" ADD CONSTRAINT "estoque_movimentacoes_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_separadorId_fkey" FOREIGN KEY ("separadorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_eventos" ADD CONSTRAINT "pedido_eventos_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_eventos" ADD CONSTRAINT "pedido_eventos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
