import React, { useState, useEffect, useRef } from 'react'
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
    </div>
  )
}

function CardResumoDia({ resumo, estabelecimento, data }) {
  return (
    <div className="bubble fin-bubble">
      <div className="bubble-header">
        <span className="bubble-name">Fin</span>
        <span className="bubble-dot">•</span>
        <span className="bubble-brand">Oren IA</span>
        <span className="bubble-time">{new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</span>
      </div>
      <div className="bubble-content">
        <p className="resumo-titulo">📊 Resumo de hoje — {estabelecimento}</p>
        <p className="resumo-data">{data}</p>
        <div className="metric-cards">
          <div className="metric-card green">
            <span className="metric-label">ENTRADAS</span>
            <span className="metric-value">R$ {resumo.entradas}</span>
            <span className="metric-arrow">↑</span>
          </div>
          <div className="metric-card red">
            <span className="metric-label">SAÍDAS</span>
            <span className="metric-value">R$ {resumo.saidas}</span>
            <span className="metric-arrow">↓</span>
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

export default function App() {
  const { mensagens, carregando, contexto, pdfUrl, enviarMensagem, buscarContexto } = useChat(SESSION_ID)
  const [input, setInput] = useState('')
  const [iniciado, setIniciado] = useState(false)
  const [resumoDia, setResumoDia] = useState(null)
  const [cardsInjetados, setCardsInjetados] = useState([]) // cards bonitos no histórico
  const [carregandoResumo, setCarregandoResumo] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    buscarContexto().then(ctx => {
      if (ctx) extrairResumoDia(ctx.contexto || '')
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, cardsInjetados])

  function extrairResumoDia(contextoTexto) {
    const entradas = contextoTexto.match(/Total entradas: R\$ ([\d.,]+)/)
    const saidas = contextoTexto.match(/Total saídas: R\$ ([\d.,]+)/)
    const saldo = contextoTexto.match(/Saldo do dia: R\$ ([\d.,]+)/)
    const atend = contextoTexto.match(/Atendimentos: (\d+)/)
    if (entradas || saidas) {
      setResumoDia({
        entradas: entradas?.[1] || '0,00',
        saidas: saidas?.[1] || '0,00',
        saldo: saldo?.[1] || '0,00',
        atendimentos: atend?.[1] || '0'
      })
    }
  }

  async function handleEnviar() {
    if (!input.trim()) return
    const texto = input.trim()
    setInput('')
    setIniciado(true)
    await enviarMensagem(texto)
    buscarContexto().then(ctx => {
      if (ctx) extrairResumoDia(ctx.contexto || '')
    })
    inputRef.current?.focus()
  }

  async function handleEnviarTexto(texto) {
    setInput('')
    setIniciado(true)
    await enviarMensagem(texto)
    buscarContexto().then(ctx => {
      if (ctx) extrairResumoDia(ctx.contexto || '')
    })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  function handleAtalho(texto) {
    setInput(texto)
    inputRef.current?.focus()
  }

  // Botão Resumo do dia — busca contexto e injeta card
  async function handleResumoDia() {
    setIniciado(true)
    setCarregandoResumo(true)
    // Busca contexto atualizado
    const ctx = await buscarContexto()
    let resumoAtual = resumoDia
    if (ctx) {
      extrairResumoDia(ctx.contexto || '')
      // Extrai inline também para ter o valor imediato
      const contextoTexto = ctx.contexto || ''
      const entradas = contextoTexto.match(/Total entradas: R\$ ([\d.,]+)/)
      const saidas = contextoTexto.match(/Total saídas: R\$ ([\d.,]+)/)
      const saldo = contextoTexto.match(/Saldo do dia: R\$ ([\d.,]+)/)
      const atend = contextoTexto.match(/Atendimentos: (\d+)/)
      if (entradas || saidas) {
        resumoAtual = {
          entradas: entradas?.[1] || '0,00',
          saidas: saidas?.[1] || '0,00',
          saldo: saldo?.[1] || '0,00',
          atendimentos: atend?.[1] || '0'
        }
        setResumoDia(resumoAtual)
      }
    }

    // Injeta card no histórico visual
    const id = Date.now()
    setCarregandoResumo(false)
    setCardsInjetados(prev => [...prev, {
      id,
      tipo: 'resumo_dia',
      resumo: resumoAtual,
      posicao: mensagens.length
    }])
  }

  const estabelecimento = contexto?.estabelecimento || 'Fin'

  // Mescla mensagens com cards injetados em ordem
  const todasMensagens = []
  let cardIdx = 0
  mensagens.forEach((msg, i) => {
    // Injeta cards que devem aparecer antes desta mensagem
    while (cardIdx < cardsInjetados.length && cardsInjetados[cardIdx].posicao <= i) {
      todasMensagens.push({ ...cardsInjetados[cardIdx], ehCard: true })
      cardIdx++
    }
    todasMensagens.push(msg)
  })
  // Injeta cards restantes no final
  while (cardIdx < cardsInjetados.length) {
    todasMensagens.push({ ...cardsInjetados[cardIdx], ehCard: true })
    cardIdx++
  }

  const hoje = new Date().toLocaleDateString('pt-BR')

  return (
    <div className="desktop-wrapper">
      {/* Sidebar — só aparece no desktop */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-text">
            <span className="sidebar-logo-oren">Oren</span>
            <span className="sidebar-logo-ia"> IA</span>
          </span>
          <span className="sidebar-logo-tag">Fin</span>
        </div>

        {resumoDia && (
          <div className="sidebar-card">
            <div className="sidebar-card-title">📊 Resumo de hoje</div>
            <div className="sidebar-metric">
              <span className="sidebar-metric-label">Entradas</span>
              <span className="sidebar-metric-value green">R$ {resumoDia.entradas}</span>
            </div>
            <div className="sidebar-metric">
              <span className="sidebar-metric-label">Saídas</span>
              <span className="sidebar-metric-value red">R$ {resumoDia.saidas}</span>
            </div>
            <div className="sidebar-metric">
              <span className="sidebar-metric-label">Saldo</span>
              <span className="sidebar-metric-value">R$ {resumoDia.saldo}</span>
            </div>
            <div className="sidebar-metric">
              <span className="sidebar-metric-label">Atendimentos</span>
              <span className="sidebar-metric-value">{resumoDia.atendimentos}</span>
            </div>
          </div>
        )}

        <div className="sidebar-nav">
          <button className="sidebar-nav-btn" onClick={handleResumoDia}>
            <span className="sidebar-nav-icon">📊</span> Resumo do dia
          </button>
          <button className="sidebar-nav-btn" onClick={() => handleEnviarTexto('Mostrar todos os lançamentos de hoje')}>
            <span className="sidebar-nav-icon">📋</span> Lançamentos
          </button>
          <button className="sidebar-nav-btn" onClick={() => handleAtalho('Quero um relatório')}>
            <span className="sidebar-nav-icon">📈</span> Relatórios
          </button>
          <button className="sidebar-nav-btn" onClick={() => handleEnviarTexto('Ver agenda de hoje')}>
            <span className="sidebar-nav-icon">📅</span> Agenda
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-footer-text">Gestão financeira inteligente<br/>para pequenos negócios</div>
          <div className="sidebar-footer-brand">orenia.com.br</div>
        </div>
      </aside>

    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-logo">
          <span className="header-oren">Oren</span>
          <span className="header-ia"> IA</span>
        </div>
        <div className="header-actions">
          <button className="header-btn" title="Histórico">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Mensagens */}
      <main className="messages">
        {/* Saudação inicial */}
        {!iniciado && (
          <div className="message fin">
            <Avatar />
            <div className="bubble fin-bubble">
              <div className="bubble-header">
                <span className="bubble-name">Fin</span>
                <span className="bubble-dot">•</span>
                <span className="bubble-brand">Oren IA</span>
                <span className="bubble-time">{new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</span>
              </div>
              <div className="bubble-content">
                <p>Olá! Sou o Fin 👋</p>
                <p>O que posso registrar ou consultar hoje?</p>
                <div className="quick-actions">
                  <button className="quick-btn" onClick={handleResumoDia}>
                    <span className="quick-icon">📊</span>
                    <span>Resumo</span>
                  </button>
                  <button className="quick-btn" onClick={() => handleAtalho('Registrar lançamento')}>
                    <span className="quick-icon">↕️</span>
                    <span>Registrar</span>
                  </button>
                  <button className="quick-btn" onClick={() => handleAtalho('Consultar saldo')}>
                    <span className="quick-icon">🔍</span>
                    <span>Consultar</span>
                  </button>
                  <button className="quick-btn" onClick={() => handleAtalho('Quero um relatório')}>
                    <span className="quick-icon">📈</span>
                    <span>Relatórios</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resumo do dia automático na abertura */}
        {!iniciado && resumoDia && (
          <div className="message fin">
            <Avatar />
            <CardResumoDia resumo={resumoDia} estabelecimento={estabelecimento} data={hoje} />
          </div>
        )}

        {/* Histórico de mensagens + cards injetados */}
        {todasMensagens.map(item => {
          // Card bonito injetado
          if (item.ehCard && item.tipo === 'resumo_dia' && (item.resumo || resumoDia)) {
            return (
              <div key={item.id} className="message fin">
                <Avatar />
                <CardResumoDia resumo={item.resumo || resumoDia} estabelecimento={estabelecimento} data={hoje} />
              </div>
            )
          }

          // Mensagem normal
          const msg = item

          // Enquanto streaming e sem conteúdo, mostra só os pontinhos
          if (msg.streaming && !msg.content) {
            return (
              <div key={msg.id} className="message fin">
                <Avatar />
                <div className="bubble fin-bubble typing">
                  <span></span><span></span><span></span>
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
                    <span className="bubble-time">{new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                )}
                <div
                  className="bubble-content"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                />
                {msg.role === 'user' && <span className="check-marks">✓✓</span>}
              </div>
            </div>
          )
        })}

        {/* Link do PDF */}
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



        {/* Indicador de digitação ao buscar resumo */}
        {carregandoResumo && (
          <div className="message fin">
            <Avatar />
            <div className="bubble fin-bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Barra de atalhos */}
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

      {/* Input */}
      <div className="input-area">
        <button className="attach-btn" title="Anexar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
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
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22,2 15,22 11,13 2,9"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
