-- CreateTable
CREATE TABLE "estoque_movimentacoes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "empresaId" UUID NOT NULL,
    "produtoId" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "pedidoId" UUID,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" UUID NOT NULL,
    "direcao" TEXT,

    CONSTRAINT "estoque_movimentacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estoque_movimentacoes_empresaId_produtoId_dataHora_idx" ON "estoque_movimentacoes"("empresaId", "produtoId", "dataHora");

-- CreateIndex
CREATE INDEX "estoque_movimentacoes_pedidoId_idx" ON "estoque_movimentacoes"("pedidoId");

-- AddForeignKey
ALTER TABLE "estoque_movimentacoes" ADD CONSTRAINT "estoque_movimentacoes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_movimentacoes" ADD CONSTRAINT "estoque_movimentacoes_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
