"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionRegistrarAuditoria } from "@/lib/actions/auditoria"
import { isDocumentoValido } from "@/lib/clientes"
import { z } from "zod"

const EnderecoSchema = z.object({
  id: z.string().optional(),
  logradouro: z.string().min(1, "Logradouro é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  uf: z.string().length(2, "UF deve ter 2 caracteres"),
  cep: z.string().min(1, "CEP é obrigatório"),
  principal: z.boolean(),
})

const ClienteInputSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  documento: z.string().min(1, "Documento é obrigatório"),
  status: z.enum(["ativo", "bloqueado"]),
  enderecos: z.array(EnderecoSchema).min(1, "Pelo menos um endereço é obrigatório"),
})

type ClienteInput = z.infer<typeof ClienteInputSchema>

export async function listarClientes() {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  try {
    const clientes = await prisma.cliente.findMany({
      where: { empresaId: session.user.empresaId },
      include: { enderecos: true },
      orderBy: { createdAt: "desc" },
    })

    const clientesFormatados = clientes.map((c: any) => ({
      id: c.id,
      empresaId: c.empresaId,
      nome: c.nome,
      documento: c.documento,
      status: c.status as "ativo" | "bloqueado",
      dataCadastro: c.dataCadastro.toISOString(),
      enderecos: c.enderecos.map((e: any) => ({
        id: e.id,
        logradouro: e.logradouro,
        numero: e.numero,
        bairro: e.bairro,
        cidade: e.cidade,
        uf: e.uf,
        cep: e.cep,
        principal: e.principal,
      })),
    }))

    return { ok: true, data: clientesFormatados }
  } catch (error) {
    console.error("Erro ao listar clientes:", error)
    return { ok: false, error: "Erro ao carregar clientes" }
  }
}

export async function criarCliente(input: ClienteInput) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  const validated = ClienteInputSchema.safeParse(input)
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0].message }
  }

  const dados = validated.data

  if (!isDocumentoValido(dados.documento)) {
    return { ok: false, error: "Documento em formato inválido" }
  }

  try {
    const cliente = await prisma.cliente.create({
      data: {
        empresaId: session.user.empresaId,
        nome: dados.nome,
        documento: dados.documento,
        status: dados.status,
        enderecos: {
          create: dados.enderecos.map((e: any) => ({
            logradouro: e.logradouro,
            numero: e.numero,
            bairro: e.bairro,
            cidade: e.cidade,
            uf: e.uf,
            cep: e.cep,
            principal: e.principal,
          })),
        },
      },
      include: { enderecos: true },
    })

    await actionRegistrarAuditoria({
      modulo: "CLIENTES",
      acao: "CRIADO",
      entidadeId: cliente.id,
      descricao: `Cliente ${cliente.nome} criado.`,
    })

    const clienteFormatado = {
      id: cliente.id,
      empresaId: cliente.empresaId,
      nome: cliente.nome,
      documento: cliente.documento,
      status: cliente.status as "ativo" | "bloqueado",
      dataCadastro: cliente.dataCadastro.toISOString(),
      enderecos: cliente.enderecos.map((e: any) => ({
        id: e.id,
        logradouro: e.logradouro,
        numero: e.numero,
        bairro: e.bairro,
        cidade: e.cidade,
        uf: e.uf,
        cep: e.cep,
        principal: e.principal,
      })),
    }

    return { ok: true, data: clienteFormatado }
  } catch (error: any) {
    if (error.code === "P2002") {
      return { ok: false, error: "Já existe um cliente com este documento." }
    }
    console.error("Erro ao criar cliente:", error)
    return { ok: false, error: "Erro ao criar cliente" }
  }
}

