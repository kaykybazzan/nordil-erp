ALTER TABLE "pedidos" ADD COLUMN "conferenteId" UUID;

CREATE TABLE "conferencias" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  "pedidoId" UUID NOT NULL REFERENCES "pedidos"("id") ON DELETE CASCADE,
  "conferenteId" UUID NOT NULL,
  "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "finalizadoEm" TIMESTAMP(3),
  "status" TEXT NOT NULL
);
CREATE INDEX "conferencias_pedidoId_idx" ON "conferencias"("pedidoId");

CREATE TABLE "conferencia_itens" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  "conferenciaId" UUID NOT NULL REFERENCES "conferencias"("id") ON DELETE CASCADE,
  "itemPedidoId" UUID NOT NULL,
  "produtoId" UUID NOT NULL,
  "quantidadeSolicitada" DECIMAL(12,3) NOT NULL,
  "quantidadeSeparada" DECIMAL(12,3) NOT NULL,
  "quantidadeConferida" DECIMAL(12,3),
  "divergente" BOOLEAN
);
CREATE INDEX "conferencia_itens_conferenciaId_idx" ON "conferencia_itens"("conferenciaId");