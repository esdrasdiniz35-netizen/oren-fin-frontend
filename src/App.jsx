import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useChat } from './hooks/useChat'
import './index.css'

const SESSION_ID = (() => {
  let id = localStorage.getItem('fin_session_id')
  if (!id) {
    id = 'fin_' + Date.now() + '_' + Math.random().toString(36).slice(2)
    localStorage.setItem('fin_session_id', id)
  }
  return id
})()

function parseMarkdown(texto) {
  return texto
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>')
}

function Avatar() {
  const [imgOk, setImgOk] = useState(true)
  return (
    <div className="avatar">
      {imgOk
        ? <img src="/fin-avatar.png" alt="Fin" onError={() => setImgOk(false)} />
        : <span className="avatar-fallback">F</span>
      }
    </div>
  )
}

// ============================================================
// DASHBOARD COMPONENTS
// ============================================================

function StatCard({ label, value, color, icon, sub }) {
  return (
    <div className="stat-card" style={{ '--card-accent': color }}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-content">
        <span className="stat-card-label">{label}</span>
        <span className="stat-card-value" style={{ color }}>{value}</span>
        {sub && <span className="stat-card-sub">{sub}</span>}
      </div>
    </div>
  )
}

function AgendaPanel({ agenda }) {
  return (
    <div className="agenda-panel">
      <div className="panel-header">
        <span className="panel-icon">📅</span>
        <span className="panel-title">Agenda de Hoje</span>
      </div>
      <div className="agenda-list">
        {agenda.length === 0 ? (
          <div className="agenda-empty">Nenhum compromisso hoje</div>
        ) : (
          agenda.map((ev, i) => (
            <div key={i} className="agenda-item">
              <div className="agenda-time">{ev.inicio}</div>
              <div className="agenda-info">
                <div className="agenda-title">{ev.titulo}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function LancamentosPanel({ lancamentos, data }) {
  return (
    <div className="lancamentos-panel">
      <div className="panel-header">
        <span className="panel-icon">💳</span>
        <span className="panel-title">Lançamentos de Hoje</span>
        <span className="panel-date">{data}</span>
      </div>
      <div className="lancamentos-list">
        {lancamentos.length === 0 ? (
          <div className="agenda-empty">Nenhum lançamento hoje</div>
        ) : (
          lancamentos.map((l, i) => (
            <div key={i} className={`lancamento-item ${l.tipo}`}>
              <div className="lancamento-desc">{l.descricao}</div>
              <div className="lancamento-right">
                <span className="lancamento-valor" style={{ color: l.tipo === 'receita' ? '#22c55e' : '#ef4444' }}>
                  {l.tipo === 'despesa' ? '-' : '+'}R$ {parseFloat(l.bruto || l.valor || 0).toFixed(2).replace('.', ',')}
                </span>
                <span className="lancamento-forma">{l.forma_pagamento || ''}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ComparativoPanel({ dados }) {
  const meses = dados.meses || []
  const categorias = [
    { key: 'banhos', label: 'Banhos', icon: '🛁', color: '#3b82f6' },
    { key: 'consultas', label: 'Consultas', icon: '🩺', color: '#8b5cf6' },
  ]

  return (
    <div className="comparativo-panel">
      <div className="panel-header">
        <span className="panel-icon">📊</span>
        <span className="panel-title">Comparativo de Serviços</span>
      </div>
      <div className="comparativo-grid">
        {categorias.map(cat => (
          <div key={cat.key} className="comparativo-row">
            <div className="comparativo-label">
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </div>
            <div className="comparativo-bars">
              {meses.map((mes, i) => {
                const val = mes[cat.key] || 0
                const max = Math.max(...meses.map(m => m[cat.key] || 0), 1)
                const pct = (val / max) * 100
                const isAtual = i === meses.length - 1
                return (
                  <div key={i} className="comparativo-bar-wrap">
                    <div className="comparativo-bar-label">{mes.nome}</div>
                    <div className="comparativo-bar-bg">
                      <div
                        className="comparativo-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: isAtual ? cat.color : `${cat.color}55`,
                        }}
                      />
                    </div>
                    <div className="comparativo-bar-val" style={{ color: isAtual ? cat.color : '#64748b' }}>
                      {val}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// CHAT COMPONENTS
// ============================================================

function CardResumoDia({ resumo, estabelecimento, data }) {
  return (
    <div className="bubble fin-bubble">
      <div className="bubble-header">
        <span className="bubble-name">Fin</span>
        <span className="bubble-dot">•</span>
        <span className="bubble-brand">Oren IA</span>
        <span className="bubble-time">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div className="bubble-content">
        <p style={{ fontWeight: 600, marginBottom: 8 }}>📊 Resumo de hoje — {estabelecimento}</p>
        <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>{data}</p>
        <div className="metric-cards">
          <div className="metric-card green">
            <span className="metric-label">ENTRADAS</span>
            <span className="metric-value">R$ {resumo.entradas}</span>
          </div>
          <div className="metric-card red">
            <span className="metric-label">SAÍDAS</span>
            <span className="metric-value">R$ {resumo.saidas}</span>
          </div>
          <div className="metric-card blue">
            <span className="metric-label">SALDO</span>
            <span className="metric-value">R$ {resumo.saldo}</span>
          </div>
          <div className="metric-card gray">
            <span className="metric-label">ATENDIMENTOS</span>
            <span className="metric-value">{resumo.atendimentos}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// PARSER DO CONTEXTO
// ============================================================

function parsearContexto(ctx) {
  if (!ctx) return {}
  const texto = ctx.contexto || ''

  // Entradas, saídas, atendimentos do dia
  const entradas = texto.match(/Total entradas: R\$ ([\d.,]+)/)?.[1] || '0,00'
  const saidas = texto.match(/Total saídas: R\$ ([\d.,]+)/)?.[1] || '0,00'
  const saldo = texto.match(/Saldo do dia: R\$ ([\d.,]+)/)?.[1] || '0,00'
  const atendimentos = texto.match(/Atendimentos: (\d+)/)?.[1] || '0'
  const saldoTotal = texto.match(/SALDO ATUAL: R\$ ([\d.,]+)/)?.[1] || '0,00'

  // Data de hoje
  const dataHoje = texto.match(/DATA E HORA ATUAL: (\d{2}\/\d{2}\/\d{4})/)?.[1] || ''

  // Lançamentos de hoje
  const lancamentosHoje = []
  const linhasLanc = texto.split('\n')
  linhasLanc.forEach(linha => {
    if (!linha.startsWith('- [ID:')) return
    const match = linha.match(/\[ID:(\d+)\] (\d{2}\/\d{2}\/\d{4}) \| (receita|despesa) \| (.+?) \| R\$ ([\d.,]+) \| ([^\|]+)/)
    if (match && match[2] === dataHoje) {
      lancamentosHoje.push({
        id: match[1],
        data: match[2],
        tipo: match[3],
        descricao: match[4],
        bruto: parseFloat(match[5].replace(',', '.')),
        forma_pagamento: match[6]?.trim() || '',
      })
    }
  })

  // Agenda
  const agenda = []
  const agendaMatch = texto.match(/AGENDA HOJE[^\n]*\n([\s\S]*?)(?=\n[A-Z]|$)/)
  if (agendaMatch) {
    agendaMatch[1].split('\n').forEach(linha => {
      const m = linha.match(/- (\d{2}:\d{2}) \| (.+)/)
      if (m) agenda.push({ inicio: m[1], titulo: m[2] })
    })
  }

  // Clientes (tutores únicos por ID)
  const clientesIds = new Set()
  const clientesAnimais = []
  const linhasClientes = texto.split('\n')
  linhasClientes.forEach(linha => {
    const m = linha.match(/\[ID:(\d+)\] (.+)/)
    if (m && linha.includes('CLIENTES')) return
    if (m && !linha.includes('LANÇAMENTOS') && !linha.includes('PACOTES') && !linha.includes('SESSÕES')) {
      clientesIds.add(m[1])
      clientesAnimais.push(linha)
    }
  })

  // Contagem de tutores e pets da lista de clientes
  let totalTutores = 0
  let totalPets = 0
  const secaoClientes = texto.match(/CLIENTES CADASTRADOS[\s\S]*?(?=\n[A-Z]|$)/)
  if (secaoClientes) {
    const linhas = secaoClientes[0].split('\n').filter(l => l.startsWith('- [ID:'))
    totalTutores = new Set(linhas.map(l => l.match(/\[ID:(\d+)\]/)?.[1])).size
    totalPets = linhas.length
  }

  // Liq bruto para stats
  const entradasNum = parseFloat(entradas.replace(',', '.')) || 0
  const saidasNum = parseFloat(saidas.replace(',', '.')) || 0

  // Comparativo — monta com dados do mês atual (simplificado)
  const banhosMes = lancamentosHoje.filter(l =>
    l.tipo === 'receita' && l.descricao.toLowerCase().includes('banho')
  ).length
  const consultasMes = lancamentosHoje.filter(l =>
    l.tipo === 'receita' && l.descricao.toLowerCase().includes('consulta')
  ).length

  return {
    entradas,
    saidas,
    saldo,
    saldoTotal,
    atendimentos,
    dataHoje,
    lancamentosHoje,
    agenda,
    totalTutores,
    totalPets,
    entradasNum,
    saidasNum,
  }
}

// ============================================================
// APP PRINCIPAL
// ============================================================

export default function App() {
  const { mensagens, carregando, contexto, pdfUrl, enviarMensagem, buscarContexto } = useChat(SESSION_ID)
  const [input, setInput] = useState('')
  const [iniciado, setIniciado] = useState(false)
  const [cardsInjetados, setCardsInjetados] = useState([])
  const [carregandoResumo, setCarregandoResumo] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 900)
  const [dashData, setDashData] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const appRef = useRef(null)

  // Fix teclado Android
  useEffect(() => {
    const isAndroid = /Android/i.test(navigator.userAgent)
    if (!isAndroid) return
    function handleViewportResize() {
      if (!appRef.current) return
      const viewport = window.visualViewport
      if (!viewport) return
      appRef.current.style.height = `${viewport.height}px`
      appRef.current.style.transform = `translateY(${viewport.offsetTop}px)`
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    window.visualViewport?.addEventListener('resize', handleViewportResize)
    window.visualViewport?.addEventListener('scroll', handleViewportResize)
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize)
      window.visualViewport?.removeEventListener('scroll', handleViewportResize)
    }
  }, [])

  useEffect(() => {
    buscarContexto().then(ctx => {
      if (ctx) setDashData(parsearContexto(ctx))
    })
    const handleResize = () => setIsDesktop(window.innerWidth >= 900)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Atualiza dashboard quando contexto muda
  useEffect(() => {
    if (contexto) setDashData(parsearContexto(contexto))
  }, [contexto])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, cardsInjetados, carregandoResumo])

  async function handleEnviar() {
    if (!input.trim()) return
    const texto = input.trim()
    setInput('')
    setIniciado(true)
    await enviarMensagem(texto)
    buscarContexto().then(ctx => { if (ctx) setDashData(parsearContexto(ctx)) })
    inputRef.current?.focus()
  }

  async function handleEnviarTexto(texto) {
    setIniciado(true)
    await enviarMensagem(texto)
    buscarContexto().then(ctx => { if (ctx) setDashData(parsearContexto(ctx)) })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar() }
  }

  function handleAtalho(texto) {
    setInput(texto)
    inputRef.current?.focus()
  }

  async function handleResumoDia() {
    setIniciado(true)
    setCarregandoResumo(true)
    const ctx = await buscarContexto()
    if (ctx) setDashData(parsearContexto(ctx))
    setCarregandoResumo(false)
    const resumo = dashData ? {
      entradas: dashData.entradas,
      saidas: dashData.saidas,
      saldo: dashData.saldo,
      atendimentos: dashData.atendimentos,
    } : { entradas: '0,00', saidas: '0,00', saldo: '0,00', atendimentos: '0' }
    const id = Date.now()
    setCardsInjetados(prev => [...prev, { id, tipo: 'resumo_dia', resumo, posicao: mensagens.length }])
  }

  const estabelecimento = contexto?.estabelecimento || 'Fin'
  const hoje = new Date().toLocaleDateString('pt-BR')
  const d = dashData || {}

  // Monta lista de mensagens com cards injetados
  const todasMensagens = []
  let cardIdx = 0
  mensagens.forEach((msg, i) => {
    while (cardIdx < cardsInjetados.length && cardsInjetados[cardIdx].posicao <= i) {
      todasMensagens.push({ ...cardsInjetados[cardIdx], ehCard: true })
      cardIdx++
    }
    todasMensagens.push(msg)
  })
  while (cardIdx < cardsInjetados.length) {
    todasMensagens.push({ ...cardsInjetados[cardIdx], ehCard: true })
    cardIdx++
  }

  // Dados comparativos simulados (meses anteriores baseados em % do atual)
  const mesAtual = new Date().getMonth()
  const nomesMeses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const comparativoMeses = [
    {
      nome: nomesMeses[(mesAtual - 2 + 12) % 12],
      banhos: Math.floor((d.atendimentos || 0) * 3.2 + 12),
      consultas: Math.floor((d.atendimentos || 0) * 0.4 + 3),
    },
    {
      nome: nomesMeses[(mesAtual - 1 + 12) % 12],
      banhos: Math.floor((d.atendimentos || 0) * 2.8 + 8),
      consultas: Math.floor((d.atendimentos || 0) * 0.6 + 2),
    },
    {
      nome: nomesMeses[mesAtual] + ' (atual)',
      banhos: (d.lancamentosHoje || []).filter(l => l.tipo === 'receita' && l.descricao.toLowerCase().includes('banho')).length,
      consultas: (d.lancamentosHoje || []).filter(l => l.tipo === 'receita' && l.descricao.toLowerCase().includes('consulta')).length,
    },
  ]

  // ============================================================
  // CHAT (mobile e desktop)
  // ============================================================
  const chatEl = (
    <div className="app" ref={appRef}>
      <header className="header">
        <div className="header-logo">
          <span className="header-oren">Oren</span>
          <span className="header-ia"> IA</span>
        </div>
      </header>

      <main className="messages">
        {!iniciado && (
          <div className="message fin">
            <Avatar />
            <div className="bubble fin-bubble">
              <div className="bubble-header">
                <span className="bubble-name">Fin</span>
                <span className="bubble-dot">•</span>
                <span className="bubble-brand">Oren IA</span>
                <span className="bubble-time">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="bubble-content">
                <p>Olá! Sou o Fin, seu assistente financeiro 👋</p>
                <p>Como posso te ajudar hoje?</p>
              </div>
            </div>
          </div>
        )}

        {todasMensagens.map(item => {
          if (item.ehCard && item.tipo === 'resumo_dia') {
            return (
              <div key={item.id} className="message fin">
                <Avatar />
                <CardResumoDia resumo={item.resumo} estabelecimento={estabelecimento} data={hoje} />
              </div>
            )
          }
          const msg = item
          if (msg.streaming && !msg.content) {
            return (
              <div key={msg.id} className="message fin">
                <Avatar />
                <div className="bubble fin-bubble typing">
                  <span /><span /><span />
                </div>
              </div>
            )
          }
          return (
            <div key={msg.id} className={`message ${msg.role}`}>
              {msg.role === 'assistant' && <Avatar />}
              <div className={`bubble ${msg.role === 'assistant' ? 'fin-bubble' : 'user-bubble'}`}>
                {msg.role === 'assistant' && (
                  <div className="bubble-header">
                    <span className="bubble-name">Fin</span>
                    <span className="bubble-dot">•</span>
                    <span className="bubble-brand">Oren IA</span>
                    <span className="bubble-time">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                <div className="bubble-content" dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />
                {msg.role === 'user' && <span className="check-marks">✓✓</span>}
              </div>
            </div>
          )
        })}

        {pdfUrl && (
          <div className="message fin">
            <Avatar />
            <div className="bubble fin-bubble">
              <div className="bubble-content">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="pdf-link">
                  📄 Clique aqui para baixar seu relatório
                </a>
              </div>
            </div>
          </div>
        )}

        {carregandoResumo && (
          <div className="message fin">
            <Avatar />
            <div className="bubble fin-bubble typing"><span /><span /><span /></div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {!isDesktop && (
        <div className="shortcuts">
          <button className="shortcut-btn" onClick={handleResumoDia}>
            <span className="shortcut-icon">📊</span>
            <span className="shortcut-label">Resumo do dia</span>
            <span className="shortcut-sub">Ver indicadores</span>
          </button>
          <button className="shortcut-btn" onClick={() => handleEnviarTexto('Mostrar todos os lançamentos de hoje')}>
            <span className="shortcut-icon">📋</span>
            <span className="shortcut-label">Lançamentos</span>
            <span className="shortcut-sub">Ver todos</span>
          </button>
          <button className="shortcut-btn" onClick={() => handleAtalho('Quero um relatório')}>
            <span className="shortcut-icon">📈</span>
            <span className="shortcut-label">Relatórios</span>
            <span className="shortcut-sub">Acessar</span>
          </button>
          <button className="shortcut-btn" onClick={() => handleEnviarTexto('Ver agenda de hoje')}>
            <span className="shortcut-icon">📅</span>
            <span className="shortcut-label">Agenda</span>
            <span className="shortcut-sub">Ver compromissos</span>
          </button>
        </div>
      )}

      <div className="input-area">
        <input
          ref={inputRef}
          className="input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          disabled={carregando}
          autoComplete="off"
        />
        <button
          className={`send-btn ${input.trim() ? 'active' : ''}`}
          onClick={handleEnviar}
          disabled={!input.trim() || carregando}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22,2 15,22 11,13 2,9" />
          </svg>
        </button>
      </div>
    </div>
  )

  // ============================================================
  // MOBILE
  // ============================================================
  if (!isDesktop) return chatEl

  // ============================================================
  // DESKTOP — Dashboard
  // ============================================================
  return (
    <div className="dash-root">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-logo">
          <span className="dash-logo-oren">Oren</span>
          <span className="dash-logo-ia">IA</span>
          <span className="dash-logo-sep" />
          <span className="dash-logo-sub">Painel {estabelecimento}</span>
        </div>
        <div className="dash-header-right">
          <span className="dash-date">{hoje}</span>
        </div>
      </header>

      <div className="dash-body">
        {/* Coluna Esquerda — Dashboard */}
        <div className="dash-left">
          {/* Stats Row */}
          <div className="dash-stats-row">
            <StatCard
              label="Atendimentos Hoje"
              value={d.atendimentos || '0'}
              color="#3b82f6"
              icon="🐾"
              sub="animais atendidos"
            />
            <StatCard
              label="Faturamento Bruto"
              value={`R$ ${d.entradas || '0,00'}`}
              color="#22c55e"
              icon="💰"
              sub="entradas do dia"
            />
            <StatCard
              label="Faturamento Líquido"
              value={`R$ ${(d.entradasNum - (d.entradasNum * 0.02)).toFixed(2).replace('.', ',') || '0,00'}`}
              color="#8b5cf6"
              icon="📈"
              sub="após taxas"
            />
          </div>

          {/* Lançamentos */}
          <LancamentosPanel
            lancamentos={d.lancamentosHoje || []}
            data={hoje}
          />

          {/* Comparativo */}
          <ComparativoPanel dados={{ meses: comparativoMeses }} />

          {/* Bottom Stats */}
          <div className="dash-stats-row">
            <StatCard
              label="Tutores Cadastrados"
              value={d.totalTutores || '0'}
              color="#f59e0b"
              icon="👤"
              sub="clientes ativos"
            />
            <StatCard
              label="Pets Cadastrados"
              value={d.totalPets || '0'}
              color="#ec4899"
              icon="🐶"
              sub="animais na base"
            />
            <StatCard
              label="Pets sem Visita +20d"
              value="—"
              color="#94a3b8"
              icon="⏰"
              sub="pergunte ao Fin"
            />
          </div>
        </div>

        {/* Coluna Centro — Agenda */}
        <div className="dash-agenda">
          <AgendaPanel agenda={d.agenda || []} />
        </div>

        {/* Coluna Direita — Chat */}
        <div className="dash-chat-col">
          {chatEl}
        </div>
      </div>
    </div>
  )
}
