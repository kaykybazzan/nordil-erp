"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
  Clock,
  WifiOff,
  Timer,
  Building2,
  ShieldCheck,
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
  state?: LoginState
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

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  useEffect(() => {
    const wasError = ERROR_STATES.includes(prevState.current)
    const isError = ERROR_STATES.includes(state)

    if (!wasError && isError) {
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
    <div className="w-full max-w-[440px]">
      {state === "expired" && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3.5 py-3 text-sm"
        >
          <Clock className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span className="text-foreground">Sua sessão expirou. Entre novamente.</span>
        </div>
      )}

      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {isCredentialError && "E-mail ou senha incorretos."}
        {isBlocked && "Sua conta está bloqueada. Fale com o administrador da empresa."}
        {isInactive && "Empresa inativa. Entre em contato com o suporte."}
        {isRateLimited && "Muitas tentativas. Aguarde alguns minutos."}
        {isNetworkError && "Não foi possível conectar. Tente novamente."}
      </div>

      <div className="rounded-2xl border border-border/60 bg-white p-8 shadow-2xl shadow-black/15 sm:p-10">
        <Image src="/logo.png" alt={companyName} width={260} height={70} priority className="h-[72px] w-auto" />

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-card-foreground sm:text-3xl">
          Entrar na sua conta
        </h1>
        <p className="mt-2 text-base text-muted-foreground">Acesse o sistema para continuar</p>

        <form className="mt-7 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {/* E-mail */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              E-mail
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
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
                  "h-12 w-full rounded-lg border bg-background pl-11 pr-3 text-[15px] text-foreground transition-colors",
                  "placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-[3px] focus:ring-ring/30 focus:border-ring",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  emailInvalid || fieldErrorRing ? "border-destructive" : "border-input",
                )}
                placeholder="voce@empresa.com"
              />
            </div>
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
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
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
                  "h-12 w-full rounded-lg border bg-background pl-11 pr-10 text-[15px] text-foreground transition-colors",
                  "placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-[3px] focus:ring-ring/30 focus:border-ring",
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
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/30 disabled:opacity-60"
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
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={isLoading}
                className="size-4 rounded border-input accent-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 disabled:opacity-60"
              />
              Lembrar de mim
            </label>
            <a
              href="/login/recuperar"
              className="rounded text-sm font-medium text-[#2563eb] underline-offset-2 transition-colors hover:underline focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
            >
              Esqueci minha senha
            </a>
          </div>

          {/* Mensagens de erro */}
          {isCredentialError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <span className="text-foreground">E-mail ou senha incorretos.</span>
            </div>
          )}

          {isBlocked && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm"
            >
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <span className="text-foreground">Esta conta está inativa. Fale com um administrador.</span>
            </div>
          )}

          {isInactive && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm"
            >
              <Building2 className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <span className="text-foreground">
                Empresa inativa.{" "}
                <a href="mailto:suporte@nordilerp.com.br" className="underline underline-offset-2 hover:no-underline">
                  Entre em contato com o suporte.
                </a>
              </span>
            </div>
          )}

          {isRateLimited && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3.5 py-3 text-sm"
            >
              <Timer className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <span className="text-foreground">Muitas tentativas. Aguarde alguns minutos.</span>
            </div>
          )}

          {isNetworkError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-border bg-muted px-3.5 py-3 text-sm"
            >
              <WifiOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="text-foreground">Não foi possível conectar. Tente novamente.</span>
            </div>
          )}

          {/* Botão principal */}
          <Button
            type="submit"
            disabled={isLoading}
            className="group mt-1 h-12 w-full gap-2 bg-[#2563eb] text-base font-medium text-white transition-all hover:bg-[#1d4ed8]"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Entrando…
              </>
            ) : (
              <>
                Entrar
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-border/60 pt-5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          <span>Login protegido por criptografia de ponta a ponta</span>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Nordil ERP &copy; {new Date().getFullYear()}
      </p>
    </div>
  )
}