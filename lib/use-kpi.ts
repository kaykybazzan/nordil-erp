"use client"

import { useEffect, useRef, useState } from "react"

type KpiState<T> =
  | { status: "loading"; value: null }
  | { status: "success"; value: T }
  | { status: "error"; value: null }

export function useKpi<T>(compute: () => T | Promise<T>, deps: React.DependencyList): KpiState<T> {
  const [state, setState] = useState<KpiState<T>>({ status: "loading", value: null })
  const computeRef = useRef(compute)
  computeRef.current = compute

  useEffect(() => {
    setState({ status: "loading", value: null })
    const timer = setTimeout(async () => {
      try {
        const value = await computeRef.current()
        setState({ status: "success", value })
      } catch {
        setState({ status: "error", value: null })
      }
    }, 150)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}