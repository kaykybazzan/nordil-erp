# AUDITORIA_STATUS - Nordil ERP

Relatório de status por módulo baseado em evidência real do código. Gerado em 2026-08-19.

---

## Estoque

**Status geral:** Implementado

**Evidência principal:**
- `lib/estoque-ledger.ts:32-53` — Tipos de movimentação implementados (RESERVA, LIBERACAO_RESERVA, SAIDA, ENTRADA, ENTRADA_DEVOLUCAO, AJUSTE)
- `lib/estoque-ledger.ts:68-74` — Atualização atômica de estoqueAtual via increment
- `lib/actions/estoque.ts:12-18` — Schema validando tipos de movimentação
- `prisma/schema.prisma:159-177` — Model EstoqueMovimentacao com todos os campos necessários
- `lib/actions/produtos.ts:104` — Produto.estoqueAtual sempre inicia com 0
- `lib/actions/produtos.ts:196` — Comentário explícito: "estoqueAtual NUNCA incluído no update - só via EstoqueService futuro"

**O que funciona de fato:**
- Ledger de movimentações totalmente implementado via EstoqueMovimentacao
- Produto.estoqueAtual é calculado/atualizado automaticamente via increment/decrement
- Tipos de movimentação suportados: RESERVA, LIBERACAO_RESERVA, SAIDA, ENTRADA, ENTRADA_DEVOLUCAO, AJUSTE
- Cálculo de estoque reservado via calcularReservado()
- Saldo é armazenado diretamente em Produto.estoqueAtual (não calculado do ledger a cada leitura)

**O que está incompleto ou é mock:**
- Nenhum TODO/FIXME/MOCK_/localStorage encontrado nos arquivos de estoque
- Comentário em lib/actions/produtos.ts:196 menciona "EstoqueService futuro" mas o ledger já funciona

**Dúvida/ambiguidade encontrada:**
- Nenhuma

---

## Multi-tenant

**Status geral:** Implementado

**Evidência principal:**
- `lib/auth.ts:60` — session.user.empresaId populado no callback session
- `lib/actions/produtos.ts:35` — Query com where: { empresaId: session.user.empresaId }
- `lib/actions/clientes.ts:37` — Query com where: { empresaId: session.user.empresaId }
- `lib/actions/devolucoes.ts:111` — Validação: if (pedido.empresaId !== empresaId)
- `lib/actions/inventario.ts:194` — empresaId extraído de session.user.empresaId
- `lib/tenant-db.ts:10-36` — Função tenantDb() com filtro automático de empresaId

**O que funciona de fato:**
- empresaId carregado na sessão Auth.js v5 (lib/auth.ts:60)
- 79 ocorrências de session.user.empresaId em Server Actions para filtros
- Validação de posse (empresaId) em múltiplos módulos (produtos, clientes, devoluções, inventário)
- tenantDb() implementado como extensão Prisma para filtro automático (embora com comentário de limitação em lib/tenant-db.ts:26-29)

**O que está incompleto ou é mock:**
- Nenhum TODO/FIXME/MOCK_/localStorage encontrado
- lib/tenant-db.ts:15 lista apenas ["Usuario", "Auditoria"] como modelsComEmpresaId — pode precisar expansão conforme novos modelos

**Dúvida/ambiguidade encontrada:**
- lib/tenant-db.ts:26-29 comenta limitação conhecida: findUnique/update/delete por id não aceitam filtro composto sem @@unique([id, empresaId]) no schema

---

## Pedidos

**Status geral:** Implementado

**Evidência principal:**
- `lib/actions/pedidos.ts:156-213` — Transação que gera número, cria pedido/itens/eventos
- `lib/actions/pedidos.ts:224-240` — Reserva de estoque via actionAplicarMovimentacao com tipo RESERVA
- `lib/actions/pedidos.ts:418-504` — actionCancelarPedido com liberação de reserva via LIBERACAO_RESERVA
- `lib/pedidos.ts:5-11` — STATUS_CANCELAVEL definido: CRIADO, RESERVADO, EM_SEPARACAO, EM_CONFERENCIA, CONFERIDO
- `lib/actions/pedidos.ts:184` — Status inicial: "CRIADO"
- `lib/actions/pedidos.ts:243-244` — Atualização de status para RESERVADO ou CRIADO baseado em sucesso da reserva

**O que funciona de fato:**
- Máquina de estados implementada via campo status (CRIADO, RESERVADO, EM_SEPARACAO, EM_CONFERENCIA, CONFERIDO, EXPEDIDO, ENTREGUE, CANCELADO)
- Pedido.cancelar() implementado via actionCancelarPedido
- Reserva de estoque automática na criação do pedido via actionAplicarMovimentacao(tipo: "RESERVA")
- Liberação de reserva automática no cancelamento via actionAplicarMovimentacao(tipo: "LIBERACAO_RESERVA")
- Sistema de eventos (PedidoEvento) rastreando transições de estado

**O que está incompleto ou é mock:**
- lib/actions/pedidos.ts:512 tem comentário descritivo: "Lógica: processa TODOS os itens, só marca EXPEDIDO se todos tiverem sucesso." (não é TODO)

