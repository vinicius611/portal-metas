import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Types ────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────
export function calcMultiplicador(diasAtraso: number): number {
  if (diasAtraso <= 40) return 1.25
  if (diasAtraso <= 60) return 1.00
  if (diasAtraso <= 90) return 0.70
  return 0.50
}

export function labelMultiplicador(m: number): string {
  if (m === 1.25) return '125% — até 40 dias'
  if (m === 1.00) return '100% — até 60 dias'
  if (m === 0.70) return '70% — até 90 dias'
  return '50% — acima de 90 dias'
}

export function corMeta(meta: Meta) {
  if (meta === '<2%') return { bg: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-800' }
  if (meta === '<3%') return { bg: 'bg-amber-500', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-800' }
  return { bg: 'bg-blue-500', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-800' }
}

export function formatBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
