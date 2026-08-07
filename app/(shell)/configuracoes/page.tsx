"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
    Configuracoes,
    EnderecoConfiguracao,
    PoliticaSenhaMinima,
} from "@/types/domain"
import { useCurrentUser } from "@/lib/auth-context"
import { useConfiguracoesStore } from "@/lib/configuracoes-store"
import { RequireRole } from "@/components/auth/require-role"

type SecaoId = "regras" | "empresa" | "deposito" | "seguranca"

const SECOES: { id: SecaoId; label: string }[] = [
    { id: "regras", label: "Regras Operacionais" },
    { id: "empresa", label: "Dados da Empresa" },
    { id: "deposito", label: "Depósito" },
    { id: "seguranca", label: "Segurança" },
]

const POLITICA_SENHA_OPCOES: { value: PoliticaSenhaMinima; label: string }[] = [
    { value: "BASICA", label: "Básica — mínimo 8 caracteres" },
    { value: "MEDIA", label: "Média — mínimo 10 caracteres, letras e números" },
    { value: "FORTE", label: "Forte — mínimo 12 caracteres, letras, números e símbolo" },
]

const SESSAO_MIN_MINUTOS = 5
const SENHA_TEMP_MIN_DIAS = 1

function enderecoVazio(): EnderecoConfiguracao {
    return { logradouro: "", numero: "", bairro: "", cidade: "", uf: "", cep: "" }
}

function normalizarCNPJ(valor: string): string {
    return valor.replace(/\D/g, "")
}

function cnpjValido(valor: string): boolean {
    return normalizarCNPJ(valor).length === 14
}

function emailValido(valor: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
}

function enderecoPreenchido(e: EnderecoConfiguracao): boolean {
    return Boolean(e.logradouro.trim() && e.cidade.trim() && e.uf.trim() && e.cep.trim())
}

export default function ConfiguracoesPage() {
    return (
        <RequireRole roles={["ADMIN"]}>
            <ConfiguracoesScreen />
        </RequireRole>
    )
}

