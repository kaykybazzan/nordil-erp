"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AutocompleteOption {
    value: string
    label: string
    description?: string
}

interface AutocompleteProps {
    options: AutocompleteOption[]
    value: string | null
    onChange: (value: string | null) => void
    placeholder?: string
    label?: string
    emptyMessage?: string
    disabled?: boolean
    className?: string
}

export function Autocomplete({
    options,
    value,
    onChange,
    placeholder = "Buscar…",
    label,
    emptyMessage = "Nenhum resultado encontrado.",
    disabled,
    className,
}: AutocompleteProps) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const [highlightedIndex, setHighlightedIndex] = React.useState(0)
    const containerRef = React.useRef<HTMLDivElement>(null)

    const selectedOption = options.find((o) => o.value === value) ?? null

    const filtered = React.useMemo(() => {
        if (query.trim() === "") return options
        const q = query.trim().toLowerCase()
        return options.filter((o) => o.label.toLowerCase().includes(q))
    }, [options, query])

    React.useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener("mousedown", onClickOutside)
        return () => document.removeEventListener("mousedown", onClickOutside)
    }, [open])

    React.useEffect(() => {
        setHighlightedIndex(0)
    }, [filtered])

    function selecionar(option: AutocompleteOption) {
        onChange(option.value)
        setQuery("")
        setOpen(false)
    }

    function limpar(e: React.MouseEvent) {
        e.stopPropagation()
        onChange(null)
        setQuery("")
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Escape") {
            setOpen(false)
            return
        }
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setOpen(true)
            setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1))
            return
        }
        if (e.key === "ArrowUp") {
            e.preventDefault()
            setHighlightedIndex((i) => Math.max(i - 1, 0))
            return
        }
        if (e.key === "Enter") {
            e.preventDefault()
            const opt = filtered[highlightedIndex]
            if (opt) selecionar(opt)
        }
    }

    return (
        <div ref={containerRef} className={cn("relative flex flex-col gap-1.5", className)}>
            {label && <label className="text-xs text-muted-foreground">{label}</label>}

            <div className="relative">
                <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                />
                <input
                    type="text"
                    role="combobox"
                    aria-expanded={open}
                    aria-autocomplete="list"
                    disabled={disabled}
                    value={open ? query : selectedOption?.label ?? ""}
                    onFocus={() => setOpen(true)}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setOpen(true)
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={cn(
                        "h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm text-foreground",
                        "placeholder:text-muted-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
                        "disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                />
                {selectedOption && !disabled && (
                    <button
                        type="button"
                        onClick={limpar}
                        aria-label="Limpar seleção"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                    >
                        <X className="size-3.5" aria-hidden="true" />
                    </button>
                )}
            </div>

            {open && !disabled && (
                <ul
                    role="listbox"
                    className="absolute top-full z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md"
                >
                    {filtered.length === 0 && (
                        <li className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</li>
                    )}
                    {filtered.map((option, index) => (
                        <li
                            key={option.value}
                            role="option"
                            aria-selected={option.value === value}
                            onMouseDown={(e) => {
                                e.preventDefault()
                                selecionar(option)
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={cn(
                                "cursor-pointer px-3 py-2 text-sm",
                                index === highlightedIndex ? "bg-muted" : "hover:bg-muted/60",
                                option.value === value && "font-medium text-primary",
                            )}
                        >
                            <div>{option.label}</div>
                            {option.description && (
                                <div className="text-xs text-muted-foreground">{option.description}</div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}