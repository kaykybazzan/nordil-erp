/**
 * Script para corrigir estoqueAtual desatualizado
 * Recalcula Produto.estoqueAtual somando todas as movimentações do ledger
 * 
 * Uso: npx tsx scripts/recalcular-estoque-atual.ts
 */

import "dotenv/config"
import { prisma } from "../lib/db"

async function recalcularEstoqueAtual() {
  console.log("Iniciando recálculo de estoqueAtual...")

  // Buscar todos os produtos
  const produtos = await prisma.produto.findMany({
    select: { id: true, nome: true, estoqueAtual: true },
  })

  console.log(`Encontrados ${produtos.length} produtos`)

  let atualizados = 0
  let semMudanca = 0

  for (const produto of produtos) {
    // Buscar todas as movimentações do produto
    const movimentacoes = await prisma.estoqueMovimentacao.findMany({
      where: { produtoId: produto.id },
    })

    // Calcular delta total
    let deltaTotal = 0
    for (const mov of movimentacoes) {
      const qtd = Number(mov.quantidade)
      switch (mov.tipo) {
        case "ENTRADA":
        case "ENTRADA_DEVOLUCAO":
          deltaTotal += qtd
          break
        case "SAIDA":
          deltaTotal -= qtd
          break
        case "AJUSTE":
          if (mov.direcao === "ENTRADA") {
            deltaTotal += qtd
          } else if (mov.direcao === "SAIDA") {
            deltaTotal -= qtd
          }
          break
        case "RESERVA":
        case "LIBERACAO_RESERVA":
          // Não afeta estoque físico
          break
      }
    }

    // Atualizar se houver diferença
    const estoqueAtual = Number(produto.estoqueAtual)
    if (deltaTotal !== estoqueAtual) {
      await prisma.produto.update({
        where: { id: produto.id },
        data: { estoqueAtual: deltaTotal },
      })
      console.log(`Atualizado: ${produto.nome} (${produto.id}) - de ${estoqueAtual} para ${deltaTotal}`)
      atualizados++
    } else {
      semMudanca++
    }
  }

  console.log(`\nConcluído:`)
  console.log(`- ${atualizados} produtos atualizados`)
  console.log(`- ${semMudanca} produtos sem mudança`)
}

recalcularEstoqueAtual()
  .then(() => {
    console.log("Script concluído com sucesso")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Erro ao executar script:", error)
    process.exit(1)
  })
