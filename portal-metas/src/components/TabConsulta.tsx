'use client'

import { useEffect, useState } from 'react'
import { supabase, formatBRL, type Funcionario } from '@/lib/supabase'

interface MetaBatidaView {
  meta: string
  data_batida: string
  data_vencimento: string
  multiplicador: number
  unidades: { nome: string; sigla: string }
}

interface PagView {
  id: string
  valor_base: number
  valor_com_multiplicador: number
  status: string
  data_pagamento: string | null
  metas_batidas: MetaBatidaView
}

export default function TabConsulta() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [selecionado, setSelecionado] = useState('')
  const [pagamentos, setPagamentos] = useState<PagView[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('funcionarios').select('*').order('nome').then(({ data }) => setFuncionarios(data || []))
  }, [])

  useEffect(() => {
    if (!selecionado) { setPagamentos([]); return }
    setLoading(true)
    supabase
      .from('pagamentos')
      .select('id, valor_base, valor_com_multiplicador, status, data_pagamento, metas_batidas(meta, data_batida, data_vencimento, multiplicador, unidades(nome, sigla))')
      .eq('funcionario_id', selecionado)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPagamentos((data || []) as unknown as PagView[])
        setLoading(false)
      })
  }, [selecionado])

  const totalPendente = pagamentos.filter(p => p.status === 'pendente').reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)
  const totalPago = pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)
  const totalGeral = pagamentos.reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)
  const funcNome = funcionarios.find(f => f.id === selecionado)?.nome

  return (
    <div className="fade-in" style={{ width: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Consulta do Funcionário</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>Veja os valores a receber e o histórico de comissões.</p>
      </div>

      {/* Seleção de funcionário */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
          Selecione seu nome
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {funcionarios.map(f => (
            <button
              key={f.id}
              onClick={() => setSelecionado(f.id)}
              style={{
                padding: '10px 28px',
                borderRadius: 8,
                border: selecionado === f.id ? 'none' : '1px solid var(--border)',
                background: selecionado === f.id ? 'var(--accent)' : 'var(--surface)',
                color: selecionado === f.id ? '#fff' : 'var(--text)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: selecionado === f.id ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
              }}
            >
              {f.nome}
            </button>
          ))}
        </div>
      </div>

      {selecionado && (
        <>
          {/* Cards resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            <div className="card" style={{ padding: '18px 22px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>Total Gerado</div>
              <div style={{ fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--navy)' }}>{formatBRL(totalGeral)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{pagamentos.length} comissões</div>
            </div>
            <div className="card" style={{ padding: '18px 22px', borderTop: '3px solid var(--warning)' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>A Receber</div>
              <div style={{ fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--warning)' }}>{formatBRL(totalPendente)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{pagamentos.filter(p => p.status === 'pendente').length} pendentes</div>
            </div>
            <div className="card" style={{ padding: '18px 22px', borderTop: '3px solid var(--success)' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>Já Recebido</div>
              <div style={{ fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--success)' }}>{formatBRL(totalPago)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{pagamentos.filter(p => p.status === 'pago').length} pagamentos</div>
            </div>
          </div>

          {/* Tabela */}
          {loading ? (
            <div style={{ color: 'var(--muted)', textAlign: 'center', paddingTop: 40 }} className="pulse-soft">Carregando...</div>
          ) : pagamentos.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              Nenhuma comissão registrada para {funcNome} ainda.
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>
                  Histórico de Comissões — {funcNome}
                </h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                      {['Unidade', 'Meta', 'Vencimento', 'Batida', 'Mult.', 'Valor Base', 'Valor Final', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagamentos.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'var(--surface2)' }}>
                        <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500 }}>{p.metas_batidas?.unidades?.nome}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!selecionado && (
        <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👆</div>
          <div style={{ fontSize: 15 }}>Selecione seu nome acima para ver suas comissões</div>
        </div>
      )}
    </div>
  )
}
