-- CreateTable
CREATE TABLE "enderecos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clienteId" UUID NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enderecos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresaId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "dataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "enderecos_clienteId_idx" ON "enderecos"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_documento_key" ON "clientes"("documento");

-- CreateIndex
CREATE INDEX "clientes_empresaId_idx" ON "clientes"("empresaId");

-- CreateIndex
CREATE INDEX "clientes_documento_idx" ON "clientes"("documento");

-- AddForeignKey
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
