import React, { useState, useEffect, useRef } from 'react'
import { useI18n } from '@/lib/i18n'

interface ChatMessage {
  role: 'user' | 'agent'
  content: string
  elapsed?: number
}

interface BossInteractionPanelProps {
  agentId: string
  agentName: string
  agentEmoji: string
  onClose: () => void
  onSendCommand: (cmd: string) => Promise<void>
  logs: string[]
  messages?: ChatMessage[]
}

export function BossInteractionPanel({
  agentId,
  agentName,
  agentEmoji,
  onClose,
  onSendCommand,
  logs,
  messages = [],
}: BossInteractionPanelProps) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<'chat' | 'logs'>('chat')
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll logs
  useEffect(() => {
    if (activeTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, activeTab])

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeTab])

  const handleSend = async () => {
    if (!input.trim() || isSending) return
    setIsSending(true)
    const cmd = input
    setInput('')
    try {
      await onSendCommand(cmd)
    } finally {
      setIsSending(false)
    }
  }

  const quickCommands = [
    { label: '👋 Wake Up', cmd: 'Wake up and report status' },
    { label: '📊 Status', cmd: 'Report current task status' },
    { label: '🔍 Check Logs', cmd: 'Show recent error logs' },
  ]

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-lg bg-[#1a1b26] border border-[#3b3f5c] rounded-xl shadow-2xl flex flex-col overflow-hidden font-sans text-sm animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#16161e] border-b border-[#3b3f5c]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#24283b] flex items-center justify-center text-xl border border-[#3b3f5c]">
            {agentEmoji}
          </div>
          <div>
            <h3 className="font-bold text-gray-100">{agentName}</h3>
            <p className="text-xs text-gray-400 font-mono">{agentId}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#24283b] transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#3b3f5c] bg-[#1a1b26]">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'chat' 
              ? 'text-blue-400 border-b-2 border-blue-400 bg-[#1f2335]' 
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1f2335]'
          }`}
        >
          💬 Chat
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${
            activeTab === 'logs' 
              ? 'text-green-400 border-b-2 border-green-400 bg-[#1f2335]' 
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1f2335]'
          }`}
        >
          📜 Logs
          {logs.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 rounded-full w-4 h-4">
              {logs.length > 9 ? '9+' : logs.length}
            </span>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="h-[380px] bg-[#1a1b26] flex flex-col">
        {activeTab === 'chat' ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Quick Commands - only show when no messages */}
            {messages.length === 0 && (
              <div className="px-4 pt-3 pb-2">
                <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-2">Quick Commands</div>
                <div className="grid grid-cols-3 gap-2">
                  {quickCommands.map((q) => (
                    <button
                      key={q.label}
                      onClick={() => { setInput(q.cmd); }}
                      className="px-2 py-2 bg-[#24283b] hover:bg-[#2f3549] border border-[#3b3f5c] rounded text-xs text-gray-300 transition-colors text-center"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-0">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-600 italic text-xs">
                  Direct secure line established...
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {msg.role === 'agent' && (
                      <div className="w-7 h-7 flex-shrink-0 rounded-full bg-[#24283b] flex items-center justify-center text-sm border border-[#3b3f5c] mt-0.5">
                        {agentEmoji}
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-600/25 text-blue-100 border border-blue-500/30 rounded-tr-sm'
                          : 'bg-[#24283b] text-gray-200 border border-[#3b3f5c] rounded-tl-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      {msg.elapsed !== undefined && (
                        <div className="text-[9px] text-gray-500 mt-1 text-right">{msg.elapsed}ms</div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 flex-shrink-0 rounded-full bg-[#1f2335] flex items-center justify-center text-xs border border-[#3b3f5c] mt-0.5 font-bold text-gray-300">
                        You
                      </div>
                    )}
                  </div>
                ))
              )}
              {isSending && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 flex-shrink-0 rounded-full bg-[#24283b] flex items-center justify-center text-sm border border-[#3b3f5c]">
                    {agentEmoji}
                  </div>
                  <div className="bg-[#24283b] border border-[#3b3f5c] rounded-xl rounded-tl-sm px-4 py-2.5">
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-[#3b3f5c] bg-[#16161e]">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Type a command... (Enter to send, Shift+Enter for new line)"
                  className="w-full bg-[#1a1b26] border border-[#3b3f5c] rounded-lg pl-3 pr-10 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 resize-none h-[70px] text-xs placeholder:text-gray-600"
                  disabled={isSending}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isSending}
                  className="absolute right-2 bottom-2 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ↵
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 bg-[#16161e]">
            {logs.length === 0 ? (
              <div className="text-gray-600 italic text-center mt-10">No recent activity logs...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-gray-300 break-all border-l-2 border-[#3b3f5c] pl-2 py-0.5 hover:bg-[#1f2335] hover:border-blue-500/50 transition-colors">
                  <span className="text-green-500/70 mr-2">[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                  {log}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}
