'use client'

import { useEffect, useState } from 'react'
import { supabase, calcMultiplicador, formatBRL, type Unidade, type Funcionario, type Meta, type Comissao } from '@/lib/supabase'

const FUNCIONARIOS = ['Juliana', 'Nathália', 'Vinícius', 'Lucas Lodi']

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const ANO_ATUAL = new Date().getFullYear()
const ANOS = [ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1]

export default function TabRegistrar() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [form, setForm] = useState({
    unidade_id: '',
    meta: '<4%' as Meta,
    mes_vencimento: String(new Date().getMonth() + 1).padStart(2, '0'),
    ano_vencimento: String(ANO_ATUAL),
    data_batida: '',
    criado_por: '',
    observacao: '',
  })
  const [preview, setPreview] = useState<{ funcionario: string; base: number; final: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase.from('unidades').select('*').order('nome').then(({ data }) => {
      setUnidades(data || [])
    })
  }, [])

  // Data de vencimento = dia 06 do mês/ano selecionado
  function getDataVencimento() {
    return `${form.ano_vencimento}-${form.mes_vencimento}-06`
  }

  useEffect(() => {
    if (!form.unidade_id || !form.data_batida) {
      setPreview([])
      return
    }
    const venc = new Date(getDataVencimento())
    const batida = new Date(form.data_batida)
    const dias = Math.round((batida.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24))
    const mult = calcMultiplicador(dias)

    supabase
      .from('comissoes')
      .select('*, funcionarios(*)')
      .eq('unidade_id', form.unidade_id)
      .eq('meta', form.meta)
      .then(({ data }) => {
        const comissoes = (data || []) as (Comissao & { funcionarios: Funcionario })[]
        setPreview(comissoes.map(c => ({
          funcionario: c.funcionarios.nome,
          base: c.valor,
          final: Number((c.valor * mult).toFixed(2)),
        })))
      })
  }, [form.unidade_id, form.meta, form.mes_vencimento, form.ano_vencimento, form.data_batida])

  async function handleSubmit() {
    setErro('')
    setSucesso('')
    if (!form.unidade_id || !form.data_batida || !form.criado_por) {
      setErro('Preencha todos os campos obrigatórios.')
      return
    }

    setLoading(true)
    try {
      const dataVencimento = getDataVencimento()

      const { data: mb, error: mbErr } = await supabase
        .from('metas_batidas')
        .insert({
          unidade_id: form.unidade_id,
          meta: form.meta,
          data_vencimento: dataVencimento,
          data_batida: form.data_batida,
          criado_por: form.criado_por,
          observacao: form.observacao || null,
        })
        .select()
        .single()

      if (mbErr) throw mbErr

      const { data: comissoes, error: cErr } = await supabase
        .from('comissoes')
        .select('*')
        .eq('unidade_id', form.unidade_id)
        .eq('meta', form.meta)

      if (cErr) throw cErr

      const venc = new Date(dataVencimento)
      const batida = new Date(form.data_batida)
      const dias = Math.round((batida.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24))
      const mult = calcMultiplicador(dias)

      const pagamentos = (comissoes || []).map((c: Comissao) => ({
        funcionario_id: c.funcionario_id,
        meta_batida_id: mb.id,
        valor_base: c.valor,
        valor_com_multiplicador: Number((c.valor * mult).toFixed(2)),
        status: 'pendente',
      }))

      const { error: pErr } = await supabase.from('pagamentos').insert(pagamentos)
      if (pErr) throw pErr

      setSucesso(`Meta registrada com sucesso! ${pagamentos.length} pagamentos gerados.`)
      setForm(f => ({ ...f, unidade_id: '', data_batida: '', observacao: '', criado_por: '' }))
      setPreview([])
    } catch (e: unknown) {
      setErro('Erro ao registrar: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const dias = form.data_batida
    ? Math.round((new Date(form.data_batida).getTime() - new Date(getDataVencimento()).getTime()) / 86400000)
    : null
  const mult = dias !== null ? calcMultiplicador(dias) : null
  const mesLabel = MESES[parseInt(form.mes_vencimento) - 1]

  return (
    <div className="fade-in" style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Registrar Meta Batida</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>Informe a unidade e a meta atingida para gerar as comissões automaticamente.</p>
      </div>

      <div className="card" style={{ padding: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Unidade */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Unidade *</label>
            <select className="input" value={form.unidade_id} onChange={e => setForm(f => ({ ...f, unidade_id: e.target.value }))}>
              <option value="">Selecione a unidade...</option>
              {unidades.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          {/* Meta */}
          <div>
            <label>Meta Atingida *</label>
            <select className="input" value={form.meta} onChange={e => setForm(f => ({ ...f, meta: e.target.value as Meta }))}>
              <option value="<4%">Abaixo de 4% — Marco 1</option>
              <option value="<3%">Abaixo de 3% — Marco 2</option>
              <option value="<2%">Abaixo de 2% — Marco 3</option>
            </select>
          </div>

          {/* Registrado por */}
          <div>
            <label>Registrado por *</label>
            <select className="input" value={form.criado_por} onChange={e => setForm(f => ({ ...f, criado_por: e.target.value }))}>
              <option value="">Selecione...</option>
              {FUNCIONARIOS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Período de vencimento */}
          <div>
            <label>Mês de Vencimento *</label>
            <select className="input" value={form.mes_vencimento} onChange={e => setForm(f => ({ ...f, mes_vencimento: e.target.value }))}>
              {MESES.map((m, i) => (
                <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Ano de Vencimento *</label>
            <select className="input" value={form.ano_vencimento} onChange={e => setForm(f => ({ ...f, ano_vencimento: e.target.value }))}>
              {ANOS.map(a => (
                <option key={a} value={String(a)}>{a}</option>
              ))}
            </select>
          </div>

          {/* Data batida */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Data que a Meta foi Batida *</label>
            <input className="input" type="date" value={form.data_batida} onChange={e => setForm(f => ({ ...f, data_batida: e.target.value }))} />
          </div>

          {/* Observação */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Observação</label>
            <textarea className="input" rows={2} placeholder="Notas adicionais..." value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
        </div>

        {/* Info vencimento */}
        {form.mes_vencimento && form.ano_vencimento && (
          <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', fontSize: 13, color: 'var(--muted)' }}>
            📅 Vencimento considerado: <strong style={{ color: 'var(--text)' }}>dia 06 de {mesLabel} de {form.ano_vencimento}</strong>
          </div>
        )}

        {/* Multiplicador indicator */}
        {dias !== null && mult !== null && (
          <div style={{
            marginTop: 12,
            padding: '12px 16px',
            borderRadius: 8,
            background: dias <= 40 ? 'rgba(52,211,153,0.1)' : dias <= 60 ? 'rgba(79,142,247,0.1)' : dias <= 90 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${dias <= 40 ? '#34d399' : dias <= 60 ? '#4f8ef7' : dias <= 90 ? '#fbbf24' : '#f87171'}40`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>{dias <= 40 ? '🚀' : dias <= 60 ? '✅' : dias <= 90 ? '⚠️' : '🔻'}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {dias} dias após vencimento → Multiplicador {(mult * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {dias <= 40 ? 'Excelente! Bônus de 25% sobre a meta.' : dias <= 60 ? 'Dentro do prazo normal.' : dias <= 90 ? 'Desconto de 30% aplicado.' : 'Desconto de 50% aplicado.'}
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Preview de Comissões Geradas
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {preview.map(p => (
                <div key={p.funcionario} className="card2" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 500 }}>{p.funcionario}</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>{formatBRL(p.final)}</div>
                    {mult !== 1 && <div style={{ fontSize: 11, color: 'var(--muted)' }}>Base: {formatBRL(p.base)}</div>}
                  </div>
                </div>
              ))}
              <div className="card2" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: 'var(--accent)' }}>
                <div style={{ fontWeight: 600, color: 'var(--accent)' }}>Total</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
                  {formatBRL(preview.reduce((s, p) => s + p.final, 0))}
                </div>
              </div>
            </div>
          </div>
        )}

        {sucesso && (
          <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(52,211,153,0.1)', border: '1px solid #34d39940', color: '#34d399', fontSize: 14 }}>
            ✅ {sucesso}
          </div>
        )}
        {erro && (
          <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', border: '1px solid #f8717140', color: '#f87171', fontSize: 14 }}>
            ❌ {erro}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Registrando...' : '🎯 Registrar Meta e Gerar Comissões'}
          </button>
        </div>
      </div>
    </div>
  )
}
