-- CreateTable
CREATE TABLE "inventarios" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "empresaId" UUID NOT NULL,
    "tipoEscopo" TEXT NOT NULL,
    "descricaoEscopo" TEXT NOT NULL,
    "recorte" TEXT,
    "observacao" TEXT,
    "status" TEXT NOT NULL,
    "abertoPorId" UUID NOT NULL,
    "responsavelContagemId" UUID NOT NULL,
    "abertoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEm" TIMESTAMP(3),
    "finalizadoComPendencias" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_itens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "inventarioId" UUID NOT NULL,
    "produtoId" UUID NOT NULL,
    "saldoEsperado" INTEGER NOT NULL,
    "ultimaMovimentacaoId" UUID,
    "quantidadeContada" INTEGER,
    "status" TEXT NOT NULL,
    "contadoEm" TIMESTAMP(3),
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventario_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventarios_empresaId_status_idx" ON "inventarios"("empresaId", "status");

-- CreateIndex
CREATE INDEX "inventarios_empresaId_abertoEm_idx" ON "inventarios"("empresaId", "abertoEm");

-- CreateIndex
CREATE INDEX "inventario_itens_inventarioId_idx" ON "inventario_itens"("inventarioId");

-- CreateIndex
CREATE INDEX "inventario_itens_produtoId_idx" ON "inventario_itens"("produtoId");

-- AddForeignKey
ALTER TABLE "inventarios" ADD CONSTRAINT "inventarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventarios" ADD CONSTRAINT "inventarios_abertoPorId_fkey" FOREIGN KEY ("abertoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventarios" ADD CONSTRAINT "inventarios_responsavelContagemId_fkey" FOREIGN KEY ("responsavelContagemId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_itens" ADD CONSTRAINT "inventario_itens_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "inventarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_itens" ADD CONSTRAINT "inventario_itens_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
