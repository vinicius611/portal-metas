import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Portal de Metas — Contas a Receber',
  description: 'Gestão de metas e comissões da equipe de contas a receber',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  },
  // PWA — instalável na tela inicial do celular (ver manifest.json / sw.js em public/)
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Metas',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a2c5b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function () {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
