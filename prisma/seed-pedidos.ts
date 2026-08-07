import "dotenv/config"
import { prisma } from "../lib/db"

// ─── Config ──────────────────────────────────────────────────────────────
// Ajuste esses números se quiser mais/menos volume de dado de teste.
const DIAS_HISTORICO = 10   // pedidos distribuídos nos últimos N dias
const QTD_CLIENTES = 18
const QTD_PEDIDOS = 55

// ─── Dados de apoio (nomes fictícios coerentes com o setor B2B elétrico) ──
const NOMES_CLIENTES = [
  "Eletro Norte Ltda", "InstalaMais Materiais Elétricos", "Construtora ABC",
  "Elétrica Central", "Solaris Engenharia", "Rede Fácil Instalações",
  "MegaVolt Distribuidora", "Grupo Fortaleza Construções", "Vértice Engenharia Elétrica",
  "TopLuz Comércio", "Conecta Instalações Ltda", "Prisma Engenharia",
  "Base Sólida Construtora", "Elevar Empreendimentos", "Fluxo Elétrico Materiais",
  "Nortel Instalações", "Amperê Distribuidora", "Circuito Vivo Engenharia",
]

const CIDADES = [
  { cidade: "Blumenau", uf: "SC" },
  { cidade: "Joinville", uf: "SC" },
  { cidade: "Itajaí", uf: "SC" },
  { cidade: "Florianópolis", uf: "SC" },
  { cidade: "Gaspar", uf: "SC" },
  { cidade: "Brusque", uf: "SC" },
]

const LOGRADOUROS = [
  "Rua XV de Novembro", "Av. Beira Rio", "Rua das Palmeiras",
  "Rua Sete de Setembro", "Av. Brasil", "Rua Dois de Setembro",
]

const MOTIVOS_CANCELAMENTO = [
  "Cliente desistiu da compra",
  "Prazo de entrega incompatível",
  "Erro no cadastro do pedido",
  "Produto substituído por outro fornecedor",
]

// ─── Helpers ────────────────────────────────────────────────────────────
function aleatorio<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function aleatorioInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function gerarCnpjFake(): string {
  return `${aleatorioInt(10, 99)}.${aleatorioInt(100, 999)}.${aleatorioInt(100, 999)}/0001-${aleatorioInt(10, 99)}`
}
function gerarCepFake(): string {
  return `${aleatorioInt(89000, 89299)}-${aleatorioInt(100, 999)}`
}
// soma/subtrai horas de uma data, sem passar do "agora"
function comHoras(base: Date, horas: number): Date {
  const d = new Date(base.getTime() + horas * 60 * 60 * 1000)
  const agora = new Date()
  return d > agora ? agora : d
}

// ─── Status possíveis e peso de distribuição (aprox. proporção real de operação) ──
const STATUS_PIPELINE: string[] = [
  "CRIADO", "RESERVADO", "EM_SEPARACAO", "EM_CONFERENCIA",
  "CONFERIDO", "EXPEDIDO", "ENTREGUE", "CANCELADO",
]
const STATUS_PESOS: Record<string, number> = {
  CRIADO: 8,
  RESERVADO: 6,
  EM_SEPARACAO: 10,
  EM_CONFERENCIA: 8,
  CONFERIDO: 6,
  EXPEDIDO: 9,
  ENTREGUE: 6,
  CANCELADO: 2,
}
function gerarListaStatus(): string[] {
  const lista: string[] = []
  for (const status of STATUS_PIPELINE) {
    for (let i = 0; i < STATUS_PESOS[status]; i++) lista.push(status)
  }
  // completa/corta pra bater exatamente com QTD_PEDIDOS
  while (lista.length < QTD_PEDIDOS) lista.push(aleatorio(STATUS_PIPELINE))
  return lista.slice(0, QTD_PEDIDOS).sort(() => Math.random() - 0.5)
}

