// app/pixel-office/components/panels/P01AgentLoop.tsx
'use client'

import { useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { JsonPreview } from '../JsonPreview'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentIdentity { name?: string; emoji?: string }

export interface AgentConfig {
  id: string
  name?: string
  agentDir: string
  workspace: string
  model?: string
  identity?: AgentIdentity
}

interface OpenclawConfig {
  agents: { list: AgentConfig[]; defaults?: { model?: { primary?: string } } }
  models?: { providers?: Record<string, { models?: Array<{ id: string; name?: string }> }> }
  [key: string]: unknown
}

interface ProviderEntry { id: string; models: Array<{ id: string; name?: string }> }
interface ToastState { type: 'success' | 'error'; message: string }

export interface P01AgentLoopProps {
  activeTab: 'visual' | 'json'
  renderSaveBar: (content: ReactNode) => ReactNode
}

// ─── Component ────────────────────────────────────────────────────────────────

export function P01AgentLoop({ activeTab, renderSaveBar }: P01AgentLoopProps) {
  const [rawConfig, setRawConfig] = useState<string | null>(null)
  const [editedList, setEditedList] = useState<AgentConfig[]>([])
  const [modelOptions, setModelOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [saving, setSaving] = useState(false)
  const [jsonValid, setJsonValid] = useState(true)
  const [expandedId, setExpandedIdInternal] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [newAgent, setNewAgent] = useState<Partial<AgentConfig>>({})
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((type: ToastState['type'], message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ type, message })
    toastTimerRef.current = setTimeout(() => setToast(null), type === 'success' ? 2000 : 4000)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const [rawRes, cfgRes] = await Promise.all([
        fetch('/api/config/raw'),
        fetch('/api/config'),
      ])
      if (!rawRes.ok) throw new Error(`config/raw returned ${rawRes.status}`)
      const { content } = await rawRes.json() as { content: string }
      const parsed = JSON.parse(content) as OpenclawConfig
      setRawConfig(content)
      setEditedList(JSON.parse(JSON.stringify(parsed.agents?.list ?? [])) as AgentConfig[])
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json() as { providers?: ProviderEntry[] }
        const opts = (cfgData.providers ?? []).flatMap((p) =>
          (p.models ?? []).map((m) => `${p.id}/${m.id}`)
        )
        setModelOptions(opts)
      }
    } catch (e) {
      setFetchError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (!rawConfig || !jsonValid) return
    setSaving(true)
    try {
      const configObj = JSON.parse(rawConfig) as OpenclawConfig
      configObj.agents = { ...configObj.agents, list: editedList }
      const content = JSON.stringify(configObj, null, 2)
      const res = await fetch('/api/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      setRawConfig(content)
      showToast('success', '已儲存')
    } catch (e) {
      showToast('error', `儲存失敗：${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }, [rawConfig, editedList, jsonValid, showToast])

  function clearDeleteConfirm() {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    setDeleteConfirm(null)
    deleteTimerRef.current = null
  }

  function beginDeleteConfirm(agentId: string) {
    clearDeleteConfirm()
    setDeleteConfirm(agentId)
    deleteTimerRef.current = setTimeout(() => setDeleteConfirm(null), 3000)
  }

  function finalizeDelete(agentId: string) {
    clearDeleteConfirm()
    setEditedList((prev) => prev.filter((a) => a.id !== agentId))
  }

  function setExpandedId(id: string | null) {
    clearDeleteConfirm()
    setExpandedIdInternal(id)
  }

  const handleCancel = useCallback(() => {
    if (!rawConfig) return
    const parsed = JSON.parse(rawConfig) as OpenclawConfig
    setEditedList(JSON.parse(JSON.stringify(parsed.agents?.list ?? [])) as AgentConfig[])
    setExpandedId(null)
  }, [rawConfig])

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingSkeleton />
  if (fetchError) return <ErrorState message={fetchError} onRetry={loadData} />

  const saveBarContent = (
    <>
      <button
        onClick={handleCancel}
        className="px-4 py-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
      >
        取消
      </button>
      <button
        onClick={handleSave}
        disabled={saving || !jsonValid}
        className="px-4 py-1.5 text-xs rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: '#5555cc', color: '#fff' }}
      >
        {saving ? '儲存中…' : '儲存'}
      </button>
    </>
  )

  return (
    <>
      {toast && (
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 text-xs font-medium"
          style={{ background: toast.type === 'success' ? '#14532d' : '#450a0a', color: toast.type === 'success' ? '#86efac' : '#fca5a5' }}
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {activeTab === 'visual' ? (
        <VisualMode
          agents={editedList}
          modelOptions={modelOptions}
          expandedId={expandedId}
          onExpandChange={setExpandedId}
          deleteConfirm={deleteConfirm}
          onDeleteStart={beginDeleteConfirm}
          onDeleteConfirm={finalizeDelete}
          newAgent={newAgent}
          onNewAgentChange={setNewAgent}
          onAgentChange={(updated) =>
            setEditedList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
          }
          onNewAgentAdd={(agent) => {
            setEditedList((prev) => [...prev, agent])
            setNewAgent({})
            setExpandedId(null)
          }}
        />
      ) : (
        <div className="p-3">
          <JsonPreview
            value={editedList}
            editable
            onChange={(parsed) => setEditedList(parsed as AgentConfig[])}
            onValidChange={(valid) => setJsonValid(valid)}
            className="min-h-[400px]"
          />
        </div>
      )}

      {renderSaveBar(saveBarContent)}
    </>
  )
}

// ─── VisualMode ───────────────────────────────────────────────────────────────

interface VisualModeProps {
  agents: AgentConfig[]
  modelOptions: string[]
  expandedId: string | null
  onExpandChange: (id: string | null) => void
  deleteConfirm: string | null
  onDeleteStart: (id: string) => void
  onDeleteConfirm: (id: string) => void
  newAgent: Partial<AgentConfig>
  onNewAgentChange: (a: Partial<AgentConfig>) => void
  onAgentChange: (a: AgentConfig) => void
  onNewAgentAdd: (a: AgentConfig) => void
}

function VisualMode({
  agents, modelOptions, expandedId, onExpandChange,
  deleteConfirm, onDeleteStart, onDeleteConfirm,
  newAgent, onNewAgentChange, onAgentChange, onNewAgentAdd,
}: VisualModeProps) {
  const existingIds = agents.map((a) => a.id)

  return (
    <div className="p-3 space-y-1">
      <button
        onClick={() => onExpandChange(expandedId === 'new' ? null : 'new')}
        className="w-full text-left px-3 py-2 text-xs rounded-lg transition-colors"
        style={{ color: '#7c7cf0', border: '1px dashed #3a3a6a', background: 'transparent' }}
      >
        + 新增 Agent
      </button>

      {expandedId === 'new' && (
        <AgentForm
          agent={newAgent}
          isNew
          existingIds={existingIds}
          modelOptions={modelOptions}
          onChange={onNewAgentChange}
          onSave={(a) => onNewAgentAdd(a)}
          onCancel={() => onExpandChange(null)}
        />
      )}

      {agents.map((agent) => (
        <div key={agent.id}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => onExpandChange(expandedId === agent.id ? null : agent.id)}
          >
            <span className="text-base">{agent.identity?.emoji ?? '🤖'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/80 truncate">{agent.identity?.name ?? agent.name ?? agent.id}</p>
              <p className="text-[10px] text-white/40 truncate">{agent.id} · {agent.model ?? '繼承預設'}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); deleteConfirm === agent.id ? onDeleteConfirm(agent.id) : onDeleteStart(agent.id) }}
              className="shrink-0 px-2 py-0.5 text-[10px] rounded transition-colors"
              style={{
                background: deleteConfirm === agent.id ? '#7f1d1d' : 'transparent',
                color: deleteConfirm === agent.id ? '#fca5a5' : 'rgba(255,255,255,0.3)',
                border: `1px solid ${deleteConfirm === agent.id ? '#f87171' : 'transparent'}`,
              }}
            >
              {deleteConfirm === agent.id ? '確定？' : '刪除'}
            </button>
          </div>

          {expandedId === agent.id && (
            <AgentForm
              agent={agent}
              isNew={false}
              existingIds={existingIds.filter((id) => id !== agent.id)}
              modelOptions={modelOptions}
              onChange={(updated) => onAgentChange({ ...agent, ...updated })}
              onSave={() => onExpandChange(null)}
              onCancel={() => onExpandChange(null)}
            />
          )}
        </div>
      ))}

      {agents.length === 0 && expandedId !== 'new' && (
        <p className="text-center text-xs text-white/30 py-8">尚無 Agent，點上方按鈕新增</p>
      )}
    </div>
  )
}

// ─── AgentForm ────────────────────────────────────────────────────────────────

interface AgentFormProps {
  agent: Partial<AgentConfig>
  isNew: boolean
  existingIds: string[]
  modelOptions: string[]
  onChange: (a: Partial<AgentConfig>) => void
  onSave: (a: AgentConfig) => void
  onCancel: () => void
}

function AgentForm({ agent, isNew, existingIds, modelOptions, onChange, onSave, onCancel }: AgentFormProps) {
  const idDuplicate = isNew && !!agent.id && existingIds.includes(agent.id)
  const canSave = isNew ? !!agent.id && !idDuplicate && !!agent.agentDir && !!agent.workspace : true

  const inputCls = 'w-full px-2 py-1.5 text-xs rounded bg-[#0d0d1a] text-white/80 outline-none'
  const labelCls = 'block text-[10px] text-white/40 mb-1'

  function patch(p: Partial<AgentConfig>) { onChange({ ...agent, ...p }) }
  function patchIdentity(p: Partial<AgentIdentity>) { onChange({ ...agent, identity: { ...agent.identity, ...p } }) }

  function handleAdd() {
    if (!canSave) return
    onSave({ id: agent.id!, agentDir: agent.agentDir ?? '', workspace: agent.workspace ?? '', name: agent.name, model: agent.model, identity: agent.identity })
  }

  return (
    <div className="mx-1 mb-1 p-3 rounded-lg space-y-2" style={{ background: '#1a1a3a', border: '1px solid #3a3a6a' }}>
      <div>
        <label className={labelCls}>ID {isNew && <span className="text-red-400">*</span>}</label>
        {isNew ? (
          <>
            <input value={agent.id ?? ''} onChange={(e) => patch({ id: e.target.value })} placeholder="my-agent" className={inputCls} style={{ border: `1px solid ${idDuplicate ? '#f87171' : '#3a3a6a'}` }} />
            {idDuplicate && <p className="text-[10px] text-red-400 mt-0.5">ID 已存在</p>}
          </>
        ) : (
          <p className="text-xs text-white/50 px-2 py-1.5">{agent.id}</p>
        )}
      </div>

      <div>
        <label className={labelCls}>顯示名稱</label>
        <input value={agent.identity?.name ?? agent.name ?? ''} onChange={(e) => patchIdentity({ name: e.target.value })} placeholder="My Agent" className={inputCls} style={{ border: '1px solid #3a3a6a' }} />
      </div>

      <div>
        <label className={labelCls}>Emoji</label>
        <input value={agent.identity?.emoji ?? ''} onChange={(e) => patchIdentity({ emoji: e.target.value })} placeholder="🤖" className={inputCls} style={{ border: '1px solid #3a3a6a' }} />
      </div>

      <div>
        <label className={labelCls}>Model</label>
        <select value={agent.model ?? ''} onChange={(e) => patch({ model: e.target.value || undefined })} className={inputCls} style={{ border: '1px solid #3a3a6a' }}>
          <option value="">繼承預設</option>
          {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>Workspace {isNew && <span className="text-red-400">*</span>}</label>
        <input value={agent.workspace ?? ''} onChange={(e) => patch({ workspace: e.target.value })} placeholder="~/workspace" className={inputCls} style={{ border: '1px solid #3a3a6a' }} />
      </div>

      <div>
        <label className={labelCls}>Agent Dir {isNew && <span className="text-red-400">*</span>}</label>
        <input value={agent.agentDir ?? ''} onChange={(e) => patch({ agentDir: e.target.value })} placeholder="~/.openclaw/agents/my-agent" className={inputCls} style={{ border: '1px solid #3a3a6a' }} />
      </div>

      {isNew && (
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="px-3 py-1 text-xs text-white/40 hover:text-white/70 transition-colors">取消</button>
          <button onClick={handleAdd} disabled={!canSave} className="px-3 py-1 text-xs rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: '#5555cc', color: '#fff' }}>新增</button>
        </div>
      )}
    </div>
  )
}

// ─── Loading / Error ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="p-3 space-y-2">
      {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />)}
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm text-white/60">無法載入設定</p>
      <p className="text-xs text-red-400">{message}</p>
      <button onClick={onRetry} className="px-4 py-1.5 text-xs rounded-lg" style={{ background: '#3a3a6a', color: '#fff' }}>重試</button>
    </div>
  )
}
