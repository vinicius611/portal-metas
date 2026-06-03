'use client'

import { useEffect, useState } from 'react'
import { supabase, formatBRL, type Funcionario } from '@/lib/supabase'

interface PagView {
  id: string
  valor_base: number
  valor_com_multiplicador: number
  status: string
  data_pagamento: string | null
  metas_batidas: {
    meta: string
    data_batida: string
    data_vencimento: string
    multiplicador: number
    unidades: { nome: string; sigla: string }
  }
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
        setPagamentos((data || []) as PagView[])
        setLoading(false)
      })
  }, [selecionado])

  const totalPendente = pagamentos.filter(p => p.status === 'pendente').reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)
  const totalPago = pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)
  const totalGeral = pagamentos.reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)

  const funcNome = funcionarios.find(f => f.id === selecionado)?.nome

  return (
    <div className="fade-in" style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Consulta do Funcionário</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>Veja os valores a receber e o histórico de comissões.</p>
      </div>

      {/* Seleção */}
      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <label>Selecione seu nome</label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {funcionarios.map(f => (
            <button
              key={f.id}
              onClick={() => setSelecionado(f.id)}
              style={{
                padding: '12px 28px',
                borderRadius: 10,
                border: selecionado === f.id ? 'none' : '1px solid var(--border)',
                background: selecionado === f.id ? 'var(--accent)' : 'var(--surface2)',
                color: selecionado === f.id ? '#fff' : 'var(--text)',
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f.nome}
            </button>
          ))}
        </div>
      </div>

      {selecionado && (
        <>
          {/* Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            <div className="card" style={{ padding: '18px 22px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 500, marginBottom: 6 }}>Total Gerado</div>
              <div style={{ fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{formatBRL(totalGeral)}</div>
            </div>
            <div className="card" style={{ padding: '18px 22px', borderColor: 'rgba(251,191,36,0.3)' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 500, marginBottom: 6 }}>A Receber</div>
              <div style={{ fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--warning)' }}>{formatBRL(totalPendente)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{pagamentos.filter(p => p.status === 'pendente').length} pendentes</div>
            </div>
            <div className="card" style={{ padding: '18px 22px', borderColor: 'rgba(52,211,153,0.3)' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 500, marginBottom: 6 }}>Já Recebido</div>
              <div style={{ fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--success)' }}>{formatBRL(totalPago)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{pagamentos.filter(p => p.status === 'pago').length} pagamentos</div>
            </div>
          </div>

          {/* Histórico */}
          {loading ? (
            <div style={{ color: 'var(--muted)', textAlign: 'center', paddingTop: 40 }} className="pulse-soft">Carregando...</div>
          ) : pagamentos.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              Nenhuma comissão registrada para {funcNome} ainda.
            </div>
          ) : (
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
                Histórico de Comissões — {funcNome}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pagamentos.map(p => (
                  <div key={p.id} className="card2" style={{
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderLeft: `3px solid ${p.status === 'pago' ? 'var(--success)' : 'var(--warning)'}`,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                        {p.metas_batidas?.unidades?.nome}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span>Meta: <strong style={{ color: 'var(--text)' }}>{p.metas_batidas?.meta}</strong></span>
                        <span>Batida em: <strong style={{ color: 'var(--text)' }}>
                          {p.metas_batidas?.data_batida ? new Date(p.metas_batidas.data_batida + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                        </strong></span>
                        <span>Multiplicador: <strong style={{ color: 'var(--text)' }}>×{p.metas_batidas?.multiplicador}</strong></span>
                      </div>
                      {p.status === 'pago' && p.data_pagamento && (
                        <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>
                          ✓ Pago em {new Date(p.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: 16 }}>
                      <div style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 700, color: p.status === 'pago' ? 'var(--success)' : 'var(--warning)' }}>
                        {formatBRL(Number(p.valor_com_multiplicador))}
                      </div>
                      {Number(p.metas_batidas?.multiplicador) !== 1 && (
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          Base: {formatBRL(Number(p.valor_base))}
                        </div>
                      )}
                      <div style={{ marginTop: 6 }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 600,
                          background: p.status === 'pago' ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)',
                          color: p.status === 'pago' ? '#34d399' : '#fbbf24',
                        }}>{p.status === 'pago' ? 'Pago' : 'Pendente'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!selecionado && (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>👆</div>
          <div style={{ fontSize: 16 }}>Selecione seu nome acima para ver suas comissões</div>
        </div>
      )}
    </div>
  )
}
