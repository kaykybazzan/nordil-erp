-- CreateTable
CREATE TABLE "sequencias_numeracao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresaId" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "valorAtual" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sequencias_numeracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sequencias_numeracao_empresaId_tipo_key" ON "sequencias_numeracao"("empresaId", "tipo");

-- AddForeignKey
ALTER TABLE "sequencias_numeracao" ADD CONSTRAINT "sequencias_numeracao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cria as 4 linhas de sequência para empresas que já existem
INSERT INTO "sequencias_numeracao" ("id", "empresaId", "tipo", "valorAtual")
SELECT gen_random_uuid(), e."id", t.tipo, 0
FROM "empresas" e
CROSS JOIN (VALUES ('PEDIDO'), ('NF'), ('OS'), ('INVENTARIO')) AS t(tipo)
ON CONFLICT ("empresaId", "tipo") DO NOTHING;
