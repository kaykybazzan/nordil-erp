"use server"

import { z } from "zod"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { podeGerenciarUsuarios } from "@/lib/policies"
import { actionRegistrarAuditoria } from "@/lib/actions/auditoria"
import { gerarSenhaTemporaria } from "@/lib/usuarios"
import type { PapelUsuario, FuncaoUsuario } from "@/types/domain"

type ResultadoAction<T> = { ok: true; data: T } | { ok: false; error: string }

const ROLES = ["ADMIN", "SUPERVISOR", "OPERADOR"] as const
const FUNCOES = ["VENDAS", "ESTOQUE", "SEPARACAO", "CONFERENCIA", "EXPEDICAO", "ADMINISTRATIVO"] as const

const criarUsuarioSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório."),
  email: z.string().email("E-mail inválido."),
  role: z.enum(ROLES),
  funcao: z.enum(FUNCOES),
  cargo: z.string().optional(),
})

const atualizarUsuarioSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(1, "Nome é obrigatório."),
  email: z.string().email("E-mail inválido."),
  role: z.enum(ROLES),
  funcao: z.enum(FUNCOES),
  cargo: z.string().optional(),
})

// Nunca retorna senhaHash — formata explicitamente campo a campo
function formatarUsuario(usuario: {
  id: string
  empresaId: string
  nome: string
  email: string
  precisaTrocarSenha: boolean
  role: string
  funcao: string
  cargo: string | null
  status: string
}) {
  return {
    id: usuario.id,
    empresaId: usuario.empresaId,
    nome: usuario.nome,
    email: usuario.email,
    precisaTrocarSenha: usuario.precisaTrocarSenha,
    role: usuario.role as PapelUsuario,
    funcao: usuario.funcao as FuncaoUsuario,
    cargo: usuario.cargo ?? undefined,
    status: usuario.status as "ativo" | "inativo",
  }
}

export async function actionObterUsuarios(): Promise<ResultadoAction<ReturnType<typeof formatarUsuario>[]>> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: "Não autenticado." }

  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: session.user.empresaId },
    orderBy: { nome: "asc" },
  })

  return { ok: true, data: usuarios.map(formatarUsuario) }
}

export async function actionCriarUsuario(
  input: z.infer<typeof criarUsuarioSchema>
): Promise<ResultadoAction<{ usuario: ReturnType<typeof formatarUsuario>; senhaTemporaria: string }>> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: "Não autenticado." }

  if (!podeGerenciarUsuarios(session.user)) {
    return { ok: false, error: "Sem permissão para gerenciar usuários." }
  }

  const parsed = criarUsuarioSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  try {
    const senhaTemporaria = gerarSenhaTemporaria()
    const senhaHash = await bcrypt.hash(senhaTemporaria, 10)

    const novoUsuario = await prisma.usuario.create({
      data: {
        empresaId: session.user.empresaId,
        nome: parsed.data.nome,
        email: parsed.data.email,
        senhaHash,
        precisaTrocarSenha: true,
        role: parsed.data.role,
        funcao: parsed.data.funcao,
        cargo: parsed.data.cargo,
        status: "ativo",
      },
    })

    const auditoria = await actionRegistrarAuditoria({
      modulo: "USUARIOS",
      acao: "CRIADO",
      entidadeId: novoUsuario.id,
      descricao: `Usuário criado: ${novoUsuario.nome} (${novoUsuario.email}).`,
    })
    if (!auditoria.ok) console.error("Erro ao registrar auditoria:", auditoria.error)

    // senhaTemporaria só existe aqui, em texto puro, pra mostrar UMA vez no modal.
    // Nunca é persistida em lugar nenhum (nem client state) além desse retorno.
    return { ok: true, data: { usuario: formatarUsuario(novoUsuario), senhaTemporaria } }
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { ok: false, error: "Já existe um usuário com este e-mail." }
    }
    return { ok: false, error: "Erro ao criar usuário." }
  }
}

