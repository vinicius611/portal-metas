'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import TabRegistrar from '@/components/TabRegistrar'
import TabPagamentos from '@/components/TabPagamentos'
import TabConsulta from '@/components/TabConsulta'
import TabDashboard from '@/components/TabDashboard'

export type Tab = 'dashboard' | 'registrar' | 'pagamentos' | 'consulta'

export default function Home() {
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar tab={tab} setTab={setTab} />
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto', maxWidth: 'calc(100vw - 240px)' }}>
        {tab === 'dashboard'   && <TabDashboard />}
        {tab === 'registrar'   && <TabRegistrar />}
        {tab === 'pagamentos'  && <TabPagamentos />}
        {tab === 'consulta'    && <TabConsulta />}
      </main>
    </div>
  )
}
