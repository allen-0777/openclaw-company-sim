import React, { useState, useEffect, useRef } from 'react'
import type { AgentActivity } from '@/lib/pixel-office/agentBridge'

interface ChatMessage {
  role: 'user' | 'agent'
  content: string
  elapsed?: number
}

interface AgentStats {
  totalTokens: number
  sessionCount: number
  messageCount: number
  todayAvgResponseMs: number
}

interface BossInteractionPanelProps {
  agentId: string
  agentName: string
  agentEmoji: string
  onClose: () => void
  onSendCommand: (cmd: string) => Promise<void>
  logs: string[]
  messages?: ChatMessage[]
  agentDetail?: AgentActivity
  agentStats?: AgentStats
}

const STATE_COLOR: Record<string, string> = {
  working: 'text-green-400',
  idle: 'text-yellow-400',
  waiting: 'text-blue-400',
  offline: 'text-gray-500',
}

const STATE_BADGE: Record<string, string> = {
  working: '🟢',
  idle: '🟡',
  waiting: '🔵',
  offline: '⚫',
}

function timeAgo(ms: number): string {
  if (!ms) return 'never'
  const diff = Date.now() - ms
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}

const TASK_TEMPLATES = [
  { label: '📝 摘要報告', desc: '請整理目前的工作進度並產出摘要報告。' },
  { label: '🔍 調查問題', desc: '請調查並分析目前遇到的問題，找出根本原因。' },
  { label: '🧹 清理', desc: '請清理過時的檔案、日誌或暫存資料。' },
  { label: '📦 打包發布', desc: '請打包並準備最新版本的發布。' },
  { label: '🔧 修復 Bug', desc: '請找出並修復目前已知的 Bug。' },
  { label: '📊 產出報表', desc: '請分析目前的資料並產出統計報表。' },
]

const QUICK_COMMANDS = [
  { label: '👋 Wake Up', cmd: 'Wake up and report status' },
  { label: '📊 Status', cmd: 'Report current task status' },
  { label: '🔍 Check Logs', cmd: 'Show recent error logs' },
]

