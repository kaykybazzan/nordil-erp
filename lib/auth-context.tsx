"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { Usuario } from "@/types/domain"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"

const MOCKED_CURRENT_USER: Usuario = MOCK_USUARIOS[0]

interface AuthContextValue {
  currentUser: Usuario
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ currentUser: MOCKED_CURRENT_USER }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth precisa estar dentro de <AuthProvider>")
  }
  return ctx
}