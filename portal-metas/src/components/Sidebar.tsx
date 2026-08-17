'use client'

import type { Tab } from '@/app/page'

interface Props {
  tab: Tab
  setTab: (t: Tab) => void
}

const items: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard',  label: 'Dashboard',     icon: '📊' },
  { id: 'registrar',  label: 'Registrar Meta', icon: '🎯' },
  { id: 'pagamentos', label: 'Pagamentos',     icon: '💰' },
  { id: 'consulta',   label: 'Consultar',      icon: '🔍' },
  { id: 'juridico',   label: 'Jurídico',       icon: '⚖️' },
]

export default function Sidebar({ tab, setTab }: Props) {
  return (
    <aside style={{
      width: 220,
      background: 'var(--sidebar-bg)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 'calc(100vh - 56px)',
    }}>
      <nav style={{ padding: '16px 10px', flex: 1 }}>
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              background: tab === item.id ? 'var(--sidebar-active)' : 'transparent',
              color: tab === item.id ? '#fff' : 'var(--sidebar-muted)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: tab === item.id ? 600 : 400,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              transition: 'all 0.15s',
              marginBottom: 2,
            }}
            onMouseEnter={e => {
              if (tab !== item.id) (e.currentTarget as HTMLButtonElement).style.background = 'var(--sidebar-hover)'
            }}
            onMouseLeave={e => {
              if (tab !== item.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 11, color: 'var(--sidebar-muted)', lineHeight: 1.8 }}>
          <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Equipe</div>
          <div>Juliana · Nathália</div>
          <div>Vinícius · Lucas Lodi</div>
        </div>
      </div>
    </aside>
  )
}
