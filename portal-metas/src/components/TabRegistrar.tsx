'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase, calcMultiplicador, formatBRL, type Unidade, type Funcionario, type Meta, type Comissao } from '@/lib/supabase'

const FUNCIONARIOS = ['Juliana', 'Nathália', 'Vinícius', 'Lucas Lodi']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const ANO_ATUAL = new Date().getFullYear()
const ANOS = [ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1]

interface Props {
  // Preenchido quando a pessoa vem de "Registrar agora" na barra de sinalizações
  // (vindas do Portal de Cobrança). Só a unidade, a meta e a data batida vêm prontas —
  // o mês/ano de vencimento continuam em branco de propósito, porque a sinalização
  // não informa isso, e é ele que decide o multiplicador da comissão.
  prefill?: { unidadeSigla: string; meta: string; dataBatida: string } | null
}

export default function TabRegistrar({ prefill }: Props) {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const prefillApplied = useRef(false)
  const [prefilledAgora, setPrefilledAgora] = useState(false)
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

  useEffect(() => {
    if (!prefill || prefillApplied.current || unidades.length === 0) return
    const u = unidades.find((x) => x.sigla === prefill.unidadeSigla)
    if (!u) return
    prefillApplied.current = true
    setPrefilledAgora(true)
    setForm((f) => ({ ...f, unidade_id: u.id, meta: prefill.meta as Meta, data_batida: prefill.dataBatida }))
  }, [prefill, unidades])

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

  return (
    <div className="fade-in" style={{ width: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Registrar Meta Batida</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>Informe a unidade e a meta atingida para gerar as comissões automaticamente.</p>
      </div>

      {prefilledAgora && (
        <div style={{
          marginBottom: 20, padding: '12px 16px', borderRadius: 8,
          background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: 13,
        }}>
          🚩 Unidade, meta e data preenchidas a partir de uma sinalização do Portal de Cobrança. Confira o <strong>mês/ano de vencimento</strong> abaixo antes de registrar — é isso que define o multiplicador.
        </div>
      )}

      <div className="card" style={{ padding: 32 }}>
        {/* Linha 1: Unidade (full width) */}
        <div style={{ marginBottom: 20 }}>
          <label>Unidade *</label>
          <select className="input" value={form.unidade_id} onChange={e => setForm(f => ({ ...f, unidade_id: e.target.value }))}>
            <option value="">Selecione a unidade...</option>
            {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>

        {/* Linha 2: Meta + Registrado por */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
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

        {/* Linha 3: Mês + Ano + Data batida */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
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
          <div>
            <label>Data que a Meta foi Batida *</label>
            <input className="input" type="date" value={form.data_batida} onChange={e => setForm(f => ({ ...f, data_batida: e.target.value }))} />
          </div>
        </div>

        {/* Linha 4: Observação */}
        <div style={{ marginBottom: 20 }}>
          <label>Observação</label>
          <textarea className="input" rows={2} placeholder="Notas adicionais..." value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} style={{ resize: 'vertical' }} />
        </div>

        {/* Multiplicador discreto */}
        {dias !== null && mult !== null && (
          <div style={{
            marginBottom: 20, padding: '10px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
            background: dias <= 40 ? '#f0fdf4' : dias <= 60 ? '#eff6ff' : dias <= 90 ? '#fffbeb' : '#fef2f2',
            border: `1px solid ${dias <= 40 ? '#86efac' : dias <= 60 ? '#bfdbfe' : dias <= 90 ? '#fde68a' : '#fecaca'}`,
            fontSize: 13,
          }}>
            <span>{dias <= 40 ? '🚀' : dias <= 60 ? '✅' : dias <= 90 ? '⚠️' : '🔻'}</span>
            <span style={{ color: 'var(--text)' }}>
              <strong>{dias} dias</strong> após vencimento →
              Multiplicador <strong style={{ color: dias <= 40 ? '#16a34a' : dias <= 60 ? '#2563eb' : dias <= 90 ? '#d97706' : '#dc2626' }}>{(mult * 100).toFixed(0)}%</strong>
            </span>
          </div>
        )}

        {/* Preview de comissões */}
        {preview.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Preview de Comissões
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                  {['Funcionário', 'Valor Base', 'Valor Final'].map(h => (
                    <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((p, i) => (
                  <tr key={p.funcionario} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'var(--surface2)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>{p.funcionario}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--muted)' }}>{formatBRL(p.base)}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--success)' }}>{formatBRL(p.final)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#eff6ff', borderTop: '2px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--accent)' }} colSpan={2}>Total</td>
                  <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>{formatBRL(preview.reduce((s, p) => s + p.final, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {sucesso && <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', fontSize: 14 }}>✅ {sucesso}</div>}
        {erro && <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 14 }}>❌ {erro}</div>}

        <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ padding: '12px 32px' }}>
          {loading ? 'Registrando...' : '🎯 Registrar Meta e Gerar Comissões'}
        </button>
      </div>
    </div>
  )
}
