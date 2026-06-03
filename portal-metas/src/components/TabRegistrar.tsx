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

  return (
    <div className="fade-in" style={{ width: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Registrar Meta Batida</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>Informe a unidade e a meta atingida para gerar as comissões automaticamente.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* Formulário — coluna esquerda */}
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 20 }}>Dados da Meta</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <label>Unidade *</label>
              <select className="input" value={form.unidade_id} onChange={e => setForm(f => ({ ...f, unidade_id: e.target.value }))}>
                <option value="">Selecione a unidade...</option>
                {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Meta Atingida *</label>
                <select className="input" value={form.meta} onChange={e => setForm(f => ({ ...f, meta: e.target.value as Meta }))}>
                  <option value="<4%">Abaixo de 4% — Marco 1</option>
                  <option value="<3%">Abaixo de 3% — Marco 2</option>
                  <option value="<2%">Abaixo de 2% — Marco 3</option>
                </select>
              </div>
              <div>
                <label>Registrado por *</label>
                <select className="input" value={form.criado_por} onChange={e => setForm(f => ({ ...f, criado_por: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {FUNCIONARIOS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Mês de Vencimento *</label>
                <select className="input" value={form.mes_vencimento} onChange={e => setForm(f => ({ ...f, mes_vencimento: e.target.value }))}>
                  {MESES.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
                </select>
              </div>
              <div>
                <label>Ano *</label>
                <select className="input" value={form.ano_vencimento} onChange={e => setForm(f => ({ ...f, ano_vencimento: e.target.value }))}>
                  {ANOS.map(a => <option key={a} value={String(a)}>{a}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label>Data que a Meta foi Batida *</label>
              <input className="input" type="date" value={form.data_batida} onChange={e => setForm(f => ({ ...f, data_batida: e.target.value }))} />
            </div>

            <div>
              <label>Observação</label>
              <textarea className="input" rows={3} placeholder="Notas adicionais..." value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>

            {sucesso && <div style={{ padding: '12px 16px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', fontSize: 14 }}>✅ {sucesso}</div>}
            {erro && <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 14 }}>❌ {erro}</div>}

            <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '12px' }}>
              {loading ? 'Registrando...' : '🎯 Registrar Meta e Gerar Comissões'}
            </button>
          </div>
        </div>

        {/* Painel direito */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Info vencimento + multiplicador */}
          <div className="card" style={{ padding: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>Cálculo de Prazo</h2>

            {form.mes_vencimento && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af', marginBottom: 12 }}>
                📅 Vencimento: <strong>dia 06 de {mesLabel} de {form.ano_vencimento}</strong>
              </div>
            )}

            {dias !== null && mult !== null ? (
              <div style={{
                padding: '14px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12,
                background: dias <= 40 ? '#f0fdf4' : dias <= 60 ? '#eff6ff' : dias <= 90 ? '#fffbeb' : '#fef2f2',
                border: `1px solid ${dias <= 40 ? '#86efac' : dias <= 60 ? '#bfdbfe' : dias <= 90 ? '#fde68a' : '#fecaca'}`,
              }}>
                <span style={{ fontSize: 24 }}>{dias <= 40 ? '🚀' : dias <= 60 ? '✅' : dias <= 90 ? '⚠️' : '🔻'}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{(mult * 100).toFixed(0)}% do valor</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{dias} dias após vencimento</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {dias <= 40 ? 'Bônus de 25%' : dias <= 60 ? 'Valor integral' : dias <= 90 ? 'Desconto de 30%' : 'Desconto de 50%'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '14px 16px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                Selecione a data batida para ver o multiplicador
              </div>
            )}

            {/* Tabela de referência */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Até 40 dias', mult: '125%', color: '#16a34a' },
                { label: 'Até 60 dias', mult: '100%', color: '#2563eb' },
                { label: 'Até 90 dias', mult: '70%',  color: '#d97706' },
                { label: 'Acima de 90', mult: '50%',  color: '#dc2626' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 6, background: 'var(--surface2)', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>{r.label}</span>
                  <span style={{ fontWeight: 700, color: r.color }}>{r.mult}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview comissões */}
          {preview.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Preview de Comissões</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    {['Funcionário', 'Base', 'Final'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map(p => (
                    <tr key={p.funcionario} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px', fontWeight: 500, fontSize: 14 }}>{p.funcionario}</td>
                      <td style={{ padding: '10px', color: 'var(--muted)', fontSize: 13 }}>{formatBRL(p.base)}</td>
                      <td style={{ padding: '10px', fontWeight: 700, color: 'var(--success)', fontSize: 14 }}>{formatBRL(p.final)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#eff6ff' }}>
                    <td style={{ padding: '10px', fontWeight: 700, color: 'var(--accent)', fontSize: 14 }} colSpan={2}>Total</td>
                    <td style={{ padding: '10px', fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>{formatBRL(preview.reduce((s, p) => s + p.final, 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