export function BossInteractionPanel({
  agentId,
  agentName,
  agentEmoji,
  onClose,
  onSendCommand,
  logs,
  messages = [],
  agentDetail,
  agentStats,
}: BossInteractionPanelProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'chat' | 'tasks'>('status')
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [taskDesc, setTaskDesc] = useState('')
  const [taskContext, setTaskContext] = useState('')
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [isDispatching, setIsDispatching] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

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
    try { await onSendCommand(cmd) } finally { setIsSending(false) }
  }

  const handleDispatchTask = async () => {
    if (!taskDesc.trim() || isDispatching) return
    setIsDispatching(true)
    const priorityLabel = taskPriority === 'high' ? '🔴 HIGH' : taskPriority === 'medium' ? '🟡 MEDIUM' : '🟢 LOW'
    let prompt = `[Task - Priority: ${priorityLabel}]\n${taskDesc.trim()}`
    if (taskContext.trim()) prompt += `\n\n[Context]\n${taskContext.trim()}`
    try {
      await onSendCommand(prompt)
      setTaskDesc('')
      setTaskContext('')
      setTaskPriority('medium')
      setActiveTab('chat')
    } finally {
      setIsDispatching(false) }
  }

  const state = agentDetail?.state || 'offline'

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-lg bg-[#1a1b26] border border-[#3b3f5c] rounded-xl shadow-2xl flex flex-col overflow-hidden font-sans text-sm animate-in fade-in zoom-in-95 duration-200">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#16161e] border-b border-[#3b3f5c]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-[#24283b] flex items-center justify-center text-xl border border-[#3b3f5c]">
              {agentEmoji}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 text-base leading-none">{STATE_BADGE[state]}</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-100">{agentName}</h3>
            <p className="text-xs font-mono">
              <span className={STATE_COLOR[state] || 'text-gray-500'}>{state}</span>
              {agentDetail?.lastActive ? (
                <span className="text-gray-600 ml-1">· {timeAgo(agentDetail.lastActive)}</span>
              ) : null}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#24283b] transition-colors">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#3b3f5c] bg-[#1a1b26]">
        {(['status', 'chat', 'tasks'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${
              activeTab === tab
                ? tab === 'status'
                  ? 'text-purple-400 border-b-2 border-purple-400 bg-[#1f2335]'
                  : tab === 'chat'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-[#1f2335]'
                  : 'text-orange-400 border-b-2 border-orange-400 bg-[#1f2335]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#1f2335]'
            }`}
          >
            {tab === 'status' ? '📊 狀態' : tab === 'chat' ? '💬 對話' : '📋 任務'}
            {tab === 'chat' && messages.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full w-4 h-4">
                {messages.length > 9 ? '9+' : messages.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="h-[400px] bg-[#1a1b26] flex flex-col">

        {/* ── STATUS TAB ─────────────────────────────── */}
        {activeTab === 'status' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">

            {/* State + tool */}
            <div className="bg-[#1f2335] rounded-lg p-3 space-y-2 border border-[#3b3f5c]/50">
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">狀態總覽</div>
              {agentDetail?.currentTool ? (
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <span className="text-yellow-400 animate-spin" style={{ animationDuration: '3s' }}>⚙</span>
                  <span className="font-mono truncate">{agentDetail.currentTool}</span>
                  {agentDetail.toolStatus && (
                    <span className="text-gray-500 truncate">· {agentDetail.toolStatus}</span>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-600 italic">
                  {state === 'offline' ? '尚未連線' : state === 'idle' ? '待機中' : '等待任務中'}
                </div>
              )}
              {agentStats && (
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#3b3f5c]/30">
                  <div className="text-center">
                    <div className="text-xs font-bold text-gray-200">{agentStats.totalTokens.toLocaleString()}</div>
                    <div className="text-[9px] text-gray-500">Tokens</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-gray-200">{agentStats.sessionCount}</div>
                    <div className="text-[9px] text-gray-500">Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-gray-200">{agentStats.messageCount}</div>
                    <div className="text-[9px] text-gray-500">Messages</div>
                  </div>
                </div>
              )}
            </div>

            {/* Subagents */}
            {agentDetail?.subagents && agentDetail.subagents.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Subagents <span className="text-purple-400">({agentDetail.subagents.length})</span>
                </div>
                {agentDetail.subagents.map(sa => (
                  <div key={sa.toolId} className="bg-[#1f2335] rounded-lg p-2.5 border border-purple-500/20">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400 text-xs">📦</span>
                      <span className="text-xs font-medium text-gray-200 truncate flex-1">{sa.label}</span>
                      <span className="text-[9px] text-purple-400/70 bg-purple-500/10 px-1.5 py-0.5 rounded-full">active</span>
                    </div>
                    {sa.activityEvents && sa.activityEvents.length > 0 && (
                      <div className="mt-1.5 text-[10px] text-gray-400 font-mono truncate pl-5">
                        └ {sa.activityEvents[sa.activityEvents.length - 1].text}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Cron Jobs */}
            {agentDetail?.cronJobs && agentDetail.cronJobs.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Cron Jobs <span className="text-yellow-400">({agentDetail.cronJobs.length})</span>
                </div>
                {agentDetail.cronJobs.map(job => (
                  <div key={job.key} className="bg-[#1f2335] rounded-lg p-2.5 border border-[#3b3f5c]/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs">{job.isRunning ? '⚡' : '⏰'}</span>
                        <span className="text-xs text-gray-200 truncate">{job.label}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                        job.lastStatus === 'success' ? 'bg-green-500/20 text-green-400'
                        : job.lastStatus === 'failed' ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {job.lastStatus}
                      </span>
                    </div>
                    {job.nextRunAt && (
                      <div className="mt-1 text-[10px] text-gray-500 pl-5">
                        下次: {new Date(job.nextRunAt).toLocaleString()}
                      </div>
                    )}
                    {job.lastSummary && (
                      <div className="mt-1 text-[10px] text-gray-500 pl-5 truncate">{job.lastSummary}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Recent logs */}
            {logs.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">最近 Logs</div>
                <div className="bg-[#16161e] rounded-lg p-2 max-h-[120px] overflow-y-auto space-y-1 border border-[#3b3f5c]/30">
                  {logs.slice(-10).map((log, i) => (
                    <div key={i} className="text-[10px] text-gray-400 font-mono break-all border-l border-[#3b3f5c] pl-2">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!agentDetail && (
              <div className="flex items-center justify-center h-24 text-gray-600 italic text-xs">
                無法取得狀態資料
              </div>
            )}
          </div>
        )}

        {/* ── CHAT TAB ─────────────────────────────── */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">
            {messages.length === 0 && (
              <div className="px-4 pt-3 pb-2">
                <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-2">Quick Commands</div>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_COMMANDS.map(q => (
                    <button
                      key={q.label}
                      onClick={() => setInput(q.cmd)}
                      className="px-2 py-2 bg-[#24283b] hover:bg-[#2f3549] border border-[#3b3f5c] rounded text-xs text-gray-300 transition-colors text-center"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-0">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-600 italic text-xs">
                  Direct secure line established...
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {msg.role === 'agent' && (
                      <div className="w-7 h-7 flex-shrink-0 rounded-full bg-[#24283b] flex items-center justify-center text-sm border border-[#3b3f5c] mt-0.5">
                        {agentEmoji}
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600/25 text-blue-100 border border-blue-500/30 rounded-tr-sm'
                        : 'bg-[#24283b] text-gray-200 border border-[#3b3f5c] rounded-tl-sm'
                    }`}>
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
            <div className="p-3 border-t border-[#3b3f5c] bg-[#16161e]">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                  }}
                  placeholder="Type a command... (Enter to send, Shift+Enter for new line)"
                  className="w-full bg-[#1a1b26] border border-[#3b3f5c] rounded-lg pl-3 pr-10 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 resize-none h-[70px] text-xs placeholder:text-gray-600"
                  disabled={isSending}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isSending}
                  className="absolute right-2 bottom-2 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >↵</button>
              </div>
            </div>
          </div>
        )}

        {/* ── TASKS TAB ─────────────────────────────── */}
        {activeTab === 'tasks' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Quick templates */}
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">快速模板</div>
              <div className="grid grid-cols-2 gap-2">
                {TASK_TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    onClick={() => setTaskDesc(t.desc)}
                    className="px-2.5 py-2 bg-[#24283b] hover:bg-[#2f3549] border border-[#3b3f5c] rounded text-xs text-gray-300 transition-colors text-left truncate"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Task description */}
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">任務描述 *</div>
              <textarea
                value={taskDesc}
                onChange={e => setTaskDesc(e.target.value)}
                placeholder="描述需要 Agent 完成的任務..."
                className="w-full bg-[#1f2335] border border-[#3b3f5c] rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-orange-500/50 resize-none h-[80px] text-xs placeholder:text-gray-600"
              />
            </div>

            {/* Priority */}
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">優先級</div>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setTaskPriority(p)}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors border ${
                      taskPriority === p
                        ? p === 'high' ? 'bg-red-500/20 border-red-500/50 text-red-300'
                          : p === 'medium' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                          : 'bg-green-500/20 border-green-500/50 text-green-300'
                        : 'bg-[#1f2335] border-[#3b3f5c] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {p === 'high' ? '🔴 高' : p === 'medium' ? '🟡 中' : '🟢 低'}
                  </button>
                ))}
              </div>
            </div>

            {/* Context */}
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">附加 Context（可選）</div>
              <textarea
                value={taskContext}
                onChange={e => setTaskContext(e.target.value)}
                placeholder="相關檔案路徑、背景資訊..."
                className="w-full bg-[#1f2335] border border-[#3b3f5c] rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-orange-500/50 resize-none h-[56px] text-xs placeholder:text-gray-600"
              />
            </div>

            {/* Dispatch */}
            <button
              onClick={handleDispatchTask}
              disabled={!taskDesc.trim() || isDispatching}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs rounded-lg transition-colors"
            >
              {isDispatching ? '派遣中...' : '派遣任務 →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
