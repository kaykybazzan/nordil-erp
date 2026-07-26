import type { Cliente, Endereco } from "@/types/domain"

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB",
  "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]

export { UFS }

/** Remove tudo que não é dígito. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "")
}

/**
 * Formata documento conforme o número de dígitos:
 * 11 dígitos => CPF (000.000.000-00), 14 => CNPJ (00.000.000/0000-00).
 * Enquanto incompleto, aplica a máscara parcial adequada.
 */
export function formatDocumento(value: string): string {
  const d = onlyDigits(value).slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5")
}

export function tipoDocumento(value: string): "CPF" | "CNPJ" {
  return onlyDigits(value).length > 11 ? "CNPJ" : "CPF"
}

export function formatCep(value: string): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2")
}

export function formatDataCadastro(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function novoEnderecoVazio(): Endereco {
  return {
    id: `end-${Math.random().toString(36).slice(2, 9)}`,
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    uf: "",
    cep: "",
    principal: false,
  }
}

export const MOCK_CLIENTES: Cliente[] = [
  {
    id: "cli-001",
    empresaId: "emp-001",
    nome: "Metalúrgica Sul Ltda",
    documento: "12.345.678/0001-90",
    status: "ativo",
    dataCadastro: "2024-03-12",
    enderecos: [
      {
        id: "end-1",
        logradouro: "Av. Industrial",
        numero: "1420",
        bairro: "Distrito Industrial",
        cidade: "Caxias do Sul",
        uf: "RS",
        cep: "95050-000",
        principal: true,
      },
      {
        id: "end-2",
        logradouro: "Rua das Oficinas",
        numero: "88",
        bairro: "São Ciro",
        cidade: "Caxias do Sul",
        uf: "RS",
        cep: "95040-100",
        principal: false,
      },
    ],
  },
  {
    id: "cli-002",
    empresaId: "emp-001",
    nome: "Comercial Vitória EIRELI",
    documento: "98.765.432/0001-10",
    status: "ativo",
    dataCadastro: "2024-05-28",
    enderecos: [
      {
        id: "end-3",
        logradouro: "Rua do Comércio",
        numero: "305",
        bairro: "Centro",
        cidade: "Vitória",
        uf: "ES",
        cep: "29010-000",
        principal: true,
      },
    ],
  },
  {
    id: "cli-003",
    empresaId: "emp-001",
    nome: "João Batista Pereira",
    documento: "123.456.789-09",
    status: "bloqueado",
    dataCadastro: "2023-11-04",
    enderecos: [
      {
        id: "end-4",
        logradouro: "Rua Sete de Setembro",
        numero: "212",
        bairro: "Vila Nova",
        cidade: "Curitiba",
        uf: "PR",
        cep: "80020-310",
        principal: true,
      },
    ],
  },
  {
    id: "cli-004",
    empresaId: "emp-001",
    nome: "Distribuidora Norte Alimentos S.A.",
    documento: "45.678.901/0001-33",
    status: "ativo",
    dataCadastro: "2025-01-19",
    enderecos: [
      {
        id: "end-5",
        logradouro: "Rodovia BR-316, km 8",
        numero: "s/n",
        bairro: "Coqueiro",
        cidade: "Ananindeua",
        uf: "PA",
        cep: "67130-000",
        principal: true,
      },
    ],
  },
  {
    id: "cli-005",
    empresaId: "emp-001",
    nome: "Ana Carolina Menezes",
    documento: "987.654.321-00",
    status: "ativo",
    dataCadastro: "2025-02-02",
    enderecos: [
      {
        id: "end-6",
        logradouro: "Alameda das Palmeiras",
        numero: "77",
        bairro: "Jardim América",
        cidade: "Goiânia",
        uf: "GO",
        cep: "74815-320",
        principal: true,
      },
    ],
  },
  {
    id: "cli-006",
    empresaId: "emp-001",
    nome: "Ferragens União Ltda",
    documento: "33.444.555/0001-66",
    status: "bloqueado",
    dataCadastro: "2024-08-15",
    enderecos: [
      {
        id: "end-7",
        logradouro: "Rua dos Ferreiros",
        numero: "540",
        bairro: "Cidade Industrial",
        cidade: "Contagem",
        uf: "MG",
        cep: "32110-090",
        principal: true,
      },
    ],
  },
  {
    id: "cli-007",
    empresaId: "emp-001",
    nome: "Auto Peças Litoral ME",
    documento: "22.111.000/0001-45",
    status: "ativo",
    dataCadastro: "2025-03-21",
    enderecos: [
      {
        id: "end-8",
        logradouro: "Av. Beira Mar",
        numero: "1200",
        bairro: "Praia Grande",
        cidade: "Florianópolis",
        uf: "SC",
        cep: "88015-700",
        principal: true,
      },
    ],
  },
  {
    id: "cli-008",
    empresaId: "emp-001",
    nome: "Roberto Camargo Instalações",
    documento: "456.789.123-55",
    status: "ativo",
    dataCadastro: "2025-04-09",
    enderecos: [
      {
        id: "end-9",
        logradouro: "Rua Projetada A",
        numero: "15",
        bairro: "Parque Industrial",
        cidade: "Sorocaba",
        uf: "SP",
        cep: "18085-000",
        principal: true,
      },
    ],
  },
]
