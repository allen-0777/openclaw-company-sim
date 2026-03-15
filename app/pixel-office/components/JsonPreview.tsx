// app/pixel-office/components/JsonPreview.tsx
'use client'

import { useState, useCallback, useEffect, useRef, ReactNode } from 'react'

interface JsonPreviewProps {
  value: unknown
  editable?: boolean
  onChange?: (parsed: unknown) => void
  onValidChange?: (valid: boolean) => void
  className?: string
}

type TokenType = 'key' | 'string' | 'number' | 'bool' | 'null' | 'punct'
interface Token { type: TokenType; text: string }

function tokenizeJson(json: string): Token[] {
  const tokens: Token[] = []
  const pattern = /("(?:\\.|[^"\\])*")(\s*:)?|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}\[\],]/g
  const matches = Array.from(json.matchAll(pattern))
  let cursor = 0
  for (const m of matches) {
    const idx = m.index ?? 0
    if (idx > cursor) tokens.push({ type: 'punct', text: json.slice(cursor, idx) })
    const raw = m[0]
    if (m[1] !== undefined && m[2] !== undefined) {
      tokens.push({ type: 'key', text: m[1] })
      tokens.push({ type: 'punct', text: m[2] })
    } else if (m[1] !== undefined) {
      tokens.push({ type: 'string', text: m[1] })
    } else if (raw === 'true' || raw === 'false') {
      tokens.push({ type: 'bool', text: raw })
    } else if (raw === 'null') {
      tokens.push({ type: 'null', text: raw })
    } else if (raw[0] === '-' || (raw[0] >= '0' && raw[0] <= '9')) {
      tokens.push({ type: 'number', text: raw })
    } else {
      tokens.push({ type: 'punct', text: raw })
    }
    cursor = idx + raw.length
  }
  if (cursor < json.length) tokens.push({ type: 'punct', text: json.slice(cursor) })
  return tokens
}

const TOKEN_COLOR: Record<TokenType, string> = {
  key: '#60a5fa',
  string: '#4ade80',
  number: '#f97316',
  bool: '#f97316',
  null: '#9ca3af',
  punct: 'rgba(255,255,255,0.6)',
}

function HighlightedJson({ json }: { json: string }): ReactNode {
  const tokens = tokenizeJson(json)
  return (
    <pre className="p-3 overflow-auto text-xs leading-relaxed whitespace-pre-wrap break-all">
      {tokens.map((t, i) => (
        <span key={i} style={{ color: TOKEN_COLOR[t.type] }}>{t.text}</span>
      ))}
    </pre>
  )
}

export function JsonPreview({ value, editable = false, onChange, onValidChange, className = '' }: JsonPreviewProps) {
  const jsonString = JSON.stringify(value, null, 2)
  const [draft, setDraft] = useState(jsonString)
  const [parseError, setParseError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const prevJsonRef = useRef(jsonString)
  useEffect(() => {
    if (jsonString !== prevJsonRef.current) {
      prevJsonRef.current = jsonString
      setDraft(jsonString)
      setParseError(null)
    }
  }, [jsonString])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(editable ? draft : jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [editable, draft, jsonString])

  const handleChange = useCallback((text: string) => {
    setDraft(text)
    try {
      const parsed = JSON.parse(text)
      setParseError(null)
      onValidChange?.(true)
      onChange?.(parsed)
    } catch (e) {
      setParseError((e as Error).message)
      onValidChange?.(false)
    }
  }, [onChange, onValidChange])

  const baseClass = `relative font-mono text-xs rounded-lg overflow-hidden ${className}`

  if (editable) {
    return (
      <div className={baseClass}>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 z-10 px-2 py-0.5 text-[10px] rounded bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
        >
          {copied ? '✓' : '複製'}
        </button>
        <textarea
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full h-full min-h-[200px] p-3 bg-[#0d0d1a] text-white/80 resize-none outline-none"
          style={{ border: parseError ? '1px solid #f87171' : '1px solid #3a3a6a' }}
          spellCheck={false}
        />
        {parseError && (
          <p className="px-3 py-1 text-[10px] text-red-400 bg-red-950/30">
            {parseError}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={baseClass} style={{ background: '#0d0d1a', border: '1px solid #3a3a6a' }}>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-0.5 text-[10px] rounded bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
      >
        {copied ? '✓' : '複製'}
      </button>
      <HighlightedJson json={jsonString} />
    </div>
  )
}
