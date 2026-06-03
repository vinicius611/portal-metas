import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bokibvpcdyqviolqrirb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJva2lidnBjZHlxdmlvbHFyaXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0Njg2MTcsImV4cCI6MjA5NjA0NDYxN30.XdbOFEK1kOJeAcLCBG9XIDZdFsRC7tRJpLSGi5KMqwg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Meta = '<4%' | '<3%' | '<2%'
export type StatusPagamento = 'pendente' | 'pago'

export interface Funcionario {
  id: string
  nome: string
  email?: string
}

export interface Unidade {
  id: string
  sigla: string
  nome: string
}

export interface Comissao {
  id: string
  funcionario_id: string
  unidade_id: string
  meta: Meta
  valor: number
}

export interface MetaBatida {
  id: string
  unidade_id: string
  meta: Meta
  data_vencimento: string
  data_batida: string
  dias_atraso: number
  multiplicador: number
  observacao?: string
  criado_por?: string
  created_at: string
  unidades?: Unidade
}

export interface Pagamento {
  id: string
  funcionario_id: string
  meta_batida_id: string
  valor_base: number
  valor_com_multiplicador: number
  status: StatusPagamento
  data_pagamento?: string
  observacao?: string
  created_at: string
  funcionarios?: Funcionario
  metas_batidas?: MetaBatida & { unidades?: Unidade }
}

export function calcMultiplicador(diasAtraso: number): number {
  if (diasAtraso <= 40) return 1.25
  if (diasAtraso <= 60) return 1.00
  if (diasAtraso <= 90) return 0.70
  return 0.50
}

export function formatBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
