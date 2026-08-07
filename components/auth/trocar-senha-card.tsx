"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface TrocarSenhaCardProps {
  onSubmit: (novaSenha: string) => void | Promise<void>
  isLoading?: boolean
  erro?: string | null
  companyName?: string
}

const MIN_LENGTH = 8

export function TrocarSenhaCard({
  onSubmit,
  isLoading = false,
  erro = null,
  companyName = "Nordil ERP",
}: TrocarSenhaCardProps) {
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [showNovaSenha, setShowNovaSenha] = useState(false)
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const novaSenhaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    novaSenhaRef.current?.focus()
  }, [])

  // Erro do servidor tem prioridade só se não houver erro de validação local pendente
  const displayError = validationError ?? erro

  function handlePasswordKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (typeof e.getModifierState === "function") {
      setCapsOn(e.getModifierState("CapsLock"))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isLoading) return

    if (novaSenha.length < MIN_LENGTH) {
      setValidationError(`A senha deve ter pelo menos ${MIN_LENGTH} caracteres.`)
      return
    }
    if (novaSenha !== confirmarSenha) {
      setValidationError("As senhas não coincidem.")
      return
    }

    setValidationError(null)
    onSubmit(novaSenha)
  }

  return (
    <div className="w-full max-w-[420px]">
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {displayError}
      </div>

      <div className="rounded-2xl border border-border/60 bg-white p-8 shadow-2xl shadow-black/15 sm:p-10">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt={companyName}
            width={220}
            height={60}
            priority
            className="h-14 w-auto"
          />

          <div className="mt-6 flex size-16 items-center justify-center rounded-full bg-[#2563eb]/10">
            <Lock className="size-7 text-[#2563eb]" aria-hidden="true" />
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-card-foreground">
            Defina sua nova senha
          </h1>
          <p className="mt-2 max-w-[300px] text-sm text-muted-foreground">
            Por segurança, você precisa trocar sua senha no primeiro acesso.
          </p>
        </div>

        <form className="mt-7 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {/* Nova senha */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nova-senha" className="text-sm font-medium text-foreground">
              Nova senha
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="nova-senha"
                ref={novaSenhaRef}
                type={showNovaSenha ? "text" : "password"}
                autoComplete="new-password"
                disabled={isLoading}
                value={novaSenha}
                onChange={(e) => {
                  setNovaSenha(e.target.value)
                  setValidationError(null)
                }}
                onKeyUp={handlePasswordKey}
                onKeyDown={handlePasswordKey}
                aria-invalid={!!displayError}
                className={cn(
                  "h-12 w-full rounded-lg border bg-background pl-11 pr-10 text-[15px] text-foreground transition-colors",
                  "placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-[3px] focus:ring-ring/30 focus:border-ring",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  displayError ? "border-destructive" : "border-input",
                )}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowNovaSenha((v) => !v)}
                disabled={isLoading}
                aria-label={showNovaSenha ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/30 disabled:opacity-60"
              >
                {showNovaSenha ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {capsOn && (
              <p className="flex items-center gap-1.5 text-xs text-warning-foreground" role="status">
                <AlertCircle className="size-3.5 text-warning" aria-hidden="true" />
                Caps Lock está ativado.
              </p>
            )}
          </div>

          {/* Confirmar nova senha */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmar-senha" className="text-sm font-medium text-foreground">
              Confirmar nova senha
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="confirmar-senha"
                type={showConfirmarSenha ? "text" : "password"}
                autoComplete="new-password"
                disabled={isLoading}
                value={confirmarSenha}
                onChange={(e) => {
                  setConfirmarSenha(e.target.value)
                  setValidationError(null)
                }}
                aria-invalid={!!displayError}
                className={cn(
                  "h-12 w-full rounded-lg border bg-background pl-11 pr-10 text-[15px] text-foreground transition-colors",
                  "placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-[3px] focus:ring-ring/30 focus:border-ring",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  displayError ? "border-destructive" : "border-input",
                )}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmarSenha((v) => !v)}
                disabled={isLoading}
                aria-label={showConfirmarSenha ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/30 disabled:opacity-60"
              >
                {showConfirmarSenha ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {displayError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <span className="text-foreground">{displayError}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="group mt-1 h-12 w-full gap-2 bg-[#2563eb] text-base font-medium text-white transition-all hover:bg-[#1d4ed8]"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Alterando…
              </>
            ) : (
              <>
                Definir nova senha
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-border/60 pt-5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          <span>Nordil ERP &copy; {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  )
}