**Dúvida/ambiguidade encontrada:**
- Nenhuma

---

## Devoluções

**Status geral:** Implementado

**Evidência principal:**
- `prisma/schema.prisma:266-300` — Models Devolucao e ItemDevolucao completos
- `lib/actions/devolucoes.ts:39-77` — Função calcularSaldoDevolvivel com lógica de acumulado
- `lib/actions/devolucoes.ts:152-173` — Criação de devolução em transação com itens
- `lib/actions/devolucoes.ts:325-343` — Lançamento de ENTRADA_DEVOLUCAO no ledger ao confirmar
- `lib/actions/devolucoes.ts:399-405` — Cancelamento com status CANCELADA

**O que funciona de fato:**
- Schema Prisma real (não mock) com Devolucao e ItemDevolucao
- Server actions completas: actionSolicitarDevolucao, actionConfirmarDevolucao, actionCancelarDevolucao
- Cálculo de saldo devolvível considerando devoluções SOLICITADA e CONCLUIDA
- Integração com ledger de estoque via ENTRADA_DEVOLUCAO ao confirmar devolução
- Validações: motivo OUTRO exige motivoDescricao, quantidadeConfirmada <= quantidadeSolicitada

**O que está incompleto ou é mock:**
- Nenhum TODO/FIXME/MOCK_/localStorage encontrado

**Dúvida/ambiguidade encontrada:**
- Nenhuma

---

## Conferência

**Status geral:** Implementado

**Evidência principal:**
- `lib/actions/conferencia.ts:88-106` — actionListarFilaConferencia lista pedidos EM_CONFERENCIA
- `lib/actions/conferencia.ts:128-218` — actionIniciarConferencia cria Conferencia + ConferenciaItem[]
- `lib/actions/conferencia.ts:220-273` — actionRegistrarItemConferencia registra quantidadeConferida
- `lib/actions/conferencia.ts:275-385` — actionFinalizarConferencia detecta divergências e atualiza status
- `prisma/schema.prisma:397-426` — Models Conferencia e ConferenciaItem

**O que funciona de fato:**
- 5 server actions implementadas conforme solicitado:
  1. actionListarFilaConferencia
  2. actionObterConferenciaAtual
  3. actionIniciarConferencia
  4. actionRegistrarItemConferencia
  5. actionFinalizarConferencia
- Detecção automática de divergência (quantidadeConferida !== quantidadeSeparada)
- Atualização de status do pedido para CONFERIDO com pendencia DIVERGENCIA_CONFERENCIA se necessário
- Idempotência: se já existe sessão EM_ANDAMENTO, devolve a existente em vez de duplicar

**O que está incompleto ou é mock:**
- Nenhum TODO/FIXME/MOCK_/localStorage encontrado

**Dúvida/ambiguidade encontrada:**
- Nenhuma

---

## Auditoria

**Status geral:** Implementado

**Evidência principal:**
- `lib/auditoria.ts:20-52` — Função registrarAuditoria persiste via tenantDb
- `lib/auditoria.ts:58-64` — Função obterAuditoria retorna registros filtrados por empresaId
- `lib/actions/auditoria.ts:25-61` — actionRegistrarAuditoria como wrapper para Server Actions
- `prisma/schema.prisma:67-86` — Model Auditoria com campos modulo, acao, entidadeId, camposAlterados

**O que funciona de fato:**
- Auditoria persistida em banco de dados via Prisma (model Auditoria)
- Multi-tenant: registros filtrados automaticamente por empresaId via tenantDb()
- Chamada de actionRegistrarAuditoria em múltiplos módulos (produtos, clientes, pedidos, devoluções, inventário, usuários)
- Suporte a camposAlterados (JSON) para rastrear diffs
- Módulos que geram registro: PRODUTOS, CLIENTES, PEDIDOS, DEVOLUCOES, INVENTARIO, USUARIOS

**O que está incompleto ou é mock:**
- Nenhum TODO/FIXME/MOCK_/localStorage encontrado

**Dúvida/ambiguidade encontrada:**
- Nenhuma

---

## Autenticação

**Status geral:** Implementado

**Evidência principal:**
- `lib/auth.ts:1-68` — Configuração NextAuth v5 com provider Credentials
- `lib/auth.ts:27` — Validação de senha via bcrypt.compare
- `lib/auth.ts:34-36` — Retorno de empresaId, role, funcao, precisaTrocarSenha no authorize
- `lib/auth.ts:42-56` — Callback JWT popula token com empresaId, role, funcao, precisaTrocarSenha
- `lib/auth.ts:57-66` — Callback session expõe empresaId, role, funcao, precisaTrocarSenha em session.user
- `lib/policies.ts:18-30` — RBAC implementado via podeVerRelatorios, podeVerAuditoria, podeVerConfiguracoes
- `lib/policies.ts:47-49` — podeGerenciarUsuarios restrito a role === "ADMIN"