export async function atualizarCliente(id: string, input: ClienteInput) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  const validated = ClienteInputSchema.safeParse(input)
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0].message }
  }

  const dados = validated.data

  if (!isDocumentoValido(dados.documento)) {
    return { ok: false, error: "Documento em formato inválido" }
  }

  try {
    const clienteAntigo = await prisma.cliente.findUnique({
      where: { id },
      include: { enderecos: true },
    })

    if (!clienteAntigo) {
      return { ok: false, error: "Cliente não encontrado" }
    }

    if (clienteAntigo.empresaId !== session.user.empresaId) {
      return { ok: false, error: "Não autorizado" }
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nome: dados.nome,
        documento: dados.documento,
        status: dados.status,
        enderecos: {
          deleteMany: {},
          create: dados.enderecos.map((e: any) => ({
            logradouro: e.logradouro,
            numero: e.numero,
            bairro: e.bairro,
            cidade: e.cidade,
            uf: e.uf,
            cep: e.cep,
            principal: e.principal,
          })),
        },
      },
      include: { enderecos: true },
    })

    const camposAlterados: { campo: string; valorAnterior: string; valorNovo: string }[] = []

    if (clienteAntigo.nome !== cliente.nome) {
      camposAlterados.push({ campo: "nome", valorAnterior: clienteAntigo.nome, valorNovo: cliente.nome })
    }
    if (clienteAntigo.documento !== cliente.documento) {
      camposAlterados.push({ campo: "documento", valorAnterior: clienteAntigo.documento, valorNovo: cliente.documento })
    }
    if (clienteAntigo.status !== cliente.status) {
      camposAlterados.push({ campo: "status", valorAnterior: clienteAntigo.status, valorNovo: cliente.status })
    }

    await actionRegistrarAuditoria({
      modulo: "CLIENTES",
      acao: "ATUALIZADO",
      entidadeId: cliente.id,
      descricao: `Cliente ${cliente.nome} atualizado.`,
      camposAlterados,
    })

    const clienteFormatado = {
      id: cliente.id,
      empresaId: cliente.empresaId,
      nome: cliente.nome,
      documento: cliente.documento,
      status: cliente.status as "ativo" | "bloqueado",
      dataCadastro: cliente.dataCadastro.toISOString(),
      enderecos: cliente.enderecos.map((e: any) => ({
        id: e.id,
        logradouro: e.logradouro,
        numero: e.numero,
        bairro: e.bairro,
        cidade: e.cidade,
        uf: e.uf,
        cep: e.cep,
        principal: e.principal,
      })),
    }

    return { ok: true, data: clienteFormatado }
  } catch (error: any) {
    if (error.code === "P2002") {
      return { ok: false, error: "Já existe um cliente com este documento." }
    }
    console.error("Erro ao atualizar cliente:", error)
    return { ok: false, error: "Erro ao atualizar cliente" }
  }
}

export async function inativarCliente(id: string) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  try {
    const cliente = await prisma.cliente.findUnique({ where: { id } })
    if (!cliente) {
      return { ok: false, error: "Cliente não encontrado" }
    }

    if (cliente.empresaId !== session.user.empresaId) {
      return { ok: false, error: "Não autorizado" }
    }

    const atualizado = await prisma.cliente.update({
      where: { id },
      data: { status: "bloqueado" },
    })

    await actionRegistrarAuditoria({
      modulo: "CLIENTES",
      acao: "STATUS_ALTERADO",
      entidadeId: cliente.id,
      descricao: `Cliente ${cliente.nome} inativado.`,
    })

    return { ok: true, data: atualizado }
  } catch (error) {
    console.error("Erro ao inativar cliente:", error)
    return { ok: false, error: "Erro ao inativar cliente" }
  }
}

export async function reativarCliente(id: string) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  try {
    const cliente = await prisma.cliente.findUnique({ where: { id } })
    if (!cliente) {
      return { ok: false, error: "Cliente não encontrado" }
    }

    if (cliente.empresaId !== session.user.empresaId) {
      return { ok: false, error: "Não autorizado" }
    }

    const atualizado = await prisma.cliente.update({
      where: { id },
      data: { status: "ativo" },
    })

    await actionRegistrarAuditoria({
      modulo: "CLIENTES",
      acao: "STATUS_ALTERADO",
      entidadeId: cliente.id,
      descricao: `Cliente ${cliente.nome} reativado.`,
    })

    return { ok: true, data: atualizado }
  } catch (error) {
    console.error("Erro ao reativar cliente:", error)
    return { ok: false, error: "Erro ao reativar cliente" }
  }
}
