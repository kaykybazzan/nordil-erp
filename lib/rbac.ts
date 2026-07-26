import type { Usuario } from "@/types/domain"

export function getHomeRoute(usuario: Usuario): string {
    if (usuario.role === "ADMIN" || usuario.role === "SUPERVISOR") {
        return "/dashboard"
    }


    switch (usuario.funcao) {
        case "VENDAS":
            return "/pedidos/novo"
        case "ESTOQUE":
            return "/estoque"
        case "SEPARACAO":
            return "/separacao"
        case "CONFERENCIA":
            return "/conferencia"
        case "EXPEDICAO":
            return "/expedicao"
        case "ADMINISTRATIVO":
        default:
            return "/dashboard"
    }
}