// índice de cada status no pipeline — usado pra saber "até onde" o pedido avançou
function indicePipeline(status: string): number {
  if (status === "CANCELADO") return -1
  return STATUS_PIPELINE.indexOf(status)
}

async function main() {
  // ── 1. Empresa existente ────────────────────────────────────────────
  const empresa = await prisma.empresa.findFirst()
  if (!empresa) {
    throw new Error("Nenhuma Empresa encontrada. Rode o seed original (usuários) primeiro.")
  }

  // ── 2. Usuários existentes, categorizados por função ────────────────
  const usuarios = await prisma.usuario.findMany({ where: { empresaId: empresa.id } })
  if (usuarios.length === 0) {
    throw new Error("Nenhum Usuario encontrado. Rode o seed original (usuários) primeiro.")
  }
  const porFuncao = (funcao: string) => usuarios.filter((u) => u.funcao === funcao)
  const vendedores = porFuncao("VENDAS").length ? porFuncao("VENDAS") : usuarios
  const estoquistas = porFuncao("ESTOQUE").length ? porFuncao("ESTOQUE") : usuarios
  const separadores = porFuncao("ESTOQUE").length ? porFuncao("ESTOQUE") : usuarios
  const conferentes = porFuncao("CONFERENCIA").length ? porFuncao("CONFERENCIA") : usuarios
  const expedicionistas = porFuncao("EXPEDICAO").length ? porFuncao("EXPEDICAO") : usuarios
  const supervisores = porFuncao("ADMINISTRATIVO").length ? porFuncao("ADMINISTRATIVO") : usuarios

  // ── 3. Produtos existentes ──────────────────────────────────────────
  const produtos = await prisma.produto.findMany({ where: { empresaId: empresa.id } })
  if (produtos.length === 0) {
    throw new Error("Nenhum Produto encontrado. Cadastre produtos antes de rodar este seed.")
  }

  // ── 4. Clientes + Endereços (novos) ─────────────────────────────────
  console.log(`Criando ${QTD_CLIENTES} clientes...`)
  const clientesCriados = []
  for (let i = 0; i < QTD_CLIENTES; i++) {
    const nome = NOMES_CLIENTES[i] ?? `Cliente Teste ${i + 1}`
    const localidade = aleatorio(CIDADES)
    const cliente = await prisma.cliente.create({
      data: {
        empresaId: empresa.id,
        nome,
        documento: gerarCnpjFake(),
        status: Math.random() < 0.9 ? "ativo" : "bloqueado",
        dataCadastro: comHoras(new Date(), -aleatorioInt(30, 365) * 24),
      },
    })
    const endereco = await prisma.endereco.create({
      data: {
        clienteId: cliente.id,
        logradouro: aleatorio(LOGRADOUROS),
        numero: String(aleatorioInt(10, 2500)),
        bairro: "Centro",
        cidade: localidade.cidade,
        uf: localidade.uf,
        cep: gerarCepFake(),
        principal: true,
      },
    })
    clientesCriados.push({ ...cliente, endereco })
  }

  // ── 5. Pedidos + Itens + Eventos (novos) ────────────────────────────
  const ultimoPedido = await prisma.pedido.findFirst({
    where: { empresaId: empresa.id },
    orderBy: { numero: "desc" },
  })
  let proximoNumero = Math.max(ultimoPedido?.numero ?? 0, 1000) + 1

  const listaStatus = gerarListaStatus()
  console.log(`Criando ${QTD_PEDIDOS} pedidos...`)

  for (let i = 0; i < QTD_PEDIDOS; i++) {
    const statusFinal = listaStatus[i]
    const cliente = aleatorio(clientesCriados)
    const vendedor = aleatorio(vendedores)
    const separador = aleatorio(separadores)

    // criadoEm: espalhado nos últimos DIAS_HISTORICO dias, horário comercial (8h–18h)
    // Uma fatia dos pedidos ENTREGUE/CANCELADO é forçada em "hoje" e "ontem"
    // pra alimentar o cálculo de delta "vs ontem" nos KPIs.
    let criadoEm: Date
    if (statusFinal === "ENTREGUE" || statusFinal === "CANCELADO") {
      const offsetDias = i % 3 === 0 ? 0 : i % 3 === 1 ? -1 : -aleatorioInt(2, DIAS_HISTORICO)
      criadoEm = new Date()
      criadoEm.setDate(criadoEm.getDate() + offsetDias)
      criadoEm.setHours(aleatorioInt(8, 17), aleatorioInt(0, 59), 0, 0)
    } else {
      criadoEm = new Date()
      criadoEm.setDate(criadoEm.getDate() - aleatorioInt(0, DIAS_HISTORICO))
      criadoEm.setHours(aleatorioInt(8, 17), aleatorioInt(0, 59), 0, 0)
    }
    if (criadoEm > new Date()) criadoEm = new Date()

    // Alguns pedidos RESERVADO/EM_SEPARACAO ficam "presos" de propósito,
    // pra alimentar o KPI "Atrasados" (>24h reservado / >48h em separação).
    const forcarAtraso =
      (statusFinal === "RESERVADO" && i % 7 === 0) ||
      (statusFinal === "EM_SEPARACAO" && i % 9 === 0)

    // ── itens do pedido ──
    const qtdItens = aleatorioInt(1, Math.min(4, produtos.length))
    const produtosDoPedido = [...produtos].sort(() => Math.random() - 0.5).slice(0, qtdItens)
    const idxPipeline = indicePipeline(statusFinal)

    const itensData = produtosDoPedido.map((produto) => {
      const quantidade = aleatorioInt(2, 25)
      const precoUnitario = Number(produto.precoVenda)
      const desconto = Math.random() < 0.25 ? aleatorioInt(5, 10) : 0

      let itemStatus: string
      let quantidadeSeparada: number | null = null
      if (statusFinal === "CANCELADO") {
        itemStatus = "CANCELADO"
      } else if (idxPipeline <= 0) {
        itemStatus = "PENDENTE_ESTOQUE"
      } else if (idxPipeline === 1) {
        itemStatus = "PENDENTE"
      } else {
        itemStatus = "SEPARADO"
        quantidadeSeparada = quantidade
      }

      return {
        produtoId: produto.id,
        quantidade,
        precoUnitario,
        desconto,
        status: itemStatus,
        quantidadeSeparada,
      }
    })
    const valorTotal = itensData.reduce(
      (soma, item) => soma + item.quantidade * item.precoUnitario * (1 - item.desconto / 100),
      0,
    )

    // ── progressão de datas por evento, coerente com o status final ──
    const eventos: {
      tipo: string
      descricao: string
      dataHora: Date
      usuarioId: string
    }[] = []

    let cursor = criadoEm
    eventos.push({
      tipo: "PEDIDO_CRIADO",
      descricao: `Pedido #${proximoNumero} criado por ${vendedor.nome}`,
      dataHora: cursor,
      usuarioId: vendedor.id,
    })

    if (statusFinal === "CANCELADO") {
      // cancela em algum ponto aleatório do fluxo, sem precisar passar por tudo
      cursor = comHoras(cursor, aleatorioInt(1, 20))
      eventos.push({
        tipo: "PEDIDO_CANCELADO",
        descricao: `Pedido #${proximoNumero} cancelado por ${aleatorio(supervisores).nome}`,
        dataHora: cursor,
        usuarioId: aleatorio(supervisores).id,
      })
    } else {
      if (idxPipeline >= 1) {
        cursor = comHoras(cursor, forcarAtraso ? aleatorioInt(30, 50) : aleatorioInt(1, 6))
        eventos.push({
          tipo: "ESTOQUE_RESERVADO",
          descricao: `Estoque reservado para o pedido #${proximoNumero}`,
          dataHora: cursor,
          usuarioId: aleatorio(estoquistas).id,
        })
      }
      if (idxPipeline >= 2) {
        cursor = comHoras(cursor, forcarAtraso ? aleatorioInt(50, 70) : aleatorioInt(1, 8))
        eventos.push({
          tipo: "SEPARACAO_INICIADA",
          descricao: `Separação iniciada por ${separador.nome}`,
          dataHora: cursor,
          usuarioId: separador.id,
        })
        cursor = comHoras(cursor, aleatorioInt(1, 4))
        eventos.push({
          tipo: "SEPARACAO_CONCLUIDA",
          descricao: `Separação concluída por ${separador.nome}`,
          dataHora: cursor,
          usuarioId: separador.id,
        })
      }
      if (idxPipeline >= 3) {
        const conferente = aleatorio(conferentes)
        cursor = comHoras(cursor, aleatorioInt(1, 5))
        eventos.push({
          tipo: "CONFERENCIA_INICIADA",
          descricao: `Conferência iniciada por ${conferente.nome}`,
          dataHora: cursor,
          usuarioId: conferente.id,
        })
        if (idxPipeline >= 4) {
          cursor = comHoras(cursor, aleatorioInt(1, 3))
          eventos.push({
            tipo: "CONFERENCIA_CONCLUIDA",
            descricao: `Conferência concluída sem divergências por ${conferente.nome}`,
            dataHora: cursor,
            usuarioId: conferente.id,
          })
        }
      }
      if (idxPipeline >= 5) {
        const expedicionista = aleatorio(expedicionistas)
        cursor = comHoras(cursor, aleatorioInt(1, 6))
        eventos.push({
          tipo: "PEDIDO_EXPEDIDO",
          descricao: `Pedido #${proximoNumero} expedido por ${expedicionista.nome}`,
          dataHora: cursor,
          usuarioId: expedicionista.id,
        })
      }
      if (idxPipeline >= 6) {
        cursor = comHoras(cursor, aleatorioInt(4, 24))
        eventos.push({
          tipo: "PEDIDO_ENTREGUE",
          descricao: `Pedido #${proximoNumero} entregue ao cliente`,
          dataHora: cursor,
          usuarioId: aleatorio(expedicionistas).id,
        })
      }
    }

    const statusAlteradoEm = eventos[eventos.length - 1].dataHora

    await prisma.pedido.create({
      data: {
        empresaId: empresa.id,
        numero: proximoNumero,
        clienteId: cliente.id,
        vendedorId: vendedor.id,
        separadorId: idxPipeline >= 2 && statusFinal !== "CANCELADO" ? separador.id : null,
        enderecoLogradouro: cliente.endereco.logradouro,
        enderecoNumero: cliente.endereco.numero,
        enderecoBairro: cliente.endereco.bairro,
        enderecoCidade: cliente.endereco.cidade,
        enderecoUf: cliente.endereco.uf,
        enderecoCep: cliente.endereco.cep,
        enderecoRefId: cliente.endereco.id,
        transportadora: Math.random() < 0.6 ? aleatorio(["Transnorte", "Rápido SC", "Correios", "Frota própria"]) : null,
        status: statusFinal,
        pendencia: forcarAtraso && Math.random() < 0.3 ? "RUPTURA_ESTOQUE" : "NENHUMA",
        valorTotal,
        motivoCancelamento: statusFinal === "CANCELADO" ? aleatorio(MOTIVOS_CANCELAMENTO) : null,
        criadoEm,
        statusAlteradoEm,
        itens: { create: itensData },
        eventos: { create: eventos },
      },
    })

    proximoNumero++
  }

  console.log(`Concluído: ${QTD_CLIENTES} clientes e ${QTD_PEDIDOS} pedidos criados para a empresa "${empresa.razaoSocial}".`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => await prisma.$disconnect())