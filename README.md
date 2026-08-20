# Nordil ERP

ERP web para gestão de operações de distribuidoras de materiais elétricos.

O Nordil é um projeto autoral que desenvolvi para estudar, na prática, como sistemas empresariais lidam com estoque, pedidos e operações de warehouse.

O projeto começou com mocks e armazenamento local. Conforme foi evoluindo, passei a trabalhar com PostgreSQL, Prisma, autenticação real, controle de permissões e regras de negócio mais próximas de um sistema ERP.

---

## Sobre o projeto

A ideia do Nordil não era criar apenas telas de cadastro. O foco foi representar um fluxo operacional completo de uma distribuidora.

```text
Cliente
   |
   v
Pedido
   |
   v
Reserva de estoque
   |
   v
Separação
   |
   v
Conferência
   |
   v
Expedição
   |
   v
Entrega
```

Cada etapa possui suas próprias regras.

Na criação de um pedido, por exemplo, o sistema tenta reservar o estoque. Depois disso, o pedido passa pela separação e pela conferência antes de chegar à expedição.

A separação possui lock por operador. Na conferência, o conferente não recebe a quantidade que deveria encontrar. Ele registra o que realmente encontrou e o sistema compara os valores para identificar divergências.

O projeto também possui entrada de estoque, inventário, devoluções, auditoria, usuários, permissões e configurações.

## Telas

As imagens abaixo devem mostrar o sistema funcionando. Os arquivos podem ficar em uma pasta `screenshots/` dentro do repositório.

### Dashboard

![Dashboard](/screenshots/dashboard.png)

### Separação de pedidos

![Separação](/screenshots/separacao.png)

### Conferência

![Conferência](/screenshots/conferencia.png)

### Inventário

![Inventário](/screenshots/inventario.png)

### Auditoria

![Auditoria](/screenshots/auditoria.png)

### Entrada de estoque

![Entrada de estoque](/screenshots/entrada.png)

---

## Principais módulos

| Módulo             | O que faz                                                |
| ------------------ | -------------------------------------------------------- |
| Autenticação       | Login, sessão, senhas e controle de acesso               |
| Usuários           | Cadastro, edição, ativação e gerenciamento de permissões |
| Dashboard          | Indicadores e gráficos das operações                     |
| Clientes           | Cadastro de clientes e endereços                         |
| Produtos           | Cadastro, estoque mínimo e controle de fracionamento     |
| Fornecedores       | Cadastro usado nas entradas de estoque                   |
| Pedidos            | Criação e acompanhamento do pedido até a entrega         |
| Estoque            | Movimentações, reservas e saldo disponível               |
| Entrada de estoque | Entrada de produtos por nota fiscal                      |
| Separação          | Fila de pedidos, locks e controle de ruptura             |
| Conferência        | Conferência dos itens e identificação de divergências    |
| Expedição          | Saída de estoque e informações de transporte             |
| Inventário         | Contagem, divergências e ajustes                         |
| Devoluções         | Solicitação, confirmação e entrada no estoque            |
| Auditoria          | Histórico de ações realizadas no sistema                 |
| Configurações      | Dados da empresa e regras operacionais                   |

Os módulos acima usam PostgreSQL como fonte de dados. Não há módulos utilizando `localStorage` ou mocks como fonte de funcionamento.

---

## Tecnologias

* Next.js 16.2.6
* React 19
* TypeScript 5.7.3
* PostgreSQL
* Neon
* Prisma 7.9.0
* Auth.js / NextAuth.js v5
* bcryptjs
* Zustand 5.0.14
* Zod 4.4.3
* Tailwind CSS 4.2.0
* Recharts 3.10.1
* @base-ui/react
* lucide-react

Essas são as tecnologias realmente utilizadas no projeto, de acordo com a auditoria do código.

---

## Como o projeto funciona

A estrutura principal da aplicação segue este fluxo:

```text
Interface React
      |
      v
Server Actions
      |
      v
Prisma Client
      |
      v
PostgreSQL
      |
      v
Neon
```

As Server Actions ficam em `lib/actions/` e concentram boa parte das operações do sistema.

O Prisma é responsável pelo acesso ao banco e o PostgreSQL mantém os dados persistidos.

O Zustand é utilizado no lado do cliente para estados e cache. Ele não é a fonte de verdade do sistema. A fonte de verdade é o banco de dados.

---

## Algumas decisões técnicas

### Estoque

O estoque não pode ser alterado diretamente pelo formulário de produto.

As movimentações passam pelo `EstoqueMovimentacao`, que funciona como um ledger. Entre os tipos existentes estão:

```text
RESERVA
LIBERACAO_RESERVA
ENTRADA
ENTRADA_DEVOLUCAO
SAIDA
AJUSTE
```

As movimentações que alteram o estoque físico atualizam também `Produto.estoqueAtual` dentro da mesma transação.

Isso evita que a movimentação seja registrada sem que o saldo seja atualizado.

O estoque disponível é calculado considerando as reservas:

```text
estoque disponível = estoque atual - estoque reservado
```

A implementação dessa lógica está concentrada em `lib/estoque-ledger.ts`.

### Pedidos

O pedido possui uma máquina de estados:

```text
CRIADO
   |
RESERVADO
   |
EM_SEPARACAO
   |
EM_CONFERENCIA
   |
CONFERIDO
   |
EXPEDIDO
   |
ENTREGUE
```

Também existe o estado `CANCELADO`.

Cada mudança importante pode gerar um `PedidoEvento`, criando uma linha do tempo própria para o pedido.

### Multi-tenant

O banco possui `empresaId` para separar os dados das empresas.

O `empresaId` vem da sessão do usuário e é utilizado nas consultas do servidor. O projeto também possui o `tenantDb`, uma extensão do Prisma criada para reduzir a repetição desses filtros.

