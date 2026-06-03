import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Portal de Metas — Contas a Receber',
  description: 'Gestão de metas e comissões da equipe de contas a receber',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