function ConfiguracoesScreen() {
    const currentUser = useCurrentUser()
    const configuracoes = useConfiguracoesStore((s) => s.configuracoes)
    const loading = useConfiguracoesStore((s) => s.loading)
    const error = useConfiguracoesStore((s) => s.error)
    const carregarConfiguracoes = useConfiguracoesStore((s) => s.carregarConfiguracoes)
    const atualizarRegrasOperacionais = useConfiguracoesStore((s) => s.atualizarRegrasOperacionais)
    const atualizarDadosEmpresa = useConfiguracoesStore((s) => s.atualizarDadosEmpresa)
    const atualizarDeposito = useConfiguracoesStore((s) => s.atualizarDeposito)
    const atualizarSeguranca = useConfiguracoesStore((s) => s.atualizarSeguranca)

    useEffect(() => {
        carregarConfiguracoes()
    }, [])

    const [abaAtiva, setAbaAtiva] = useState<SecaoId>("regras")
    const [abaPendente, setAbaPendente] = useState<SecaoId | null>(null)

    const [draftRegras, setDraftRegras] = useState(configuracoes?.regrasOperacionais || { permitirAutoConferencia: false, permitirAprovacaoExcepcionalDivergencia: false })
    const [draftEmpresa, setDraftEmpresa] = useState(configuracoes?.dadosEmpresa || { razaoSocial: "", nomeFantasia: undefined, cnpj: "", email: undefined, telefone: undefined, endereco: undefined })
    const [draftDeposito, setDraftDeposito] = useState(configuracoes?.deposito || { nome: "", endereco: { logradouro: "", numero: "", bairro: "", cidade: "", uf: "", cep: "" }, responsavel: undefined })
    const [draftSeguranca, setDraftSeguranca] = useState(configuracoes?.seguranca || { tempoExpiracaoSessaoMinutos: 30, politicaSenhaMinima: "MEDIA" as const, duracaoSenhaTemporariaDias: 7 })

    useEffect(() => {
        if (configuracoes) {
            setDraftRegras(configuracoes.regrasOperacionais)
            setDraftEmpresa(configuracoes.dadosEmpresa)
            setDraftDeposito(configuracoes.deposito)
            setDraftSeguranca(configuracoes.seguranca)
        }
    }, [configuracoes])

    const [salvando, setSalvando] = useState(false)
    const [toast, setToast] = useState<string | null>(null)
    const toastTimer = useRef<number | null>(null)

    function showToast(msg: string) {
        setToast(msg)
        if (toastTimer.current) window.clearTimeout(toastTimer.current)
        toastTimer.current = window.setTimeout(() => setToast(null), 2800)
    }

    const dirtyRegras = useMemo(
        () => configuracoes ? JSON.stringify(draftRegras) !== JSON.stringify(configuracoes.regrasOperacionais) : false,
        [draftRegras, configuracoes?.regrasOperacionais],
    )
    const dirtyEmpresa = useMemo(
        () => configuracoes ? JSON.stringify(draftEmpresa) !== JSON.stringify(configuracoes.dadosEmpresa) : false,
        [draftEmpresa, configuracoes?.dadosEmpresa],
    )
    const dirtyDeposito = useMemo(
        () => configuracoes ? JSON.stringify(draftDeposito) !== JSON.stringify(configuracoes.deposito) : false,
        [draftDeposito, configuracoes?.deposito],
    )
    const dirtySeguranca = useMemo(
        () => configuracoes ? JSON.stringify(draftSeguranca) !== JSON.stringify(configuracoes.seguranca) : false,
        [draftSeguranca, configuracoes?.seguranca],
    )

    const dirtyPorSecao: Record<SecaoId, boolean> = {
        regras: dirtyRegras,
        empresa: dirtyEmpresa,
        deposito: dirtyDeposito,
        seguranca: dirtySeguranca,
    }

    function tentarTrocarAba(destino: SecaoId) {
        if (destino === abaAtiva) return
        if (dirtyPorSecao[abaAtiva]) {
            setAbaPendente(destino)
            return
        }
        setAbaAtiva(destino)
    }

    function confirmarDescarte() {
        if (!configuracoes) return
        switch (abaAtiva) {
            case "regras":
                setDraftRegras(configuracoes.regrasOperacionais)
                break
            case "empresa":
                setDraftEmpresa(configuracoes.dadosEmpresa)
                break
            case "deposito":
                setDraftDeposito(configuracoes.deposito)
                break
            case "seguranca":
                setDraftSeguranca(configuracoes.seguranca)
                break
        }
        if (abaPendente) {
            setAbaAtiva(abaPendente)
            setAbaPendente(null)
        }
    }

    // Validações
    const errosEmpresa: Record<string, string> = {}
    if (!draftEmpresa.razaoSocial.trim()) errosEmpresa.razaoSocial = "Razão Social é obrigatória."
    if (!draftEmpresa.cnpj.trim()) {
        errosEmpresa.cnpj = "CNPJ é obrigatório."
    } else if (!cnpjValido(draftEmpresa.cnpj)) {
        errosEmpresa.cnpj = "CNPJ inválido."
    }
    if (draftEmpresa.email && !emailValido(draftEmpresa.email)) {
        errosEmpresa.email = "E-mail inválido."
    }

    const errosDeposito: Record<string, string> = {}
    if (!draftDeposito.nome.trim()) errosDeposito.nome = "Nome do depósito é obrigatório."
    if (!enderecoPreenchido(draftDeposito.endereco)) {
        errosDeposito.endereco = "Endereço é obrigatório."
    }

    const errosSeguranca: Record<string, string> = {}
    if (
        !Number.isFinite(draftSeguranca.tempoExpiracaoSessaoMinutos) ||
        draftSeguranca.tempoExpiracaoSessaoMinutos < SESSAO_MIN_MINUTOS
    ) {
        errosSeguranca.tempoExpiracaoSessaoMinutos = `Informe ao menos ${SESSAO_MIN_MINUTOS} minutos.`
    }
    if (
        !Number.isFinite(draftSeguranca.duracaoSenhaTemporariaDias) ||
        draftSeguranca.duracaoSenhaTemporariaDias < SENHA_TEMP_MIN_DIAS
    ) {
        errosSeguranca.duracaoSenhaTemporariaDias = `Informe ao menos ${SENHA_TEMP_MIN_DIAS} dia.`
    }

    const podeSalvarRegras = dirtyRegras
    const podeSalvarEmpresa = dirtyEmpresa && Object.keys(errosEmpresa).length === 0
    const podeSalvarDeposito = dirtyDeposito && Object.keys(errosDeposito).length === 0
    const podeSalvarSeguranca = dirtySeguranca && Object.keys(errosSeguranca).length === 0

    async function salvar(secao: SecaoId) {
        setSalvando(true)
        let result
        switch (secao) {
            case "regras":
                result = await atualizarRegrasOperacionais(draftRegras)
                break
            case "empresa":
                result = await atualizarDadosEmpresa(draftEmpresa)
                break
            case "deposito":
                result = await atualizarDeposito(draftDeposito)
                break
            case "seguranca":
                result = await atualizarSeguranca(draftSeguranca)
                break
        }
        setSalvando(false)
        if (result?.ok) {
            showToast("Configurações salvas.")
        } else {
            showToast(result?.error || "Erro ao salvar configurações.")
        }
    }

    if (loading) {
        return (
            <div className="space-y-4 p-6">
                <div className="h-6 w-48 animate-pulse rounded bg-muted" />
                <div className="h-10 w-full animate-pulse rounded bg-muted" />
                <div className="space-y-3">
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center p-6">
                <p className="text-destructive">Erro ao carregar configurações: {error}</p>
            </div>
        )
    }

    if (!configuracoes) {
        return (
            <div className="flex items-center justify-center p-6">
                <p className="text-muted-foreground">Nenhuma configuração encontrada.</p>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col p-6">
            <h1 className="text-lg font-semibold text-foreground">Configurações</h1>

            {/* Navegação entre seções */}
            <div className="mt-4 flex flex-wrap gap-2 border-b border-border pb-2">
                {SECOES.map((secao) => (
                    <button
                        key={secao.id}
                        type="button"
                        onClick={() => tentarTrocarAba(secao.id)}
                        className={cn(
                            "rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                            abaAtiva === secao.id
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                    >
                        {secao.label}
                        {dirtyPorSecao[secao.id] && (
                            <span className="ml-1.5 inline-block size-1.5 rounded-full bg-[hsl(var(--warning))] align-middle" />
                        )}
                    </button>
                ))}
            </div>

            <div className="mt-6 max-w-xl">
                {abaAtiva === "regras" && (
                    <RegrasOperacionaisForm
                        valores={draftRegras}
                        onChange={setDraftRegras}
                        onSalvar={() => salvar("regras")}
                        podeSalvar={podeSalvarRegras}
                        salvando={salvando}
                    />
                )}
                {abaAtiva === "empresa" && (
                    <DadosEmpresaForm
                        valores={draftEmpresa}
                        onChange={setDraftEmpresa}
                        erros={errosEmpresa}
                        onSalvar={() => salvar("empresa")}
                        podeSalvar={podeSalvarEmpresa}
                        salvando={salvando}
                    />
                )}
                {abaAtiva === "deposito" && (
                    <DepositoForm
                        valores={draftDeposito}
                        onChange={setDraftDeposito}
                        erros={errosDeposito}
                        onSalvar={() => salvar("deposito")}
                        podeSalvar={podeSalvarDeposito}
                        salvando={salvando}
                    />
                )}
                {abaAtiva === "seguranca" && (
                    <SegurancaForm
                        valores={draftSeguranca}
                        onChange={setDraftSeguranca}
                        erros={errosSeguranca}
                        onSalvar={() => salvar("seguranca")}
                        podeSalvar={podeSalvarSeguranca}
                        salvando={salvando}
                    />
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-lg border border-border bg-popover px-3.5 py-2.5 text-sm font-medium text-popover-foreground shadow-lg shadow-black/15"
                >
                    <CheckCircle2 className="size-4 text-success" />
                    {toast}
                </div>
            )}

            {/* Modal de alterações não salvas */}
            <Dialog.Root
                open={abaPendente !== null}
                onOpenChange={(open) => {
                    if (!open) setAbaPendente(null)
                }}
            >
                <Dialog.Portal>
                    <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
                    <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover p-6 shadow-xl outline-none transition-[transform,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
                        <Dialog.Title className="text-base font-semibold text-foreground">
                            Alterações não salvas
                        </Dialog.Title>
                        <Dialog.Description className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            Você tem alterações não salvas nesta seção. Deseja descartá-las?
                        </Dialog.Description>
                        <div className="mt-5 flex justify-end gap-2">
                            <Dialog.Close className="inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50">
                                Voltar
                            </Dialog.Close>
                            <button
                                type="button"
                                onClick={confirmarDescarte}
                                className="inline-flex h-9 items-center rounded-md bg-destructive px-4 text-sm font-medium text-white outline-none hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-ring/50"
                            >
                                Descartar alterações
                            </button>
                        </div>
                    </Dialog.Popup>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    )
}

// ─── Campos reutilizáveis ────────────────────────────────────────────────────

function Campo({
    label,
    descricao,
    obrigatorio,
    erro,
    children,
}: {
    label: string
    descricao?: string
    obrigatorio?: boolean
    erro?: string
    children: React.ReactNode
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
                {label} {obrigatorio && <span className="text-destructive">*</span>}
            </label>
            {children}
            {erro ? (
                <p className="text-xs text-destructive">{erro}</p>
            ) : descricao ? (
                <p className="text-xs text-muted-foreground">{descricao}</p>
            ) : null}
        </div>
    )
}

function CampoTexto({
    value,
    onChange,
    placeholder,
    autoFocus,
}: {
    value: string
    onChange: (v: string) => void
    placeholder?: string
    autoFocus?: boolean
}) {
    return (
        <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
    )
}

function CampoNumero({
    value,
    onChange,
    autoFocus,
}: {
    value: number
    onChange: (v: number) => void
    autoFocus?: boolean
}) {
    return (
        <input
            type="number"
            value={Number.isFinite(value) ? value : ""}
            onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
            autoFocus={autoFocus}
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
    )
}

function Toggle({
    checked,
    onChange,
    autoFocus,
}: {
    checked: boolean
    onChange: (v: boolean) => void
    autoFocus?: boolean
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            autoFocus={autoFocus}
            onClick={() => onChange(!checked)}
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                checked ? "bg-primary" : "bg-muted",
            )}
        >
            <span
                className={cn(
                    "inline-block size-4 transform rounded-full bg-white transition-transform",
                    checked ? "translate-x-6" : "translate-x-1",
                )}
            />
        </button>
    )
}

function BotaoSalvar({
    onSalvar,
    podeSalvar,
    salvando,
}: {
    onSalvar: () => void
    podeSalvar: boolean
    salvando: boolean
}) {
    return (
        <button
            type="button"
            onClick={onSalvar}
            disabled={!podeSalvar || salvando}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {salvando && <Loader2 className="size-4 animate-spin" />}
            {salvando ? "Salvando…" : "Salvar"}
        </button>
    )
}

// ─── Seção 1 — Regras Operacionais ──────────────────────────────────────────

function RegrasOperacionaisForm({
    valores,
    onChange,
    onSalvar,
    podeSalvar,
    salvando,
}: {
    valores: Configuracoes["regrasOperacionais"]
    onChange: (v: Configuracoes["regrasOperacionais"]) => void
    onSalvar: () => void
    podeSalvar: boolean
    salvando: boolean
}) {
    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Permitir auto conferência</p>
                    <p className="text-xs text-muted-foreground">
                        Permite que o mesmo estoquista separe e confira o próprio pedido.
                    </p>
                </div>
                <Toggle
                    checked={valores.permitirAutoConferencia}
                    onChange={(v) => onChange({ ...valores, permitirAutoConferencia: v })}
                    autoFocus
                />
            </div>

            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                        Permitir aprovação excepcional de divergência
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Permite que o Supervisor aprove um pedido mesmo com divergência entre separação e
                        conferência.
                    </p>
                </div>
                <Toggle
                    checked={valores.permitirAprovacaoExcepcionalDivergencia}
                    onChange={(v) =>
                        onChange({ ...valores, permitirAprovacaoExcepcionalDivergencia: v })
                    }
                />
            </div>

            <div>
                <BotaoSalvar onSalvar={onSalvar} podeSalvar={podeSalvar} salvando={salvando} />
            </div>
        </div>
    )
}

// ─── Seção 2 — Dados da Empresa ─────────────────────────────────────────────

function DadosEmpresaForm({
    valores,
    onChange,
    erros,
    onSalvar,
    podeSalvar,
    salvando,
}: {
    valores: Configuracoes["dadosEmpresa"]
    onChange: (v: Configuracoes["dadosEmpresa"]) => void
    erros: Record<string, string>
    onSalvar: () => void
    podeSalvar: boolean
    salvando: boolean
}) {
    const endereco = valores.endereco ?? enderecoVazio()

    return (
        <div className="space-y-4">
            <Campo label="Razão Social" obrigatorio erro={erros.razaoSocial}>
                <CampoTexto
                    value={valores.razaoSocial}
                    onChange={(v) => onChange({ ...valores, razaoSocial: v })}
                    autoFocus
                />
            </Campo>

            <Campo label="Nome Fantasia">
                <CampoTexto
                    value={valores.nomeFantasia ?? ""}
                    onChange={(v) => onChange({ ...valores, nomeFantasia: v || undefined })}
                />
            </Campo>

            <Campo label="CNPJ" obrigatorio erro={erros.cnpj}>
                <CampoTexto
                    value={valores.cnpj}
                    onChange={(v) => onChange({ ...valores, cnpj: v })}
                    placeholder="00.000.000/0000-00"
                />
            </Campo>

            <Campo label="E-mail" erro={erros.email}>
                <CampoTexto
                    value={valores.email ?? ""}
                    onChange={(v) => onChange({ ...valores, email: v || undefined })}
                />
            </Campo>

            <Campo label="Telefone">
                <CampoTexto
                    value={valores.telefone ?? ""}
                    onChange={(v) => onChange({ ...valores, telefone: v || undefined })}
                />
            </Campo>

            <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">Endereço</p>
                <div className="grid grid-cols-2 gap-3">
                    <Campo label="Logradouro">
                        <CampoTexto
                            value={endereco.logradouro}
                            onChange={(v) =>
                                onChange({ ...valores, endereco: { ...endereco, logradouro: v } })
                            }
                        />
                    </Campo>
                    <Campo label="Número">
                        <CampoTexto
                            value={endereco.numero}
                            onChange={(v) => onChange({ ...valores, endereco: { ...endereco, numero: v } })}
                        />
                    </Campo>
                    <Campo label="Bairro">
                        <CampoTexto
                            value={endereco.bairro}
                            onChange={(v) => onChange({ ...valores, endereco: { ...endereco, bairro: v } })}
                        />
                    </Campo>
                    <Campo label="Cidade">
                        <CampoTexto
                            value={endereco.cidade}
                            onChange={(v) => onChange({ ...valores, endereco: { ...endereco, cidade: v } })}
                        />
                    </Campo>
                    <Campo label="UF">
                        <CampoTexto
                            value={endereco.uf}
                            onChange={(v) => onChange({ ...valores, endereco: { ...endereco, uf: v } })}
                        />
                    </Campo>
                    <Campo label="CEP">
                        <CampoTexto
                            value={endereco.cep}
                            onChange={(v) => onChange({ ...valores, endereco: { ...endereco, cep: v } })}
                        />
                    </Campo>
                </div>
            </div>

            <div>
                <BotaoSalvar onSalvar={onSalvar} podeSalvar={podeSalvar} salvando={salvando} />
            </div>
        </div>
    )
}

// ─── Seção 3 — Depósito ─────────────────────────────────────────────────────

function DepositoForm({
    valores,
    onChange,
    erros,
    onSalvar,
    podeSalvar,
    salvando,
}: {
    valores: Configuracoes["deposito"]
    onChange: (v: Configuracoes["deposito"]) => void
    erros: Record<string, string>
    onSalvar: () => void
    podeSalvar: boolean
    salvando: boolean
}) {
    return (
        <div className="space-y-4">
            <Campo label="Nome do depósito" obrigatorio erro={erros.nome}>
                <CampoTexto
                    value={valores.nome}
                    onChange={(v) => onChange({ ...valores, nome: v })}
                    autoFocus
                />
            </Campo>

            <Campo label="Responsável">
                <CampoTexto
                    value={valores.responsavel ?? ""}
                    onChange={(v) => onChange({ ...valores, responsavel: v || undefined })}
                />
            </Campo>

            <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">
                    Endereço <span className="text-destructive">*</span>
                </p>
                {erros.endereco && <p className="text-xs text-destructive">{erros.endereco}</p>}
                <div className="grid grid-cols-2 gap-3">
                    <Campo label="Logradouro">
                        <CampoTexto
                            value={valores.endereco.logradouro}
                            onChange={(v) =>
                                onChange({ ...valores, endereco: { ...valores.endereco, logradouro: v } })
                            }
                        />
                    </Campo>
                    <Campo label="Número">
                        <CampoTexto
                            value={valores.endereco.numero}
                            onChange={(v) =>
                                onChange({ ...valores, endereco: { ...valores.endereco, numero: v } })
                            }
                        />
                    </Campo>
                    <Campo label="Bairro">
                        <CampoTexto
                            value={valores.endereco.bairro}
                            onChange={(v) =>
                                onChange({ ...valores, endereco: { ...valores.endereco, bairro: v } })
                            }
                        />
                    </Campo>
                    <Campo label="Cidade">
                        <CampoTexto
                            value={valores.endereco.cidade}
                            onChange={(v) =>
                                onChange({ ...valores, endereco: { ...valores.endereco, cidade: v } })
                            }
                        />
                    </Campo>
                    <Campo label="UF">
                        <CampoTexto
                            value={valores.endereco.uf}
                            onChange={(v) => onChange({ ...valores, endereco: { ...valores.endereco, uf: v } })}
                        />
                    </Campo>
                    <Campo label="CEP">
                        <CampoTexto
                            value={valores.endereco.cep}
                            onChange={(v) =>
                                onChange({ ...valores, endereco: { ...valores.endereco, cep: v } })
                            }
                        />
                    </Campo>
                </div>
            </div>

            <div>
                <BotaoSalvar onSalvar={onSalvar} podeSalvar={podeSalvar} salvando={salvando} />
            </div>
        </div>
    )
}

// ─── Seção 4 — Segurança ────────────────────────────────────────────────────

function SegurancaForm({
    valores,
    onChange,
    erros,
    onSalvar,
    podeSalvar,
    salvando,
}: {
    valores: Configuracoes["seguranca"]
    onChange: (v: Configuracoes["seguranca"]) => void
    erros: Record<string, string>
    onSalvar: () => void
    podeSalvar: boolean
    salvando: boolean
}) {
    return (
        <div className="space-y-4">
            <Campo
                label="Tempo de expiração da sessão (minutos)"
                obrigatorio
                erro={erros.tempoExpiracaoSessaoMinutos}
                descricao="Tempo de inatividade até o usuário ser desconectado automaticamente."
            >
                <CampoNumero
                    value={valores.tempoExpiracaoSessaoMinutos}
                    onChange={(v) => onChange({ ...valores, tempoExpiracaoSessaoMinutos: v })}
                    autoFocus
                />
            </Campo>

            <Campo label="Política de senha mínima" obrigatorio>
                <select
                    value={valores.politicaSenhaMinima}
                    onChange={(e) =>
                        onChange({ ...valores, politicaSenhaMinima: e.target.value as PoliticaSenhaMinima })
                    }
                    className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                    {POLITICA_SENHA_OPCOES.map((opcao) => (
                        <option key={opcao.value} value={opcao.value}>
                            {opcao.label}
                        </option>
                    ))}
                </select>
            </Campo>

            <Campo
                label="Duração da senha temporária (dias)"
                obrigatorio
                erro={erros.duracaoSenhaTemporariaDias}
                descricao="Prazo até a senha temporária expirar, caso o usuário nunca faça o primeiro login."
            >
                <CampoNumero
                    value={valores.duracaoSenhaTemporariaDias}
                    onChange={(v) => onChange({ ...valores, duracaoSenhaTemporariaDias: v })}
                />
            </Campo>

            <div>
                <BotaoSalvar onSalvar={onSalvar} podeSalvar={podeSalvar} salvando={salvando} />
            </div>
        </div>
    )
}