export async function actionAtualizarUsuario(
  input: z.infer<typeof atualizarUsuarioSchema>
): Promise<ResultadoAction<ReturnType<typeof formatarUsuario>>> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: "Não autenticado." }

  if (!podeGerenciarUsuarios(session.user)) {
    return { ok: false, error: "Sem permissão para gerenciar usuários." }
  }

  const parsed = atualizarUsuarioSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  try {
    const usuarioAntigo = await prisma.usuario.findUnique({
      where: { id: parsed.data.id, empresaId: session.user.empresaId },
    })
    if (!usuarioAntigo) {
      return { ok: false, error: "Usuário não encontrado." }
    }

    const atualizado = await prisma.usuario.update({
      where: { id: parsed.data.id, empresaId: session.user.empresaId },
      data: {
        nome: parsed.data.nome,
        email: parsed.data.email,
        role: parsed.data.role,
        funcao: parsed.data.funcao,
        cargo: parsed.data.cargo,
      },
    })

    // Diff campo a campo (nunca inclui senha/senhaHash) — mesma lógica que existia
    // antes na page quando Usuários ainda era mock.
    const camposAlterados: { campo: string; valorAnterior: string; valorNovo: string }[] = []
    if (usuarioAntigo.nome !== atualizado.nome) {
      camposAlterados.push({ campo: "nome", valorAnterior: usuarioAntigo.nome, valorNovo: atualizado.nome })
    }
    if (usuarioAntigo.email !== atualizado.email) {
      camposAlterados.push({ campo: "email", valorAnterior: usuarioAntigo.email, valorNovo: atualizado.email })
    }
    if ((usuarioAntigo.cargo ?? "") !== (atualizado.cargo ?? "")) {
      camposAlterados.push({ campo: "cargo", valorAnterior: usuarioAntigo.cargo ?? "", valorNovo: atualizado.cargo ?? "" })
    }
    if (usuarioAntigo.role !== atualizado.role) {
      camposAlterados.push({ campo: "role", valorAnterior: usuarioAntigo.role, valorNovo: atualizado.role })
    }
    if (usuarioAntigo.funcao !== atualizado.funcao) {
      camposAlterados.push({ campo: "funcao", valorAnterior: usuarioAntigo.funcao, valorNovo: atualizado.funcao })
    }

    if (camposAlterados.length > 0) {
      const auditoria = await actionRegistrarAuditoria({
        modulo: "USUARIOS",
        acao: "ATUALIZADO",
        entidadeId: atualizado.id,
        descricao: `Usuário ${atualizado.nome} atualizado.`,
        camposAlterados,
      })
      if (!auditoria.ok) console.error("Erro ao registrar auditoria:", auditoria.error)
    }
    return { ok: true, data: formatarUsuario(atualizado) }
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { ok: false, error: "Já existe um usuário com este e-mail." }
    }
    return { ok: false, error: "Erro ao atualizar usuário." }
  }
}

export async function actionInativarUsuario(id: string): Promise<ResultadoAction<ReturnType<typeof formatarUsuario>>> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: "Não autenticado." }

  if (!podeGerenciarUsuarios(session.user)) {
    return { ok: false, error: "Sem permissão para gerenciar usuários." }
  }

  try {
    const usuarioExistente = await prisma.usuario.findFirst({
      where: { id, empresaId: session.user.empresaId },
    })
    if (!usuarioExistente) {
      return { ok: false, error: "Usuário não encontrado." }
    }

    const atualizado = await prisma.usuario.update({
      where: { id, empresaId: session.user.empresaId },
      data: { status: "inativo" },
    })

    const auditoria = await actionRegistrarAuditoria({
      modulo: "USUARIOS",
      acao: "STATUS_ALTERADO",
      entidadeId: atualizado.id,
      descricao: `Usuário inativado: ${atualizado.nome}.`,
    })
    if (!auditoria.ok) console.error("Erro ao registrar auditoria:", auditoria.error)

    return { ok: true, data: formatarUsuario(atualizado) }
  } catch (error) {
    console.error("Erro ao inativar usuário:", error)
    return { ok: false, error: "Erro ao inativar usuário." }
  }
}

export async function actionReativarUsuario(id: string): Promise<ResultadoAction<ReturnType<typeof formatarUsuario>>> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: "Não autenticado." }

  if (!podeGerenciarUsuarios(session.user)) {
    return { ok: false, error: "Sem permissão para gerenciar usuários." }
  }

  try {
    const usuarioExistente = await prisma.usuario.findFirst({
      where: { id, empresaId: session.user.empresaId },
    })
    if (!usuarioExistente) {
      return { ok: false, error: "Usuário não encontrado." }
    }

    const atualizado = await prisma.usuario.update({
      where: { id, empresaId: session.user.empresaId },
      data: { status: "ativo" },
    })

    const auditoria = await actionRegistrarAuditoria({
      modulo: "USUARIOS",
      acao: "STATUS_ALTERADO",
      entidadeId: atualizado.id,
      descricao: `Usuário reativado: ${atualizado.nome}.`,
    })
    if (!auditoria.ok) console.error("Erro ao registrar auditoria:", auditoria.error)

    return { ok: true, data: formatarUsuario(atualizado) }
  } catch (error) {
    console.error("Erro ao reativar usuário:", error)
    return { ok: false, error: "Erro ao reativar usuário." }
  }
}