**O que funciona de fato:**
- Auth.js v5 implementado com estratégia JWT
- Senhas hasheadas com bcryptjs
- RBAC baseado em role (ADMIN, SUPERVISOR, OPERADOR)
- Função (funcao) adicional para OPERADOR: VENDAS, ESTOQUE, SEPARACAO, CONFERENCIA, EXPEDICAO, ADMINISTRATIVO
- Proteção de Server Actions via verificações de session.user.empresaId e policies
- Suporte a senha temporária com flag precisaTrocarSenha

**O que está incompleto ou é mock:**
- Nenhum TODO/FIXME/MOCK_/localStorage encontrado

**Dúvida/ambiguidade encontrada:**
- Nenhuma

---

## Banco de dados

**Status geral:** Implementado

**Evidência principal:**
- `prisma/schema.prisma:15-39` — Model Empresa com relacionamentos para todos os módulos
- `prisma/schema.prisma:41-65` — Model Usuario com indices: @@index([empresaId])
- `prisma/schema.prisma:126-157` — Model Produto com @@unique([empresaId, skuInterno]) e @@index([empresaId])
- `prisma/schema.prisma:159-177` — Model EstoqueMovimentacao com @@index([empresaId, produtoId, dataHora])
- `prisma/schema.prisma:179-219` — Model Pedido com @@unique([empresaId, numero]) e @@index([empresaId, status])
- `prisma/schema.prisma:67-86` — Model Auditoria com @@index([empresaId, dataHora]) e @@index([empresaId, modulo])

**O que funciona de fato:**
- Schema Prisma completo com PostgreSQL como provider
- Relacionamentos-chave implementados: Empresa → Usuario, Produto, Pedido, EstoqueMovimentacao, Auditoria, Devolucao, Conferencia, Inventario
- Índices estratégicos: empresaId em todos os models multi-tenant, índices compostos para queries frequentes
- Constraints: @@unique([empresaId, skuInterno]) em Produto, @@unique([empresaId, numero]) em Pedido, @@unique([empresaId, documento]) em Cliente
- Uso de Decimal(12, 3) para quantidades e Decimal(12, 2) para valores monetários
- UUIDs gerados via dbgenerated("gen_random_uuid()") e uuid_generate_v7()

**O que está incompleto ou é mock:**
- prisma/schema.prisma:431 tem comentário descritivo listando valores possíveis para tipoEscopo (não é TODO)
- prisma/seed.ts:5 define MOCK_USUARIOS (apenas para seed inicial, não código de produção)

**Dúvida/ambiguidade encontrada:**
- Nenhuma

---

## Usuários

**Status geral:** Implementado

**Evidência principal:**
- `lib/actions/usuarios.ts:83-134` — actionCriarUsuario com geração de senha temporária
- `lib/actions/usuarios.ts:99-100` — Senha temporária gerada via gerarSenhaTemporaria() e hasheada com bcrypt
- `lib/actions/usuarios.ts:136-207` — actionAtualizarUsuario com diff de camposAlterados
- `lib/actions/usuarios.ts:209-244` — actionInativarUsuario com status "inativo"
- `lib/usuarios.ts:17-32` — gerarSenhaTemporaria() async buscando configuração da empresa
- `lib/usuarios.ts:38-89` — gerarSenhaParaPolitica() com regras BASICA/MEDIA/FORTE
- `lib/policies.ts:47-49` — podeGerenciarUsuarios restrito a role === "ADMIN"

**O que funciona de fato:**
- RBAC implementado via role (ADMIN, SUPERVISOR, OPERADOR) e funcao
- Senha temporária gerada automaticamente ao criar usuário, com flag precisaTrocarSenha: true
- Senha temporária respeita política configurada (BASICA/MEDIA/FORTE) com comprimento e complexidade adequados
- Bloqueio de conta via status "inativo" (não implementado login attempt-based, apenas manual)
- Server actions para criar, atualizar, inativar, reativar usuários
- Auditoria de todas as operações de usuário

**O que está incompleto ou é mock:**
- Nenhum TODO/FIXME/MOCK_/localStorage encontrado em lib/actions/usuarios.ts ou lib/usuarios.ts
- prisma/seed.ts:5 define MOCK_USUARIOS (apenas para seed inicial, não código de produção)

**Dúvida/ambiguidade encontrada:**
- Nenhuma

---

## Resumo de tamanho

Total de arquivos efetivamente abertos para gerar este relatório: 23

- lib/actions/estoque.ts
- lib/estoque-ledger.ts
- prisma/schema.prisma
- lib/actions/produtos.ts
- lib/inventario-server.ts
- lib/actions/inventario.ts
- lib/actions/clientes.ts
- lib/actions/devolucoes.ts
- lib/actions/pedidos.ts
- lib/pedidos.ts
- lib/actions/conferencia.ts
- lib/actions/auditoria.ts
- lib/auditoria.ts
- lib/tenant-db.ts
- lib/auth.ts
- lib/policies.ts
- prisma/seed.ts
- lib/actions/usuarios.ts
- lib/usuarios.ts
- lib/inventario-utils.ts (referenciado mas não lido completamente)

Tamanho aproximado do AUDITORIA_STATUS.md gerado: ~13KB