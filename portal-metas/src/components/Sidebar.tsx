'use client'

import type { Tab } from '@/app/page'

interface Props {
  tab: Tab
  setTab: (t: Tab) => void
  aberta: boolean
}

const items: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard',  label: 'Dashboard',     icon: '📊' },
  { id: 'registrar',  label: 'Registrar Meta', icon: '🎯' },
  { id: 'pagamentos', label: 'Pagamentos',     icon: '💰' },
  { id: 'consulta',   label: 'Consultar',      icon: '🔍' },
  { id: 'juridico',   label: 'Jurídico',       icon: '⚖️' },
]

// A largura em si anima entre 220 e 0 — o conteúdo de dentro (nav + rodapé) fica travado
// em 220px e some por trás do "overflow: hidden", pra parecer um menu deslizando pra fora
// em vez de espremer o texto.
const LARGURA = 220

export default function Sidebar({ tab, setTab, aberta }: Props) {
  return (
    <aside style={{
      width: aberta ? LARGURA : 0,
      flexShrink: 0,
      overflow: 'hidden',
      background: 'var(--sidebar-bg)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 'calc(100vh - 56px)',
      transition: 'width 0.2s ease',
    }}>
      <nav style={{ padding: '16px 10px', flex: 1, width: LARGURA }}>
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
              whiteSpace: 'nowrap',
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

      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', width: LARGURA, boxSizing: 'border-box' }}>
        <div style={{ fontSize: 11, color: 'var(--sidebar-muted)', lineHeight: 1.8, whiteSpace: 'nowrap' }}>
          <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Equipe</div>
          <div>Juliana · Nathália</div>
          <div>Vinícius · Lucas Lodi</div>
        </div>
      </div>
    </aside>
  )
}
