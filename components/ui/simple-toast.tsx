"use client";

import { useCallback, useState } from "react";

interface ToastItem {
    id: string;
    message: string;
    variant: "success" | "error";
}

export function useToast() {
    const [items, setItems] = useState<ToastItem[]>([]);

    const showToast = useCallback(
        (message: string, variant: "success" | "error" = "success") => {
            const id = Math.random().toString(36).slice(2, 9);
            setItems((prev) => [...prev, { id, message, variant }]);
            setTimeout(() => {
                setItems((prev) => prev.filter((t) => t.id !== id));
            }, 3500);
        },
        [],
    );

    function Toaster() {
        if (items.length === 0) return null;
        return (
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {items.map((t) => (
                    <div
                        key={t.id}
                        role="status"
                        className={
                            "rounded-md border px-4 py-2.5 text-sm shadow-lg " +
                            (t.variant === "error"
                                ? "border-destructive/30 bg-destructive/10 text-destructive"
                                : "border-border bg-foreground text-background")
                        }
                    >
                        {t.message}
                    </div>
                ))}
            </div>
        );
    }

    return { showToast, Toaster };
}
