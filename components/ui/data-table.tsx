"use client"

import * as React from "react"
import { ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface DataTableColumn<T> {
    id: string
    header: string
    cell: (row: T) => React.ReactNode
    className?: string
    hideOnTablet?: boolean
    sortable?: boolean
}

export interface DataTableSort {
    columnId: string
    direction: "asc" | "desc"
}

interface DataTableProps<T> {
    columns: DataTableColumn<T>[]
    data: T[]
    getRowId: (row: T) => string
    onRowClick?: (row: T) => void
    isLoading?: boolean
    skeletonRows?: number
    emptyState?: React.ReactNode
    hasMore?: boolean
    onLoadMore?: () => void
    isLoadingMore?: boolean
    sort?: DataTableSort | null
    onSortChange?: (columnId: string) => void
}

export function DataTable<T>({
    columns,
    data,
    getRowId,
    onRowClick,
    isLoading,
    skeletonRows = 8,
    emptyState,
    hasMore,
    onLoadMore,
    isLoadingMore,
    sort,
    onSortChange,
}: DataTableProps<T>) {
    return (
        <div className="w-full overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/30">
                        {columns.map((col) => (
                            <th
                                key={col.id}
                                className={cn(
                                    "px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase",
                                    col.hideOnTablet && "hidden lg:table-cell",
                                    col.className,
                                )}
                            >
                                {col.sortable && onSortChange ? (
                                    <button
                                        type="button"
                                        onClick={() => onSortChange(col.id)}
                                        className="inline-flex items-center gap-1 normal-case tracking-normal hover:text-foreground"
                                    >
                                        {col.header}
                                        {sort?.columnId === col.id &&
                                            (sort.direction === "asc" ? (
                                                <ArrowUp className="size-3" aria-hidden />
                                            ) : (
                                                <ArrowDown className="size-3" aria-hidden />
                                            ))}
                                    </button>
                                ) : (
                                    <span className="normal-case tracking-normal">{col.header}</span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {isLoading &&
                        Array.from({ length: skeletonRows }).map((_, i) => (
                            <tr key={`skeleton-${i}`} className="border-b border-border last:border-0">
                                {columns.map((col) => (
                                    <td
                                        key={col.id}
                                        className={cn("px-4 py-3", col.hideOnTablet && "hidden lg:table-cell")}
                                    >
                                        <div className="h-4 w-full max-w-[140px] animate-pulse rounded bg-muted" />
                                    </td>
                                ))}
                            </tr>
                        ))}

                    {!isLoading && data.length === 0 && (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                {emptyState ?? "Nenhum item encontrado."}
                            </td>
                        </tr>
                    )}

                    {!isLoading &&
                        data.map((row) => (
                            <tr
                                key={getRowId(row)}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={cn(
                                    "border-b border-border last:border-0",
                                    onRowClick && "cursor-pointer hover:bg-muted/40",
                                )}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.id}
                                        className={cn(
                                            "px-4 py-3 align-middle",
                                            col.hideOnTablet && "hidden lg:table-cell",
                                            col.className,
                                        )}
                                    >
                                        {col.cell(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                </tbody>
            </table>

            {hasMore && !isLoading && (
                <div className="flex justify-center border-t border-border py-3">
                    <Button variant="outline" size="sm" onClick={onLoadMore} disabled={isLoadingMore}>
                        {isLoadingMore ? "Carregando…" : "Carregar mais"}
                    </Button>
                </div>
            )}
        </div>
    )
}