A implementação é funcional, mas ainda existe uma limitação: atualmente um usuário pertence a apenas uma empresa e não existe uma tela para criar ou trocar de empresa.

### Autenticação e permissões

A autenticação utiliza Auth.js / NextAuth com credentials provider e bcrypt.

Existem três roles principais:

```text
ADMIN
SUPERVISOR
OPERADOR
```

Os operadores também podem possuir funções específicas, como:

```text
VENDAS
ESTOQUE
SEPARACAO
CONFERENCIA
EXPEDICAO
ADMINISTRATIVO
```

As permissões são verificadas nas páginas e também nas Server Actions.

### Auditoria

O sistema possui um modelo próprio de auditoria.

Entre as ações registradas estão:

```text
CRIADO
ATUALIZADO
CANCELADO
EXCLUIDO
LOGIN
LOGOUT
STATUS_ALTERADO
EXPORTADO
SUGESTAO_CONTAGEM
```

A auditoria fica no PostgreSQL e possui informações sobre o módulo, ação, entidade e campos alterados. Ela é diferente de `PedidoEvento`, que existe especificamente para acompanhar o fluxo de um pedido.

---

## Instalação local

### Pré-requisitos

* Node.js 20 ou superior
* pnpm
* PostgreSQL local ou uma instância no Neon

### 1. Instale as dependências

```bash
pnpm install
```

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/nordil_erp?sslmode=require"
DIRECT_URL="postgresql://user:password@localhost:5432/nordil_erp?sslmode=require"

# NextAuth
AUTH_SECRET="gerar-uma-chave-secreta-aleatoria-pelo-menos-32-caracteres"
```

**Importante:** Ambas as variáveis `DATABASE_URL` e `DIRECT_URL` são obrigatórias. O `AUTH_SECRET` pode ser gerado com:

```bash
openssl rand -base64 32
```

### 3. Configure o banco

Você pode usar PostgreSQL local ou Neon.

Para PostgreSQL local:

```bash
createdb nordil_erp
```

Depois configure a conexão no `.env`.

### 4. Execute as migrations

```bash
npx prisma migrate dev
```

### 5. Execute o seed

```bash
npx prisma db seed
```

O seed cria a empresa de teste e seis usuários para utilizar o sistema.

As senhas temporárias são exibidas no console durante a execução.

### 6. Adicione produtos

O seed principal não cria produtos automaticamente. Você precisa adicionar produtos manualmente pela interface do sistema:

1. Acesse a tela de **Produtos** no menu lateral
2. Clique em "Novo Produto" para cadastrar os produtos
3. Depois adicione estoque através de **Estoque > Entrada**

### 7. (Opcional) Execute o seed de pedidos

Se quiser dados de teste para pedidos, após adicionar produtos:

```bash
npx tsx prisma/seed-pedidos.ts
```

Isso cria clientes e pedidos de teste usando os produtos cadastrados.

### 8. Inicie o projeto

```bash
pnpm dev
```

Depois acesse:

```text
http://localhost:3000
```

---

## O que está funcionando

O projeto possui atualmente:

* autenticação real
* usuários e permissões
* dashboard
* clientes
* produtos
* fornecedores
* pedidos
* reserva de estoque
* separação
* conferência
* expedição
* entrada de estoque
* inventário
* devoluções
* auditoria
* configurações
* isolamento por empresa
* persistência em PostgreSQL

A auditoria técnica do projeto não encontrou módulos utilizando mocks ou `localStorage` como fonte de dados.

---

## Limitações atuais

O Nordil é um projeto de estudo e portfólio. Ele não deve ser tratado como um ERP pronto para produção.

As principais limitações atuais são:

* não existem testes automatizados unitários, de integração ou E2E
* não existe CI/CD configurado
* empresas são criadas pelo seed
* não existe interface para criar ou trocar de empresa
* cada usuário está associado atualmente a uma única empresa

Essas limitações fazem parte do estado atual do projeto e não foram escondidas para apresentar uma versão maior do que realmente existe.

---

## O que eu aprendi com o projeto

O Nordil acabou sendo mais sobre regras de negócio do que sobre criar telas.

A parte que mais exigiu atenção foi o estoque. Não bastava alterar `estoqueAtual`. Era necessário pensar em reserva, entrada, saída, devolução, inventário e cancelamento sem deixar o saldo inconsistente.

Também tive que lidar com problemas que não aparecem em um CRUD simples, como dois operadores tentando trabalhar com o mesmo pedido, movimentações acontecendo durante um inventário e a necessidade de manter os dados de cada empresa separados.

O projeto também me fez perceber a importância de definir as regras antes de sair implementando as telas. Algumas partes precisaram ser reorganizadas conforme o sistema ficou mais complexo.

Se eu fosse começar novamente, uma das primeiras coisas que adicionaria seriam testes automatizados. Hoje essa é uma das principais lacunas do projeto.

---

## Próximos passos

Algumas coisas podem ser desenvolvidas futuramente:

* testes unitários
* testes de integração
* testes E2E
* CI/CD
* cadastro e gerenciamento de empresas pela aplicação
* troca de empresa para usuários que possuam acesso a mais de uma
* expansão das regras operacionais

Esses pontos não fazem parte da versão atual do projeto.

---

## Status

O Nordil está funcional para demonstração e estudo.

A aplicação é um projeto de portfólio. O objetivo principal é demonstrar como trabalhei com regras de negócio, banco de dados, autenticação, autorização e operações de estoque.

---

## Autor

Kayky Bazzan

LinkedIn: [www.linkedin.com/in/kaykybazzan](http://www.linkedin.com/in/kaykybazzan)

---

## Licença

Projeto desenvolvido por Kayky Bazzan para fins de estudo e portfólio.
