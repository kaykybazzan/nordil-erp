"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { UFS, formatCep, novoEnderecoVazio } from "@/lib/utils/cliente-utils"
import type { Endereco } from "@/types/domain"

interface EnderecoFormProps {
    endereco?: Endereco
    onSave: (endereco: Endereco) => void
    onCancel: () => void
}

export function EnderecoForm({ endereco, onSave, onCancel }: EnderecoFormProps) {
    const [draft, setDraft] = useState<Endereco>(endereco ?? novoEnderecoVazio())

    const preenchido =
        draft.logradouro.trim() &&
        draft.numero.trim() &&
        draft.bairro.trim() &&
        draft.cidade.trim() &&
        draft.uf.trim() &&
        draft.cep.trim()

    return (
        <div className="rounded-md border border-border p-3">
            <div className="grid grid-cols-2 gap-2">
                <input
                    value={draft.logradouro}
                    onChange={(e) => setDraft({ ...draft, logradouro: e.target.value })}
                    placeholder="Logradouro"
                    className="col-span-2 h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <input
                    value={draft.numero}
                    onChange={(e) => setDraft({ ...draft, numero: e.target.value })}
                    placeholder="Número"
                    className="h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <input
                    value={draft.bairro}
                    onChange={(e) => setDraft({ ...draft, bairro: e.target.value })}
                    placeholder="Bairro"
                    className="h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <input
                    value={draft.cidade}
                    onChange={(e) => setDraft({ ...draft, cidade: e.target.value })}
                    placeholder="Cidade"
                    className="h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <select
                    value={draft.uf}
                    onChange={(e) => setDraft({ ...draft, uf: e.target.value })}
                    className="h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                    <option value="">UF</option>
                    {UFS.map((uf) => (
                        <option key={uf} value={uf}>
                            {uf}
                        </option>
                    ))}
                </select>
                <input
                    value={draft.cep}
                    onChange={(e) => setDraft({ ...draft, cep: formatCep(e.target.value) })}
                    placeholder="CEP"
                    className="h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
            </div>

            <div className="mt-3 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button size="sm" disabled={!preenchido} onClick={() => onSave(draft)}>
                    Salvar endereço
                </Button>
            </div>
        </div>
    )
}