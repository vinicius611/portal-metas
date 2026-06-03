'use client'

import { useEffect, useState } from 'react'
import { supabase, formatBRL, type Pagamento, type MetaBatida, type Unidade } from '@/lib/supabase'

interface Stat { label: string; value: string; sub?: string; color?: string }

export default function TabDashboard() {
  const [stats, setStats] = useState<Stat[]>([])
  const [recentes, setRecentes] = useState<(MetaBatida & { unidades?: Unidade })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: pagamentos }, { data: metas }] = await Promise.all([
        supabase.from('pagamentos').select('*'),
        supabase.from('metas_batidas').select('*, unidades(*)').order('created_at', { ascending: false }).limit(5),
      ])

      const pags = (pagamentos || []) as Pagamento[]
      const total = pags.reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)
      const pago = pags.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor_com_multiplicador), 0)
      const pendente = total - pago

      setStats([
        { label: 'Total Comissões Geradas', value: formatBRL(total), color: 'var(--accent)' },
        { label: 'Já Pago', value: formatBRL(pago), color: 'var(--success)', sub: `${pags.filter(p => p.status === 'pago').length} pagamentos` },
        { label: 'Pendente a Pagar', value: formatBRL(pendente), color: 'var(--warning)', sub: `${pags.filter(p => p.status === 'pendente').length} pendentes` },
        { label: 'Metas Registradas', value: String(metas?.length ?? 0), color: 'var(--accent2)' },
      ])

      setRecentes((metas || []) as (MetaBatida & { unidades?: Unidade })[])
      setLoading(false)
    }
    load()
  }, [])

  const metaColors: Record<string, string> = {
    '<4%': '#4f8ef7',
    '<3%': '#fbbf24',
    '<2%': '#34d399',
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Visão Geral</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>Resumo das metas e comissões da equipe</p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', paddingTop: 60 }} className="pulse-soft">Carregando dados...</div>
      ) : (
        <>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            {stats.map(s => (
              <div key={s.label} className="card" style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 26, fontFamily: 'var(--font-display)', fontWeight: 700, color: s.color || 'var(--text)' }}>
                  {s.value}
                </div>
                {s.sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.sub}</div>}
              </div>
            ))}
          </div>

          {/* Últimas metas */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
              Últimas Metas Registradas
            </h2>
            {recentes.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nenhuma meta registrada ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentes.map(m => (
                  <div key={m.id} className="card2" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: metaColors[m.meta] || 'var(--muted)',
                        flexShrink: 0,
                      }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{m.unidades?.nome ?? m.unidade_id}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          Meta {m.meta} — batida em {new Date(m.data_batida + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: metaColors[m.meta] }}>{m.meta}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>×{m.multiplicador}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legenda multiplicadores */}
          <div className="card" style={{ padding: 24, marginTop: 16 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              Regra de Multiplicadores por Prazo
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { label: 'Até 40 dias', mult: '125%', color: '#34d399' },
                { label: 'Até 60 dias', mult: '100%', color: '#4f8ef7' },
                { label: 'Até 90 dias', mult: '70%',  color: '#fbbf24' },
                { label: 'Acima de 90 dias', mult: '50%', color: '#f87171' },
              ].map(r => (
                <div key={r.label} className="card2" style={{ padding: '12px 16px', borderLeft: `3px solid ${r.color}` }}>
                  <div style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 700, color: r.color }}>{r.mult}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{r.label} do vencimento</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
