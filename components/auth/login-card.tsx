"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
  Clock,
  WifiOff,
  Timer,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type LoginState =
  | "idle"
  | "loading"
  | "error"
  | "blocked"
  | "expired"
  | "inactive"
  | "rate_limited"
  | "network_error"

interface LoginCardProps {
  /** Controls which visual state is displayed. Defaults to "idle". */
  state?: LoginState
  /** Called when the form is submitted (no real auth is performed). */
  onSubmit?: (email: string, password: string) => void
  companyName?: string
}

const ERROR_STATES: LoginState[] = ["error", "blocked", "inactive", "rate_limited", "network_error"]

export function LoginCard({
  state = "idle",
  onSubmit,
  companyName = "Nordil ERP",
}: LoginCardProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const [emailInvalid, setEmailInvalid] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const prevState = useRef<LoginState>(state)

  const isLoading = state === "loading"
  const isCredentialError = state === "error"
  const isBlocked = state === "blocked"
  const isInactive = state === "inactive"
  const isRateLimited = state === "rate_limited"
  const isNetworkError = state === "network_error"

  // Autofocus e-mail on mount
  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  // When transitioning into an error state: clear password, return focus to e-mail
  useEffect(() => {
    const wasError = ERROR_STATES.includes(prevState.current)
    const isError = ERROR_STATES.includes(state)

    if (!wasError && isError) {
      // Only clear password for credential/auth errors, not structural ones
      if (state === "error") {
        setPassword("")
      }
      emailRef.current?.focus()
    }

    prevState.current = state
  }, [state])

  function validateEmail(value: string) {
    if (value.length === 0) {
      setEmailInvalid(false)
      return
    }
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    setEmailInvalid(!ok)
  }

  function handlePasswordKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (typeof e.getModifierState === "function") {
      setCapsOn(e.getModifierState("CapsLock"))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isLoading) return
    onSubmit?.(email, password)
  }

  const fieldErrorRing = isCredentialError

  return (
    <div className="w-full max-w-[360px]">
      {/* Sessão expirada — banner acima do card */}
      {state === "expired" && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm"
        >
          <Clock className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span className="text-foreground">Sua sessão expirou. Entre novamente.</span>
        </div>
      )}

      {/* Região aria-live para erros — lida por leitores de tela ao surgir */}
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {isCredentialError && "E-mail ou senha incorretos."}
        {isBlocked && "Sua conta está bloqueada. Fale com o administrador da empresa."}
        {isInactive && "Empresa inativa. Entre em contato com o suporte."}
        {isRateLimited && "Muitas tentativas. Aguarde alguns minutos."}
        {isNetworkError && "Não foi possível conectar. Tente novamente."}
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {companyName}
        </p>
        <h1 className="mt-1 text-lg font-semibold text-card-foreground">Entrar</h1>

        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {/* E-mail */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              E-mail
            </label>
            <input
              id="email"
              ref={emailRef}
              type="email"
              inputMode="email"
              autoComplete="username"
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => validateEmail(e.target.value)}
              aria-invalid={emailInvalid || fieldErrorRing}
              aria-describedby={emailInvalid ? "email-error" : undefined}
              className={cn(
                "h-10 rounded-md border bg-background px-3 text-sm text-foreground",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
                "disabled:cursor-not-allowed disabled:opacity-60",
                emailInvalid || fieldErrorRing ? "border-destructive" : "border-input",
              )}
              placeholder="voce@empresa.com"
            />
            {emailInvalid && (
              <p id="email-error" role="alert" className="text-xs text-destructive">
                Informe um e-mail válido.
              </p>
            )}
          </div>

          {/* Senha */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={handlePasswordKey}
                onKeyDown={handlePasswordKey}
                aria-invalid={fieldErrorRing}
                className={cn(
                  "h-10 w-full rounded-md border bg-background pl-3 pr-10 text-sm text-foreground",
                  "placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  fieldErrorRing ? "border-destructive" : "border-input",
                )}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={isLoading}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                {showPassword ? (
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

          {/* Lembrar + esqueci */}
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={isLoading}
                className="size-4 rounded border-input accent-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              />
              Lembrar de mim
            </label>
            <a
              href="/login/recuperar"
              className="rounded text-sm text-primary underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Esqueci minha senha
            </a>
          </div>

          {/* Mensagens de erro inline */}
          {isCredentialError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <span className="text-foreground">E-mail ou senha incorretos.</span>
            </div>
          )}

          {isBlocked && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm"
            >
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <span className="text-foreground">
                Esta conta está inativa. Fale com um administrador.
              </span>
            </div>
          )}

          {isInactive && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm"
            >
              <Building2 className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <span className="text-foreground">
                Empresa inativa.{" "}
                <a
                  href="mailto:suporte@nordilerp.com.br"
                  className="underline underline-offset-2 hover:no-underline"
                >
                  Entre em contato com o suporte.
                </a>
              </span>
            </div>
          )}

          {isRateLimited && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm"
            >
              <Timer className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <span className="text-foreground">Muitas tentativas. Aguarde alguns minutos.</span>
            </div>
          )}

          {isNetworkError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-border bg-muted px-3 py-2.5 text-sm"
            >
              <WifiOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="text-foreground">Não foi possível conectar. Tente novamente.</span>
            </div>
          )}

          {/* Botão principal */}
          <Button type="submit" disabled={isLoading} className="mt-1 h-10 w-full">
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Entrando…
              </>
            ) : (
              "Entrar"
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
