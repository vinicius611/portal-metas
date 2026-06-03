'use client'

import { useEffect, useState } from 'react'
import { supabase, calcMultiplicador, formatBRL, type Unidade, type Funcionario, type Meta, type Comissao } from '@/lib/supabase'

const FUNCIONARIOS = ['Juliana', 'Nathália', 'Vinícius', 'Lucas Lodi']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
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
    supabase.from('unidades').select('*').order('nome').then(({ data }) => setUnidades(data || []))
  }, [])

  function getDataVencimento() {
    return `${form.ano_vencimento}-${form.mes_vencimento}-06`
  }

  useEffect(() => {
    if (!form.unidade_id || !form.data_batida) { setPreview([]); return }
    const dias = Math.round((new Date(form.data_batida).getTime() - new Date(getDataVencimento()).getTime()) / 86400000)
    const mult = calcMultiplicador(dias)
    supabase.from('comissoes').select('*, funcionarios(*)').eq('unidade_id', form.unidade_id).eq('meta', form.meta)
      .then(({ data }) => {
        setPreview(((data || []) as (Comissao & { funcionarios: Funcionario })[]).map(c => ({
          funcionario: c.funcionarios.nome,
          base: c.valor,
          final: Number((c.valor * mult).toFixed(2)),
        })))
      })
  }, [form.unidade_id, form.meta, form.mes_vencimento, form.ano_vencimento, form.data_batida])

  async function handleSubmit() {
    setErro(''); setSucesso('')
    if (!form.unidade_id || !form.data_batida || !form.criado_por) { setErro('Preencha todos os campos obrigatórios.'); return }
    setLoading(true)
    try {
      const dataVencimento = getDataVencimento()
      const { data: mb, error: mbErr } = await supabase.from('metas_batidas').insert({
        unidade_id: form.unidade_id, meta: form.meta,
        data_vencimento: dataVencimento, data_batida: form.data_batida,
        criado_por: form.criado_por, observacao: form.observacao || null,
      }).select().single()
      if (mbErr) throw mbErr
      const { data: comissoes, error: cErr } = await supabase.from('comissoes').select('*').eq('unidade_id', form.unidade_id).eq('meta', form.meta)
      if (cErr) throw cErr
      const dias = Math.round((new Date(form.data_batida).getTime() - new Date(dataVencimento).getTime()) / 86400000)
      const mult = calcMultiplicador(dias)
      const { error: pErr } = await supabase.from('pagamentos').insert(
        (comissoes || []).map((c: Comissao) => ({
          funcionario_id: c.funcionario_id, meta_batida_id: mb.id,
          valor_base: c.valor, valor_com_multiplicador: Number((c.valor * mult).toFixed(2)), status: 'pendente',
        }))
      )
      if (pErr) throw pErr
      setSucesso(`Meta registrada! ${(comissoes || []).length} pagamentos gerados.`)
      setForm(f => ({ ...f, unidade_id: '', data_batida: '', observacao: '', criado_por: '' }))
      setPreview([])
    } catch (e: unknown) {
      setErro('Erro: ' + (e as Error).message)
    } finally { setLoading(false) }
  }

  const dias = form.data_batida ? Math.round((new Date(form.data_batida).getTime() - new Date(getDataVencimento()).getTime()) / 86400000) : null
  const mult = dias !== null ? calcMultiplicador(dias) : null
  const mesLabel = MESES[parseInt(form.mes_vencimento) - 1]

  const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: 6 }

  return (
    <div className="fade-in" style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Registrar Meta Batida</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>Informe a unidade e a meta atingida para gerar as comissões automaticamente.</p>
      </div>

      <div className="card" style={{ padding: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <label>Unidade *</label>
            <select className="input" value={form.unidade_id} onChange={e => setForm(f => ({ ...f, unidade_id: e.target.value }))}>
              <option value="">Selecione a unidade...</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>

          <div style={fieldStyle}>
            <label>Meta Atingida *</label>
            <select className="input" value={form.meta} onChange={e => setForm(f => ({ ...f, meta: e.target.value as Meta }))}>
              <option value="<4%">Abaixo de 4% — Marco 1</option>
              <option value="<3%">Abaixo de 3% — Marco 2</option>
              <option value="<2%">Abaixo de 2% — Marco 3</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label>Registrado por *</label>
            <select className="input" value={form.criado_por} onChange={e => setForm(f => ({ ...f, criado_por: e.target.value }))}>
              <option value="">Selecione...</option>
              {FUNCIONARIOS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div style={fieldStyle}>
            <label>Mês de Vencimento *</label>
            <select className="input" value={form.mes_vencimento} onChange={e => setForm(f => ({ ...f, mes_vencimento: e.target.value }))}>
              {MESES.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
            </select>
          </div>

          <div style={fieldStyle}>
            <label>Ano de Vencimento *</label>
            <select className="input" value={form.ano_vencimento} onChange={e => setForm(f => ({ ...f, ano_vencimento: e.target.value }))}>
              {ANOS.map(a => <option key={a} value={String(a)}>{a}</option>)}
            </select>
          </div>

          <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <label>Data que a Meta foi Batida *</label>
            <input className="input" type="date" value={form.data_batida} onChange={e => setForm(f => ({ ...f, data_batida: e.target.value }))} />
          </div>

          <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <label>Observação</label>
            <textarea className="input" rows={2} placeholder="Notas adicionais..." value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
        </div>

        {/* Vencimento info */}
        {form.mes_vencimento && (
          <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af' }}>
            📅 Vencimento: <strong>dia 06 de {mesLabel} de {form.ano_vencimento}</strong>
          </div>
        )}

        {/* Multiplicador */}
        {dias !== null && mult !== null && (
          <div style={{
            marginTop: 10, padding: '12px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12,
            background: dias <= 40 ? '#f0fdf4' : dias <= 60 ? '#eff6ff' : dias <= 90 ? '#fffbeb' : '#fef2f2',
            border: `1px solid ${dias <= 40 ? '#86efac' : dias <= 60 ? '#bfdbfe' : dias <= 90 ? '#fde68a' : '#fecaca'}`,
          }}>
            <span style={{ fontSize: 20 }}>{dias <= 40 ? '🚀' : dias <= 60 ? '✅' : dias <= 90 ? '⚠️' : '🔻'}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {dias} dias após vencimento → Multiplicador {(mult * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {dias <= 40 ? 'Bônus de 25%' : dias <= 60 ? 'Valor integral' : dias <= 90 ? 'Desconto de 30%' : 'Desconto de 50%'}
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Preview de Comissões
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Funcionário', 'Valor Base', 'Valor Final'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map(p => (
                  <tr key={p.funcionario} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{p.funcionario}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{formatBRL(p.base)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--success)' }}>{formatBRL(p.final)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#eff6ff' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--accent)' }}>Total</td>
                  <td></td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--accent)' }}>{formatBRL(preview.reduce((s, p) => s + p.final, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {sucesso && <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', fontSize: 14 }}>✅ {sucesso}</div>}
        {erro && <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 14 }}>❌ {erro}</div>}

        <div style={{ marginTop: 24 }}>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Registrando...' : '🎯 Registrar Meta e Gerar Comissões'}
          </button>
        </div>
      </div>
    </div>
  )
}
