'use client'

import type { Tab } from '@/app/page'

interface Props {
  tab: Tab
  setTab: (t: Tab) => void
}

const items: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard',  label: 'Dashboard',      icon: '📊' },
  { id: 'registrar',  label: 'Registrar Meta',  icon: '🎯' },
  { id: 'pagamentos', label: 'Pagamentos',      icon: '💰' },
  { id: 'consulta',   label: 'Consultar',       icon: '🔍' },
]

export default function Sidebar({ tab, setTab }: Props) {
  return (
    <aside style={{
      width: 240,
      minHeight: '100vh',
      background: 'var(--sidebar-bg)',
      borderRight: 'none',
      padding: '0',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      height: '100vh',
    }}>
      {/* Header */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}>💼</div>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.2,
          }}>Portal Metas</div>
          <div style={{ fontSize: 11, color: 'var(--sidebar-muted)', marginTop: 2 }}>
            Contas a Receber
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sidebar-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 10px 6px' }}>
          Menu
        </div>
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
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

      {/* Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--sidebar-muted)', lineHeight: 1.8 }}>
          <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 4, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Equipe</div>
          <div>Juliana · Nathália</div>
          <div>Vinícius · Lucas Lodi</div>
        </div>
      </div>
    </aside>
  )
}
