'use client'

import { useEffect, useState } from 'react'
import { supabase, formatBRL, type Funcionario } from '@/lib/supabase'

interface PagView {
  id: string
  funcionario_id: string
  valor_base: number
  valor_com_multiplicador: number
  status: string
  data_pagamento: string | null
  funcionarios: Funcionario
  metas_batidas: {
    meta: string
    data_batida: string
    data_vencimento: string
    multiplicador: number
    unidades: { id: string; nome: string }
  }
}

interface GrupoUnidade {
  unidade_id: string
  unidade_nome: string
  pagamentos: PagView[]
}

export default function TabPagamentos() {
  const [pagamentos, setPagamentos] = useState<PagView[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'pago'>('todos')
  const [filtroFunc, setFiltroFunc] = useState('')
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [salvando, setSalvando] = useState<string | null>(null)
  const [colapsados, setColapsados] = useState<Set<string>>(new Set())

  async function load() {
    const { data } = await supabase
      .from('pagamentos')
      .select('*, funcionarios(*), metas_batidas(meta, data_batida, data_vencimento, multiplicador, unidades(id, nome))')
      .order('created_at', { ascending: false })
    setPagamentos((data || []) as unknown as PagView[])
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

  function toggleColapso(id: string) {
    setColapsados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtrados = pagamentos.filter(p => {
    if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false
    if (filtroFunc && p.funcionario_id !== filtroFunc) return false
    return true
  })

  // Agrupar por unidade
  const grupos: GrupoUnidade[] = []
  filtrados.forEach(p => {
    const uid = p.metas_batidas?.unidades?.id || 'sem-unidade'
    const nome = p.metas_batidas?.unidades?.nome || 'Sem unidade'
    let grupo = grupos.find(g => g.unidade_id === uid)
    if (!grupo) { grupo = { unidade_id: uid, unidade_nome: nome, pagamentos: [] }; grupos.push(grupo) }
    grupo.pagamentos.push(p)
  })
  grupos.sort((a, b) => a.unidade_nome.localeCompare(b.unidade_nome))

  const totalFiltrado = filtrados.reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)
  const totalPendente = filtrados.filter(p => p.status === 'pendente').reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)
  const totalPago = filtrados.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)

  return (
    <div className="fade-in" style={{ width: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Gestão de Pagamentos</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>Marque os pagamentos como realizados e acompanhe o status por unidade.</p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
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

      {/* Cards resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 6 }}>Total</div>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--navy)' }}>{formatBRL(totalFiltrado)}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid var(--warning)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 6 }}>Pendente</div>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--warning)' }}>{formatBRL(totalPendente)}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid var(--success)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 6 }}>Pago</div>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--success)' }}>{formatBRL(totalPago)}</div>
        </div>
      </div>

      {/* Grupos por unidade */}
      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', paddingTop: 60 }} className="pulse-soft">Carregando...</div>
      ) : grupos.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Nenhum pagamento encontrado.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {grupos.map(grupo => {
            const colapso = colapsados.has(grupo.unidade_id)
            const totalUnidade = grupo.pagamentos.reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)
            const pendenteUnidade = grupo.pagamentos.filter(p => p.status === 'pendente').reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)
            const pagoUnidade = grupo.pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)

            return (
              <div key={grupo.unidade_id} className="card" style={{ overflow: 'hidden' }}>
                {/* Header da unidade */}
                <div
                  onClick={() => toggleColapso(grupo.unidade_id)}
                  style={{
                    padding: '14px 20px',
                    background: 'var(--navy)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 16 }}>🏫</span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#fff' }}>{grupo.unidade_nome}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{grupo.pagamentos.length} comissões</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 2 }}>Pendente</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>{formatBRL(pendenteUnidade)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 2 }}>Pago</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#34d399' }}>{formatBRL(pagoUnidade)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 2 }}>Total</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{formatBRL(totalUnidade)}</div>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, marginLeft: 8 }}>{colapso ? '▶' : '▼'}</div>
                  </div>
                </div>

                {/* Tabela */}
                {!colapso && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                          {['Funcionário', 'Meta', 'Vencimento', 'Batida', 'Mult.', 'Valor Base', 'Valor Final', 'Status', 'Ação'].map(h => (
                            <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.pagamentos.map((p, i) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'var(--surface2)' }}>
                            <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>{p.funcionarios?.nome}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                                background: p.metas_batidas?.meta === '<2%' ? '#dcfce7' : p.metas_batidas?.meta === '<3%' ? '#fef9c3' : '#dbeafe',
                                color: p.metas_batidas?.meta === '<2%' ? '#15803d' : p.metas_batidas?.meta === '<3%' ? '#92400e' : '#1d4ed8',
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
                                padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                                background: p.status === 'pago' ? '#dcfce7' : '#fef9c3',
                                color: p.status === 'pago' ? '#15803d' : '#92400e',
                              }}>{p.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}</span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {p.status === 'pendente' ? (
                                <button onClick={() => marcarPago(p.id)} disabled={salvando === p.id}
                                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: salvando === p.id ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                                  {salvando === p.id ? '...' : 'Marcar Pago'}
                                </button>
                              ) : (
                                <button onClick={() => marcarPendente(p.id)} disabled={salvando === p.id}
                                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: 12, cursor: 'pointer' }}>
                                  Desfazer
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
