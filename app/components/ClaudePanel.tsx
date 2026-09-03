'use client'

import { useState } from 'react'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export default function ClaudePanel() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hi! I can help troubleshoot the remote environment, explain device status, or recommend next steps.',
    },
  ])

  async function sendPrompt() {
    const prompt = input.trim()
    if (!prompt || loading) return

    setMessages((prev) => [...prev, { role: 'user', content: prompt }])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Claude request failed.')
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.text || 'No response from Claude.' },
      ])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.'
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `I couldn’t reach Claude right now: ${message}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      style={{
        marginTop: 24,
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 18,
        padding: 20,
        background: 'rgba(12,17,26,0.8)',
      }}
    >
      <div className="section-head" style={{ marginBottom: 12 }}>
        <div>
          <p className="eyebrow">AI OPS</p>
          <h2>Claude assistant</h2>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12, maxHeight: 260, overflowY: 'auto', paddingRight: 8 }}>
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              maxWidth: '85%',
              marginLeft: message.role === 'assistant' ? 0 : 'auto',
              background:
                message.role === 'assistant'
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(99,102,241,0.25)',
              color: '#eaf2ff',
              whiteSpace: 'pre-wrap',
            }}
          >
            {message.content}
          </div>
        ))}

        {loading && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              maxWidth: '85%',
              background: 'rgba(255,255,255,0.06)',
              color: '#eaf2ff',
            }}
          >
            Thinking…
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask Claude to inspect the environment, summarize issues, or suggest actions…"
          rows={3}
          style={{
            flex: 1,
            resize: 'vertical',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            color: '#fff',
            padding: 12,
          }}
        />
        <button
          className="primary"
          style={{ alignSelf: 'flex-end' }}
          onClick={sendPrompt}
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </section>
  )
}
