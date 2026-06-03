'use client'

import type { Tab } from '@/app/page'

interface Props {
  tab: Tab
  setTab: (t: Tab) => void
}

const items: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard',  label: 'Visão Geral',   icon: '📊' },
  { id: 'registrar',  label: 'Registrar Meta', icon: '🎯' },
  { id: 'pagamentos', label: 'Pagamentos',     icon: '💰' },
  { id: 'consulta',   label: 'Consultar',      icon: '🔍' },
]

export default function Sidebar({ tab, setTab }: Props) {
  return (
    <aside style={{
      width: 240,
      minHeight: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      position: 'sticky',
      top: 0,
      height: '100vh',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, paddingLeft: 8 }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--text)',
          lineHeight: 1.2,
        }}>
          Portal
          <span style={{ color: 'var(--accent)', display: 'block', fontSize: 13, fontWeight: 500 }}>
            Contas a Receber
          </span>
        </div>
      </div>

      {/* Nav items */}
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => setTab(item.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            borderRadius: 9,
            border: 'none',
            background: tab === item.id ? 'var(--accent)' : 'transparent',
            color: tab === item.id ? '#fff' : 'var(--muted)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: tab === item.id ? 600 : 400,
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            if (tab !== item.id) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)'
          }}
          onMouseLeave={e => {
            if (tab !== item.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          }}
        >
          <span style={{ fontSize: 16 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingLeft: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Equipe</div>
          <div>Juliana · Nathália · Vinícius</div>
        </div>
      </div>
    </aside>
  )
}
