"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface TrocarSenhaCardProps {
  onSubmit: (novaSenha: string) => void
  isLoading?: boolean
}

export function TrocarSenhaCard({ onSubmit, isLoading = false }: TrocarSenhaCardProps) {
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [showNovaSenha, setShowNovaSenha] = useState(false)
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const senhaValida = novaSenha.length >= 6
  const senhasBatem = novaSenha === confirmarSenha && novaSenha.length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isLoading) return

    setErro(null)

    if (!senhaValida) {
      setErro("A senha deve ter pelo menos 6 caracteres.")
      return
    }

    if (!senhasBatem) {
      setErro("As senhas não coincidem.")
      return
    }

    onSubmit(novaSenha)
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-card-foreground">Defina sua nova senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Por segurança, você precisa trocar sua senha no primeiro acesso.
        </p>

        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {/* Nova senha */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nova-senha" className="text-sm font-medium text-foreground">
              Nova senha
            </label>
            <div className="relative">
              <input
                id="nova-senha"
                type={showNovaSenha ? "text" : "password"}
                autoComplete="new-password"
                disabled={isLoading}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-md border bg-background pl-3 pr-10 text-sm text-foreground",
                  "placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  erro ? "border-destructive" : "border-input",
                )}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowNovaSenha((v) => !v)}
                disabled={isLoading}
                aria-label={showNovaSenha ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                {showNovaSenha ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {novaSenha.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                {senhaValida ? (
                  <CheckCircle2 className="size-3.5 text-green-600" aria-hidden="true" />
                ) : (
                  <AlertCircle className="size-3.5 text-muted-foreground" aria-hidden="true" />
                )}
                <span className={senhaValida ? "text-green-600" : "text-muted-foreground"}>
                  Mínimo de 6 caracteres
                </span>
              </div>
            )}
          </div>

          {/* Confirmar senha */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmar-senha" className="text-sm font-medium text-foreground">
              Confirmar nova senha
            </label>
            <div className="relative">
              <input
                id="confirmar-senha"
                type={showConfirmarSenha ? "text" : "password"}
                autoComplete="new-password"
                disabled={isLoading}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-md border bg-background pl-3 pr-10 text-sm text-foreground",
                  "placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  erro ? "border-destructive" : "border-input",
                )}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmarSenha((v) => !v)}
                disabled={isLoading}
                aria-label={showConfirmarSenha ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                {showConfirmarSenha ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {confirmarSenha.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                {senhasBatem ? (
                  <CheckCircle2 className="size-3.5 text-green-600" aria-hidden="true" />
                ) : (
                  <AlertCircle className="size-3.5 text-muted-foreground" aria-hidden="true" />
                )}
                <span className={senhasBatem ? "text-green-600" : "text-muted-foreground"}>
                  As senhas coincidem
                </span>
              </div>
            )}
          </div>

          {/* Mensagem de erro */}
          {erro && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <span className="text-foreground">{erro}</span>
            </div>
          )}

          {/* Botão principal */}
          <Button type="submit" disabled={isLoading} className="mt-1 h-10 w-full">
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Atualizando senha…
              </>
            ) : (
              "Definir nova senha"
            )}
          </Button>
        </form>
      </div>

      {/* Rodapé discreto */}
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Nordil ERP &copy; {new Date().getFullYear()}
      </p>
    </div>
  )
}
