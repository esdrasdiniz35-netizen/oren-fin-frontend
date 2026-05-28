import { useState, useCallback, useRef } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export function useChat(sessionId) {
  const [mensagens, setMensagens] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [contexto, setContexto] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const historicoRef = useRef([])

  const buscarContexto = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/contexto?session_id=${sessionId}`)
      const data = await res.json()
      if (data.sucesso) {
        setContexto(data)
        return data
      }
    } catch (err) {
      console.error('Erro ao buscar contexto:', err)
    }
    return null
  }, [sessionId])

  const enviarMensagem = useCallback(async (texto) => {
    if (!texto.trim() || carregando) return

    // Adiciona mensagem do usuário
    const novaMensagemUsuario = { role: 'user', content: texto, id: Date.now() }
    setMensagens(prev => [...prev, novaMensagemUsuario])
    setCarregando(true)
    setPdfUrl(null)

    // Adiciona mensagem do Fin vazia (vai sendo preenchida pelo streaming)
    const idFin = Date.now() + 1
    setMensagens(prev => [...prev, { role: 'assistant', content: '', id: idFin, streaming: true }])

    try {
      // Busca contexto atualizado antes de cada mensagem
      const ctx = await buscarContexto()

      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem: texto,
          historico: historicoRef.current,
          contexto: ctx || contexto,
          session_id: sessionId
        })
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let textoAcumulado = ''
      let textoFinal = ''
      let dadosPdf = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const linhas = chunk.split('\n')

        for (const linha of linhas) {
          if (!linha.startsWith('data: ')) continue
          try {
            const dados = JSON.parse(linha.slice(6))

            if (dados.tipo === 'texto') {
              textoAcumulado += dados.conteudo
              // Remove blocos estruturais durante o streaming para não mostrar pro usuário
              const textoVisivel = textoAcumulado
                .replace(/
DADOS_REGISTRO:[\s\S]*$/, '')
                .replace(/
GERAR_PDF:[\s\S]*$/, '')
                .trim()
              setMensagens(prev => prev.map(m =>
                m.id === idFin ? { ...m, content: textoVisivel } : m
              ))
            }

            if (dados.tipo === 'fim') {
              textoFinal = dados.texto_completo
              dadosPdf = dados.dados_pdf

              // Finaliza a mensagem do Fin
              setMensagens(prev => prev.map(m =>
                m.id === idFin ? { ...m, content: textoFinal, streaming: false } : m
              ))

              // Atualiza histórico
              historicoRef.current = [
                ...historicoRef.current,
                { role: 'user', content: texto },
                { role: 'assistant', content: textoFinal }
              ].slice(-20) // mantém últimas 20 mensagens

              // Gera PDF se necessário
              if (dadosPdf) {
                await gerarPdf(dadosPdf)
              }
            }

            if (dados.tipo === 'erro') {
              setMensagens(prev => prev.map(m =>
                m.id === idFin ? { ...m, content: 'Tive um problema técnico agora. Pode tentar novamente?', streaming: false } : m
              ))
            }
          } catch (e) {
            // linha inválida, ignora
          }
        }
      }
    } catch (err) {
      console.error('Erro no chat:', err)
      setMensagens(prev => prev.map(m =>
        m.id === idFin ? { ...m, content: 'Tive um problema técnico agora. Pode tentar novamente?', streaming: false } : m
      ))
    } finally {
      setCarregando(false)
    }
  }, [carregando, contexto, sessionId, buscarContexto])

  const gerarPdf = useCallback(async (dadosPdfJson) => {
    try {
      const obj = JSON.parse(dadosPdfJson)
      const res = await fetch(`${BACKEND_URL}/pdf/${obj.tipo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obj.dados)
      })
      const data = await res.json()
      if (data.url) {
        setPdfUrl(data.url.replace('http://', 'https://'))
      }
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
    }
  }, [])

  return {
    mensagens,
    carregando,
    contexto,
    pdfUrl,
    enviarMensagem,
    buscarContexto
  }
}
