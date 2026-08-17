'use client'

import { useEffect, useState } from 'react'
import { supabase, formatBRL, type Unidade, type Funcionario } from '@/lib/supabase'

const FUNCIONARIOS_REGISTRO = ['Juliana', 'Nathália', 'Vinícius', 'Lucas Lodi']
const COMISSAO_NOMES = ['Juliana', 'Nathália', 'Vinícius'] // quem recebe o 1%
const PERCENTUAL_COMISSAO = 0.01
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const ANO_ATUAL = new Date().getFullYear()
const ANOS = [ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1]

type SubTab = 'lancar' | 'contratos' | 'comissoes'

interface RecebimentoView {
  id: string
  unidade_id: string
  aluno_nome: string
  mes_pagamento: number
  ano_pagamento: number
  valor: number
  registrado_por: string | null
  observacao: string | null
  created_at: string
  unidades: { id: string; nome: string }
}

interface ComissaoView {
  id: string
  recebimento_id: string
  funcionario_id: string
  valor: number
  status: string
  data_pagamento: string | null
  funcionarios: Funcionario
  juridico_recebimentos: RecebimentoView
}

export default function TabJuridico() {
  const [subTab, setSubTab] = useState<SubTab>('lancar')

  return (
    <div className="fade-in" style={{ width: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Jurídico</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>
          Registre os recebimentos do jurídico, acompanhe os contratos parcelados e as comissões geradas.
        </p>
      </div>

      {/* Navegação interna */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {[
          { id: 'lancar' as SubTab, label: '💰 Lançar Recebimento' },
          { id: 'contratos' as SubTab, label: '📄 Contratos / Parcelas' },
          { id: 'comissoes' as SubTab, label: '🤝 Comissões' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setSubTab(item.id)}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: subTab === item.id ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'transparent',
              color: subTab === item.id ? 'var(--accent)' : 'var(--muted)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {subTab === 'lancar' && <SubTabLancar />}
      {subTab === 'contratos' && <SubTabContratos />}
      {subTab === 'comissoes' && <SubTabComissoes />}
    </div>
  )
}

// ============================================================
// SUB-ABA 1: LANÇAR RECEBIMENTO
// ============================================================
function SubTabLancar() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [form, setForm] = useState({
    unidade_id: '',
    aluno_nome: '',
    registrado_por: '',
    mes_pagamento: String(new Date().getMonth() + 1).padStart(2, '0'),
    ano_pagamento: String(ANO_ATUAL),
    valor: '',
    observacao: '',
  })
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase.from('unidades').select('*').order('nome').then(({ data }) => setUnidades(data || []))
  }, [])

  const valorNum = parseFloat(form.valor.replace(',', '.')) || 0
  const comissaoPorFuncionario = Number((valorNum * PERCENTUAL_COMISSAO).toFixed(2))
  const comissaoTotal = Number((comissaoPorFuncionario * COMISSAO_NOMES.length).toFixed(2))

  async function handleSubmit() {
    setErro(''); setSucesso('')
    if (!form.unidade_id || !form.aluno_nome || !form.registrado_por || valorNum <= 0) {
      setErro('Preencha todos os campos obrigatórios (unidade, aluno, registrado por, valor).')
      return
    }
    setLoading(true)
    try {
      // 1. Cria o recebimento (a parcela)
      const { data: receb, error: recErr } = await supabase.from('juridico_recebimentos').insert({
        unidade_id: form.unidade_id,
        aluno_nome: form.aluno_nome.trim(),
        mes_pagamento: Number(form.mes_pagamento),
        ano_pagamento: Number(form.ano_pagamento),
        valor: valorNum,
        registrado_por: form.registrado_por,
        observacao: form.observacao || null,
      }).select().single()
      if (recErr) throw recErr

      // 2. Busca os 3 funcionários que recebem comissão
      const { data: funcs, error: funcErr } = await supabase
        .from('funcionarios')
        .select('*')
        .in('nome', COMISSAO_NOMES)
      if (funcErr) throw funcErr
      if (!funcs || funcs.length === 0) throw new Error('Funcionários da comissão não encontrados.')

      // 3. Cria a comissão de 1% para cada um
      const { error: comErr } = await supabase.from('juridico_comissoes').insert(
        funcs.map((f: Funcionario) => ({
          recebimento_id: receb.id,
          funcionario_id: f.id,
          valor: comissaoPorFuncionario,
          status: 'pendente',
        }))
      )
      if (comErr) throw comErr

      setSucesso(`Recebimento registrado! Comissão de ${formatBRL(comissaoPorFuncionario)} gerada para cada um: ${COMISSAO_NOMES.join(', ')}.`)
      setForm(f => ({ ...f, aluno_nome: '', valor: '', observacao: '' }))
    } catch (e: unknown) {
      setErro('Erro: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ padding: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <label>Unidade *</label>
        <select className="input" value={form.unidade_id} onChange={e => setForm(f => ({ ...f, unidade_id: e.target.value }))}>
          <option value="">Selecione a unidade...</option>
          {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <label>Nome do Aluno / Contrato *</label>
          <input
            className="input"
            type="text"
            placeholder="Ex: João da Silva"
            value={form.aluno_nome}
            onChange={e => setForm(f => ({ ...f, aluno_nome: e.target.value }))}
          />
        </div>
        <div>
          <label>Registrado por *</label>
          <select className="input" value={form.registrado_por} onChange={e => setForm(f => ({ ...f, registrado_por: e.target.value }))}>
            <option value="">Selecione...</option>
            {FUNCIONARIOS_REGISTRO.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <label>Mês do Pagamento *</label>
          <select className="input" value={form.mes_pagamento} onChange={e => setForm(f => ({ ...f, mes_pagamento: e.target.value }))}>
            {MESES.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
          </select>
        </div>
        <div>
          <label>Ano *</label>
          <select className="input" value={form.ano_pagamento} onChange={e => setForm(f => ({ ...f, ano_pagamento: e.target.value }))}>
            {ANOS.map(a => <option key={a} value={String(a)}>{a}</option>)}
          </select>
        </div>
        <div>
          <label>Valor Recebido (R$) *</label>
          <input
            className="input"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={form.valor}
            onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
          />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label>Observação</label>
        <textarea
          className="input"
          rows={2}
          placeholder="Ex: 2ª parcela de 6, contrato firmado em..."
          value={form.observacao}
          onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
          style={{ resize: 'vertical' }}
        />
      </div>

      {valorNum > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Preview de Comissão (1% para cada)
          </div>
          <table style={{ width: '100%', maxWidth: 500, borderCollapse: 'collapse', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                {['Funcionário', 'Comissão (1%)'].map(h => (
                  <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMISSAO_NOMES.map((nome, i) => (
                <tr key={nome} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'var(--surface2)' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>{nome}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--success)' }}>{formatBRL(comissaoPorFuncionario)}</td>
                </tr>
              ))}
              <tr style={{ background: '#eff6ff', borderTop: '2px solid var(--border)' }}>
                <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--accent)' }}>Total em comissões</td>
                <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>{formatBRL(comissaoTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {sucesso && <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', fontSize: 14 }}>✅ {sucesso}</div>}
      {erro && <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 14 }}>❌ {erro}</div>}

      <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ padding: '12px 32px' }}>
        {loading ? 'Registrando...' : '💰 Registrar Recebimento e Gerar Comissões'}
      </button>
    </div>
  )
}

// ============================================================
// SUB-ABA 2: CONTRATOS / PARCELAS (consulta por aluno)
// ============================================================
interface GrupoAluno {
  chave: string
  aluno_nome: string
  unidade_nome: string
  parcelas: RecebimentoView[]
  total: number
}

function SubTabContratos() {
  const [recebimentos, setRecebimentos] = useState<RecebimentoView[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [expandido, setExpandido] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase
      .from('juridico_recebimentos')
      .select('*, unidades(id, nome)')
      .order('ano_pagamento', { ascending: true })
      .order('mes_pagamento', { ascending: true })
      .then(({ data }) => {
        setRecebimentos((data || []) as unknown as RecebimentoView[])
        setLoading(false)
      })
  }, [])

  const grupos: GrupoAluno[] = []
  recebimentos.forEach(r => {
    const chave = `${r.aluno_nome.trim().toLowerCase()}|${r.unidade_id}`
    let g = grupos.find(x => x.chave === chave)
    if (!g) {
      g = { chave, aluno_nome: r.aluno_nome, unidade_nome: r.unidades?.nome || '-', parcelas: [], total: 0 }
      grupos.push(g)
    }
    g.parcelas.push(r)
    g.total += Number(r.valor)
  })
  grupos.sort((a, b) => a.aluno_nome.localeCompare(b.aluno_nome))

  const filtrados = busca
    ? grupos.filter(g => g.aluno_nome.toLowerCase().includes(busca.toLowerCase()))
    : grupos

  const totalGeral = filtrados.reduce((s, g) => s + g.total, 0)

  function toggle(chave: string) {
    setExpandido(prev => {
      const next = new Set(prev)
      next.has(chave) ? next.delete(chave) : next.add(chave)
      return next
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <label>Buscar por nome do aluno</label>
          <input className="input" type="text" placeholder="Digite o nome..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <div className="card" style={{ padding: '12px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Recebido</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', fontFamily: 'var(--font-display)' }}>{formatBRL(totalGeral)}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', paddingTop: 40 }} className="pulse-soft">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Nenhum contrato encontrado.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtrados.map(g => {
            const aberto = expandido.has(g.chave)
            return (
              <div key={g.chave} className="card" style={{ overflow: 'hidden' }}>
                <div
                  onClick={() => toggle(g.chave)}
                  style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{g.aluno_nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{g.unidade_nome} · {g.parcelas.length} parcela(s) recebida(s)</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Total recebido</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>{formatBRL(g.total)}</div>
                    </div>
                    <span style={{ color: 'var(--muted)' }}>{aberto ? '▼' : '▶'}</span>
                  </div>
                </div>
                {aberto && (
                  <div style={{ overflowX: 'auto', borderTop: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                          {['Mês/Ano', 'Valor da Parcela', 'Registrado por', 'Observação'].map(h => (
                            <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {g.parcelas.map((p, i) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'var(--surface2)' }}>
                            <td style={{ padding: '10px 16px', fontSize: 13 }}>{MESES[p.mes_pagamento - 1]}/{p.ano_pagamento}</td>
                            <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>{formatBRL(Number(p.valor))}</td>
                            <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--muted)' }}>{p.registrado_por || '-'}</td>
                            <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--muted)' }}>{p.observacao || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================
// SUB-ABA 3: COMISSÕES (marcar pago / editar / excluir)
// ============================================================
function SubTabComissoes() {
  const [comissoes, setComissoes] = useState<ComissaoView[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'pago'>('todos')
  const [filtroFunc, setFiltroFunc] = useState('')
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [salvando, setSalvando] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase
      .from('juridico_comissoes')
      .select('*, funcionarios(*), juridico_recebimentos(*, unidades(id, nome))')
      .order('created_at', { ascending: false })
    setComissoes((data || []) as unknown as ComissaoView[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('funcionarios').select('*').in('nome', COMISSAO_NOMES).order('nome').then(({ data }) => setFuncionarios(data || []))
  }, [])

  async function marcarPago(id: string) {
    setSalvando(id)
    await supabase.from('juridico_comissoes').update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] }).eq('id', id)
    await load()
    setSalvando(null)
  }

  async function marcarPendente(id: string) {
    setSalvando(id)
    await supabase.from('juridico_comissoes').update({ status: 'pendente', data_pagamento: null }).eq('id', id)
    await load()
    setSalvando(null)
  }

  async function excluirRecebimento(recebimento_id: string, aluno: string) {
    const ok = window.confirm(`Excluir este recebimento (aluno: ${aluno})? Isso remove a parcela e as 3 comissões geradas por ela, para todos os usuários. Ação irreversível.`)
    if (!ok) return
    setExcluindo(recebimento_id)
    try {
      const { error } = await supabase.from('juridico_recebimentos').delete().eq('id', recebimento_id)
      if (error) throw error
      await load()
    } catch (e: unknown) {
      alert('Erro ao excluir: ' + (e as Error).message)
    } finally {
      setExcluindo(null)
    }
  }

  const filtrados = comissoes.filter(c => {
    if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false
    if (filtroFunc && c.funcionario_id !== filtroFunc) return false
    return true
  })

  const totalFiltrado = filtrados.reduce((s, c) => s + Number(c.valor), 0)
  const totalPendente = filtrados.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0)
  const totalPago = filtrados.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0)

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <label>Status</label>
          <select className="input" style={{ width: 'auto' }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as 'todos' | 'pendente' | 'pago')}>
            <option value="todos">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </select>
        </div>
        <div>
          <label>Funcionário</label>
          <select className="input" style={{ width: 'auto' }} value={filtroFunc} onChange={e => setFiltroFunc(e.target.value)}>
            <option value="">Todos</option>
            {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total</div>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--navy)' }}>{formatBRL(totalFiltrado)}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid var(--warning)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pendente</div>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--warning)' }}>{formatBRL(totalPendente)}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid var(--success)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pago</div>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--success)' }}>{formatBRL(totalPago)}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', paddingTop: 40 }} className="pulse-soft">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Nenhuma comissão encontrada.</div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                  {['Funcionário', 'Aluno', 'Unidade', 'Mês/Ano', 'Valor Recebido', 'Comissão (1%)', 'Status', 'Ação'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'var(--surface2)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>{c.funcionarios?.nome}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{c.juridico_recebimentos?.aluno_nome}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{c.juridico_recebimentos?.unidades?.nome}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {c.juridico_recebimentos ? `${MESES[c.juridico_recebimentos.mes_pagamento - 1]}/${c.juridico_recebimentos.ano_pagamento}` : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{formatBRL(Number(c.juridico_recebimentos?.valor || 0))}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700 }}>{formatBRL(Number(c.valor))}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        background: c.status === 'pago' ? '#dcfce7' : '#fef9c3',
                        color: c.status === 'pago' ? '#15803d' : '#92400e',
                      }}>{c.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {c.status === 'pendente' ? (
                          <button onClick={() => marcarPago(c.id)} disabled={salvando === c.id}
                            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: salvando === c.id ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                            {salvando === c.id ? '...' : 'Marcar Pago'}
                          </button>
                        ) : (
                          <button onClick={() => marcarPendente(c.id)} disabled={salvando === c.id}
                            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: 12, cursor: 'pointer' }}>
                            Desfazer
                          </button>
                        )}
                        <button
                          onClick={() => excluirRecebimento(c.recebimento_id, c.juridico_recebimentos?.aluno_nome || '')}
                          disabled={excluindo === c.recebimento_id}
                          title="Excluir este recebimento (remove as 3 comissões geradas por ele)"
                          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 13, cursor: 'pointer', opacity: excluindo === c.recebimento_id ? 0.5 : 1 }}
                        >
                          {excluindo === c.recebimento_id ? '...' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
