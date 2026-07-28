-- CreateTable
CREATE TABLE "devolucoes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "empresaId" UUID NOT NULL,
    "pedidoId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "motivoDescricao" TEXT,
    "solicitadoPorId" UUID NOT NULL,
    "confirmadoPorId" UUID,
    "canceladoPorId" UUID,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusAlteradoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devolucoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_devolucao" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "devolucaoId" UUID NOT NULL,
    "itemPedidoId" UUID NOT NULL,
    "quantidadeSolicitada" DECIMAL(12,3) NOT NULL,
    "quantidadeConfirmada" DECIMAL(12,3),
    "observacaoAjuste" TEXT,

    CONSTRAINT "itens_devolucao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "devolucoes_status_idx" ON "devolucoes"("status");

-- CreateIndex
CREATE INDEX "devolucoes_pedidoId_idx" ON "devolucoes"("pedidoId");

-- AddForeignKey
ALTER TABLE "devolucoes" ADD CONSTRAINT "devolucoes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucoes" ADD CONSTRAINT "devolucoes_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_devolucao" ADD CONSTRAINT "itens_devolucao_devolucaoId_fkey" FOREIGN KEY ("devolucaoId") REFERENCES "devolucoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_devolucao" ADD CONSTRAINT "itens_devolucao_itemPedidoId_fkey" FOREIGN KEY ("itemPedidoId") REFERENCES "itens_pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
