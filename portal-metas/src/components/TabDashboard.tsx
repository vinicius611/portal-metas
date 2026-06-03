'use client'

import { useEffect, useState } from 'react'
import { supabase, formatBRL, type MetaBatida, type Unidade } from '@/lib/supabase'

interface Stat { label: string; value: string; sub?: string; color?: string; bg?: string }

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

      const pags = pagamentos || []
      const total = pags.reduce((s: number, p: { valor_com_multiplicador: number }) => s + Number(p.valor_com_multiplicador), 0)
      const pago = pags.filter((p: { status: string }) => p.status === 'pago').reduce((s: number, p: { valor_com_multiplicador: number }) => s + Number(p.valor_com_multiplicador), 0)
      const pendente = total - pago

      setStats([
        { label: 'Total Gerado', value: formatBRL(total), color: 'var(--accent)', bg: 'rgba(37,99,235,0.08)' },
        { label: 'Já Pago', value: formatBRL(pago), color: 'var(--success)', bg: 'rgba(22,163,74,0.08)', sub: `${pags.filter((p: { status: string }) => p.status === 'pago').length} pagamentos` },
        { label: 'Pendente', value: formatBRL(pendente), color: 'var(--warning)', bg: 'rgba(217,119,6,0.08)', sub: `${pags.filter((p: { status: string }) => p.status === 'pendente').length} pendentes` },
        { label: 'Metas Registradas', value: String(metas?.length ?? 0), color: 'var(--navy)', bg: 'rgba(26,44,91,0.06)' },
      ])

      setRecentes((metas || []) as (MetaBatida & { unidades?: Unidade })[])
      setLoading(false)
    }
    load()
  }, [])

  const metaColors: Record<string, string> = {
    '<4%': '#2563eb',
    '<3%': '#d97706',
    '<2%': '#16a34a',
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Dashboard</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>Resumo geral das metas e comissões da equipe</p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', paddingTop: 60 }} className="pulse-soft">Carregando dados...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            {stats.map(s => (
              <div key={s.label} className="card" style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700, color: s.color }}>
                  {s.value}
                </div>
                {s.sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.sub}</div>}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Últimas metas */}
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
                Últimas Metas Registradas
              </h2>
              {recentes.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nenhuma meta registrada ainda.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recentes.map(m => (
                    <div key={m.id} style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: metaColors[m.meta] || 'var(--muted)', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.unidades?.nome ?? '-'}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                            {new Date(m.data_batida + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: metaColors[m.meta] + '18', color: metaColors[m.meta] }}>
                        {m.meta}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Multiplicadores */}
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
                Multiplicadores por Prazo
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Até 40 dias', mult: '125%', color: '#16a34a', sub: 'Bônus de 25%' },
                  { label: 'Até 60 dias', mult: '100%', color: '#2563eb', sub: 'Valor integral' },
                  { label: 'Até 90 dias', mult: '70%',  color: '#d97706', sub: 'Desconto de 30%' },
                  { label: 'Acima de 90 dias', mult: '50%', color: '#dc2626', sub: 'Desconto de 50%' },
                ].map(r => (
                  <div key={r.label} style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', borderLeft: `3px solid ${r.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.sub}</div>
                    </div>
                    <div style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 700, color: r.color }}>{r.mult}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
