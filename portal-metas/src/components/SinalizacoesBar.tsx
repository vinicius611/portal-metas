'use client'

import { useEffect, useState } from 'react'

// Lê as "sinalizações de meta batida" que o time marca lá no Portal de Cobrança.
// Isso NÃO fica no banco deste portal — fica no Supabase do Portal de Cobrança,
// numa tabela genérica (portal_dados) que ele já usa pra outras coisas (status,
// contatos, jurídico). Aqui a gente só LÊ essa chave, pra avisar que tem meta
// esperando ser registrada oficialmente aqui.
const SB_URL = 'https://yazpyjturftokrijeqzb.supabase.co'
const SB_KEY = 'sb_publishable_i_BgNypwgRBS2pBwOgMVgg_P8gsHsvK'
const SINAL_KEY = 'cobranca_metas_sinalizacoes'

interface Sinalizacao {
  id: string
  unidade: string
  meta: string
  dataBatida: string
  observacao?: string
  por: string
  em: string
  carteira: string
  status: 'pendente' | 'confirmada'
}

const METAS_LABEL: Record<string, string> = {
  '<4%': 'Marco 1 — abaixo de 4%',
  '<3%': 'Marco 2 — abaixo de 3%',
  '<2%': 'Marco 3 — abaixo de 2%',
}

function fmtData(iso: string) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || '-')
}

interface Props {
  onRegistrar: (unidadeSigla: string, meta: string, dataBatida: string) => void
}

export default function SinalizacoesBar({ onRegistrar }: Props) {
  const [itens, setItens] = useState<Sinalizacao[]>([])
  const [aberto, setAberto] = useState(false)
  const [loading, setLoading] = useState(true)

  async function carregar() {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/portal_dados?unidade=eq.${SINAL_KEY}&select=dados`, {
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY },
      })
      if (r.ok) {
        const d = await r.json()
        const eventos: Sinalizacao[] = (d && d[0] && d[0].dados && d[0].dados.eventos) || []
        setItens(eventos.filter((e) => e.status === 'pendente'))
      }
    } catch {
      // silencioso — se o Portal de Cobrança estiver fora do ar, a barra só some,
      // não trava o resto do Portal de Metas
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    const t = setInterval(carregar, 60000) // confere sozinha a cada 1 min
    return () => clearInterval(t)
  }, [])

  if (loading || itens.length === 0) return null

  return (
    <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', flexShrink: 0 }}>
      <div
        onClick={() => setAberto((a) => !a)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 28px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 16 }}>🚩</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e', flex: 1 }}>
          {itens.length === 1
            ? '1 meta sinalizada como batida no Portal de Cobrança, aguardando registro aqui'
            : `${itens.length} metas sinalizadas como batidas no Portal de Cobrança, aguardando registro aqui`}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', whiteSpace: 'nowrap' }}>
          {aberto ? '▲ ocultar' : '▼ ver'}
        </span>
      </div>
      {aberto && (
        <div style={{ padding: '0 28px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {itens.map((s) => (
            <div
              key={s.id}
              style={{
                background: '#fff',
                border: '1px solid #fde68a',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  {s.unidade} · {METAS_LABEL[s.meta] || s.meta}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Bateu em {fmtData(s.dataBatida)} · sinalizado por {s.por}
                  {s.observacao ? ` · "${s.observacao}"` : ''}
                </div>
              </div>
              <button
                className="btn-primary"
                style={{ padding: '7px 14px', fontSize: 12, flexShrink: 0 }}
                onClick={() => onRegistrar(s.unidade, s.meta, s.dataBatida)}
              >
                Registrar agora →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
