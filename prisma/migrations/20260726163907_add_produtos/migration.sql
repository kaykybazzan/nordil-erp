-- CreateTable
CREATE TABLE "produtos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresaId" UUID NOT NULL,
    "skuInterno" TEXT NOT NULL,
    "referenciaComercial" TEXT,
    "codigoBarras" TEXT,
    "nome" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "unidadeMedida" TEXT NOT NULL,
    "permiteFracionado" BOOLEAN NOT NULL DEFAULT false,
    "custo" DECIMAL(12,2) NOT NULL,
    "precoVenda" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "estoqueAtual" INTEGER NOT NULL DEFAULT 0,
    "corredor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "produtos_empresaId_idx" ON "produtos"("empresaId");

-- CreateIndex
CREATE INDEX "produtos_empresaId_corredor_idx" ON "produtos"("empresaId", "corredor");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_empresaId_skuInterno_key" ON "produtos"("empresaId", "skuInterno");

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
