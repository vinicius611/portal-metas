'use client'

import { useEffect, useState } from 'react'
import { supabase, formatBRL, type Pagamento, type Funcionario } from '@/lib/supabase'

interface PagView extends Pagamento {
  funcionarios: Funcionario
  metas_batidas: {
    meta: string
    data_batida: string
    data_vencimento: string
    multiplicador: number
    unidades: { nome: string }
  }
}

export default function TabPagamentos() {
  const [pagamentos, setPagamentos] = useState<PagView[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'pago'>('todos')
  const [filtroFunc, setFiltroFunc] = useState('')
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [salvando, setSalvando] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase
      .from('pagamentos')
      .select('*, funcionarios(*), metas_batidas(meta, data_batida, data_vencimento, multiplicador, unidades(nome))')
      .order('created_at', { ascending: false })
    setPagamentos((data || []) as PagView[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('funcionarios').select('*').order('nome').then(({ data }) => setFuncionarios(data || []))
  }, [])

  async function marcarPago(id: string) {
    setSalvando(id)
    await supabase.from('pagamentos').update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] }).eq('id', id)
    await load()
    setSalvando(null)
  }

  async function marcarPendente(id: string) {
    setSalvando(id)
    await supabase.from('pagamentos').update({ status: 'pendente', data_pagamento: null }).eq('id', id)
    await load()
    setSalvando(null)
  }

  const filtrados = pagamentos.filter(p => {
    if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false
    if (filtroFunc && p.funcionario_id !== filtroFunc) return false
    return true
  })

  const totalFiltrado = filtrados.reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)
  const totalPendente = filtrados.filter(p => p.status === 'pendente').reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)
  const totalPago = filtrados.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Gestão de Pagamentos</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>Marque os pagamentos como realizados e acompanhe o status da equipe.</p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <label>Status</label>
          <select className="input" style={{ width: 'auto' }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as 'todos' | 'pendente' | 'pago')}>
            <option value="todos">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </select>
        </div>
        <div>
          <label>Funcionário</label>
          <select className="input" style={{ width: 'auto' }} value={filtroFunc} onChange={e => setFiltroFunc(e.target.value)}>
            <option value="">Todos</option>
            {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 500, marginBottom: 6 }}>Total</div>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{formatBRL(totalFiltrado)}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 500, marginBottom: 6 }}>Pendente</div>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--warning)' }}>{formatBRL(totalPendente)}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 500, marginBottom: 6 }}>Pago</div>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--success)' }}>{formatBRL(totalPago)}</div>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', paddingTop: 60 }} className="pulse-soft">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          Nenhum pagamento encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Funcionário', 'Unidade', 'Meta', 'Vencimento', 'Batida', 'Mult.', 'Valor Base', 'Valor Final', 'Status', 'Ação'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500 }}>{p.funcionarios?.nome}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{p.metas_batidas?.unidades?.nome}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: p.metas_batidas?.meta === '<2%' ? 'rgba(52,211,153,0.15)' : p.metas_batidas?.meta === '<3%' ? 'rgba(251,191,36,0.15)' : 'rgba(79,142,247,0.15)',
                        color: p.metas_batidas?.meta === '<2%' ? '#34d399' : p.metas_batidas?.meta === '<3%' ? '#fbbf24' : '#4f8ef7',
                      }}>{p.metas_batidas?.meta}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {p.metas_batidas?.data_vencimento ? new Date(p.metas_batidas.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {p.metas_batidas?.data_batida ? new Date(p.metas_batidas.data_batida + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: Number(p.metas_batidas?.multiplicador) >= 1 ? 'var(--success)' : 'var(--warning)' }}>
                      ×{p.metas_batidas?.multiplicador}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{formatBRL(Number(p.valor_base))}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700 }}>{formatBRL(Number(p.valor_com_multiplicador))}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: p.status === 'pago' ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)',
                        color: p.status === 'pago' ? '#34d399' : '#fbbf24',
                      }}>{p.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {p.status === 'pendente' ? (
                        <button
                          onClick={() => marcarPago(p.id)}
                          disabled={salvando === p.id}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 6,
                            border: 'none',
                            background: 'var(--success)',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            opacity: salvando === p.id ? 0.5 : 1,
                          }}
                        >
                          {salvando === p.id ? '...' : 'Marcar Pago'}
                        </button>
                      ) : (
                        <button
                          onClick={() => marcarPendente(p.id)}
                          disabled={salvando === p.id}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--muted)',
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          Desfazer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
