# Workbench 骨架 + P01 Agent Loop Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating Workbench toolbar to Pixel Office with 12 panel slots — WorkbenchDock (collapsible), WorkbenchDrawer (right-side overlay), and P01 Agent Loop (full CRUD for agents.list[]).

**Architecture:** Independent components with props, integrated into page.tsx with a single `workbenchPanel` state. P01 fetches config independently via `/api/config/raw` (for editing) and `/api/config` (for model dropdown). No global state or context needed.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, existing dark theme CSS variables

**Note:** No test framework exists in this project. Verification uses TypeScript type checking (`npx tsc --noEmit`) and visual browser checks at `http://localhost:3000/pixel-office`.

---

## Chunk 1: Shared Infrastructure

### Task 1: Panel Definitions Constant

**Files:**
- Create: `app/pixel-office/components/panels/panelDefinitions.ts`

- [ ] **Step 1: Create panelDefinitions.ts**

> **Note:** The spec draft used a `Record<string, ...>` shape, but we use `PanelDef[]` (array) intentionally: WorkbenchDock needs to iterate over panels in order, and `getPanelDef` provides O(n) lookup which is fine for 12 items. This is the authoritative shape.

```typescript
// app/pixel-office/components/panels/panelDefinitions.ts

export interface PanelDef {
  id: string
  emoji: string
  label: string
}

export const PANEL_DEFINITIONS: PanelDef[] = [
  { id: 'P01', emoji: '🤖', label: 'Agent' },
  { id: 'P02', emoji: '🔧', label: '工具' },
  { id: 'P03', emoji: '📋', label: '任務板' },
  { id: 'P04', emoji: '👥', label: '子任務' },
  { id: 'P05', emoji: '⚡', label: '技能' },
  { id: 'P06', emoji: '📊', label: 'Context' },
  { id: 'P07', emoji: '🗂️', label: '任務鏈' },
  { id: 'P08', emoji: '⏰', label: 'Cron' },
  { id: 'P09', emoji: '🔗', label: '團隊' },
  { id: 'P10', emoji: '📡', label: '頻道' },
  { id: 'P11', emoji: '🌐', label: 'Gateway' },
  { id: 'P12', emoji: '🔀', label: '模型' },
]

export function getPanelDef(id: string): PanelDef | undefined {
  return PANEL_DEFINITIONS.find((p) => p.id === id)
}
```

- [ ] **Step 2: Type check**

```bash
cd /Users/liyuchan/Desktop/OpenClaw-bot-review && npx tsc --noEmit
```

Expected: no errors

---

### Task 2: JsonPreview Component

**Files:**
- Create: `app/pixel-office/components/JsonPreview.tsx`

Uses React elements for syntax highlighting (no `dangerouslySetInnerHTML`, no `child_process`).

- [ ] **Step 1: Create JsonPreview.tsx**

```tsx
// app/pixel-office/components/JsonPreview.tsx
'use client'

import { useState, useCallback, ReactNode } from 'react'

interface JsonPreviewProps {
  value: unknown
  editable?: boolean
  onChange?: (parsed: unknown) => void
  onValidChange?: (valid: boolean) => void  // fires whenever parse validity changes
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
    if (raw.startsWith('"') && raw.endsWith(':')) {
      tokens.push({ type: 'key', text: raw })
    } else if (raw.startsWith('"')) {
      tokens.push({ type: 'string', text: raw })
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
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors

---

### Task 3: PanelPlaceholder Component

**Files:**
- Create: `app/pixel-office/components/panels/PanelPlaceholder.tsx`

- [ ] **Step 1: Create PanelPlaceholder.tsx**

```tsx
// app/pixel-office/components/panels/PanelPlaceholder.tsx
'use client'

import { getPanelDef } from './panelDefinitions'

interface PanelPlaceholderProps {
  panelId: string
}

export function PanelPlaceholder({ panelId }: PanelPlaceholderProps) {
  const def = getPanelDef(panelId)
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[200px] text-center px-8">
      <span className="text-5xl">{def?.emoji ?? '🔧'}</span>
      <p className="text-base font-medium text-white/80">{def?.label ?? panelId}</p>
      <p className="text-sm text-white/40">施工中，即將推出</p>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit Chunk 1**

```bash
git add app/pixel-office/components/panels/panelDefinitions.ts app/pixel-office/components/JsonPreview.tsx app/pixel-office/components/panels/PanelPlaceholder.tsx
git commit -m "feat: add Workbench shared infrastructure (panelDefinitions, JsonPreview, PanelPlaceholder)"
```

---

## Chunk 2: WorkbenchDock

### Task 4: WorkbenchDock Component

**Files:**
- Create: `app/pixel-office/components/WorkbenchDock.tsx`

- [ ] **Step 1: Create WorkbenchDock.tsx**

```tsx
// app/pixel-office/components/WorkbenchDock.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { PANEL_DEFINITIONS } from './panels/panelDefinitions'

interface WorkbenchDockProps {
  onOpen: (panelId: string) => void
}

export function WorkbenchDock({ onOpen }: WorkbenchDockProps) {
  const [expanded, setExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expanded) return
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [expanded])

  function handleChipClick(panelId: string) {
    setExpanded(false)
    onOpen(panelId)
  }

  // z-[57]: above sidebar mobile overlay (z-[55]), below GlobalSetupCheck (z-[100])
  return (
    <div ref={containerRef} className="fixed z-[57]" style={{ bottom: 24, right: 24 }}>
      {expanded ? (
        <div
          className="flex flex-wrap justify-end gap-1.5 p-2 rounded-2xl"
          style={{ maxWidth: 220, background: 'rgba(19,19,42,0.97)', border: '1px solid #3a3a6a', backdropFilter: 'blur(8px)' }}
        >
          {PANEL_DEFINITIONS.map((panel) => (
            <button
              key={panel.id}
              onClick={() => handleChipClick(panel.id)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              style={{ border: '1px solid #3a3a6a' }}
            >
              <span>{panel.emoji}</span>
              <span>{panel.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center justify-center w-11 h-11 rounded-full text-xl hover:scale-110 transition-transform cursor-pointer"
          style={{ background: 'rgba(19,19,42,0.97)', border: '1px solid #3a3a6a', backdropFilter: 'blur(8px)' }}
          title="工作台"
        >
          🛠️
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit Chunk 2**

```bash
git add app/pixel-office/components/WorkbenchDock.tsx
git commit -m "feat: add WorkbenchDock collapsible toolbar"
```

---

## Chunk 3: WorkbenchDrawer Shell

### Task 5: WorkbenchDrawer Component

**Files:**
- Create: `app/pixel-office/components/WorkbenchDrawer.tsx`

- [ ] **Step 1: Create WorkbenchDrawer.tsx**

```tsx
// app/pixel-office/components/WorkbenchDrawer.tsx
'use client'

import { useEffect, useState } from 'react'
import { getPanelDef } from './panels/panelDefinitions'
import { PanelPlaceholder } from './panels/PanelPlaceholder'
import { P01AgentLoop } from './panels/P01AgentLoop'

interface WorkbenchDrawerProps {
  panel: string | null
  onClose: () => void
}

export function WorkbenchDrawer({ panel, onClose }: WorkbenchDrawerProps) {
  const [visible, setVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual')

  useEffect(() => { setActiveTab('visual') }, [panel])

  useEffect(() => {
    if (panel) {
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setVisible(false)
    }
  }, [panel])

  if (!panel) return null

  const def = getPanelDef(panel)
  const isP01 = panel === 'P01'

  return (
    <>
      <div className="fixed inset-0 z-[58] bg-black/40" onClick={onClose} />
      <div
        className="fixed top-0 right-0 bottom-0 z-[59] flex flex-col"
        style={{
          width: 420,
          background: '#13132a',
          borderLeft: '1px solid #3a3a6a',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 200ms ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 shrink-0" style={{ height: 44, borderBottom: '1px solid #3a3a6a' }}>
          <span className="text-sm font-medium text-white/90">{def?.emoji} {def?.label ?? panel}</span>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 text-lg leading-none transition-colors" aria-label="關閉">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0" style={{ height: 36, borderBottom: '1px solid #3a3a6a' }}>
          {(['visual', 'json'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 text-xs transition-colors"
              style={{
                color: activeTab === tab ? '#7c7cf0' : 'rgba(255,255,255,0.4)',
                borderBottom: activeTab === tab ? '2px solid #7c7cf0' : '2px solid transparent',
                background: 'transparent',
              }}
            >
              {tab === 'visual' ? '視覺模式' : 'JSON 模式'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isP01 ? (
            <P01AgentLoop
              activeTab={activeTab}
              renderSaveBar={(content) => (
                <div
                  className="shrink-0 flex items-center justify-end gap-2 px-4"
                  style={{ height: 52, borderTop: '1px solid #3a3a6a' }}
                >
                  {content}
                </div>
              )}
            />
          ) : (
            <PanelPlaceholder panelId={panel} />
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Do NOT run tsc yet** — `P01AgentLoop` does not exist until Chunk 4. Type check and commit are deferred to Chunk 4 Step 6 below.

---

## Chunk 4: P01 Agent Loop

### Task 6: P01AgentLoop Component

**Files:**
- Create: `app/pixel-office/components/panels/P01AgentLoop.tsx`

All four sub-components go in one file.

#### Part A — Types, state, data fetch, save, delete helpers

- [ ] **Step 1: Write Part A**

```tsx
// app/pixel-office/components/panels/P01AgentLoop.tsx
'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
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
  const [deleteTimerId, setDeleteTimerId] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [newAgent, setNewAgent] = useState<Partial<AgentConfig>>({})

  const showToast = useCallback((type: ToastState['type'], message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), type === 'success' ? 2000 : 4000)
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
    if (deleteTimerId) clearTimeout(deleteTimerId)
    setDeleteConfirm(null)
    setDeleteTimerId(null)
  }

  function beginDeleteConfirm(agentId: string) {
    clearDeleteConfirm()
    setDeleteConfirm(agentId)
    setDeleteTimerId(setTimeout(() => setDeleteConfirm(null), 3000))
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
```

#### Part B — VisualMode

- [ ] **Step 2: Append VisualMode to P01AgentLoop.tsx**

```tsx
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
```

#### Part C — AgentForm

- [ ] **Step 3: Append AgentForm to P01AgentLoop.tsx**

```tsx
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
```

#### Part D — Loading / Error helpers

- [ ] **Step 4: Append LoadingSkeleton and ErrorState to P01AgentLoop.tsx**

```tsx
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
```

- [ ] **Step 5: Type check and commit Chunks 3 + 4 together**

Now that P01AgentLoop exists, WorkbenchDrawer.tsx (written in Chunk 3 but not yet committed) also resolves cleanly.

```bash
npx tsc --noEmit
```

Expected: no errors (both WorkbenchDrawer.tsx and P01AgentLoop.tsx are now complete)

```bash
git add app/pixel-office/components/WorkbenchDrawer.tsx app/pixel-office/components/panels/P01AgentLoop.tsx
git commit -m "feat: add WorkbenchDrawer + P01AgentLoop panel with Agent CRUD"
```

---

## Chunk 5: Page Integration + Verification

### Task 7: Wire into page.tsx

**Files:**
- Modify: `app/pixel-office/page.tsx`

- [ ] **Step 1: Add imports to page.tsx**

Find the existing imports from `./components/` (around line 35–44). Add two lines immediately after:

```tsx
import { WorkbenchDock } from './components/WorkbenchDock'
import { WorkbenchDrawer } from './components/WorkbenchDrawer'
```

- [ ] **Step 2: Add state to page.tsx**

Find the `useState` declarations block. Add:

```tsx
const [workbenchPanel, setWorkbenchPanel] = useState<string | null>(null)
```

- [ ] **Step 3: Add JSX to page.tsx**

Find `<BossInteractionPanel` and add immediately after its closing `/>`:

```tsx
<WorkbenchDock onOpen={(id) => setWorkbenchPanel(id)} />
<WorkbenchDrawer
  panel={workbenchPanel}
  onClose={() => setWorkbenchPanel(null)}
/>
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/pixel-office/page.tsx
git commit -m "feat: integrate WorkbenchDock and WorkbenchDrawer into pixel-office page"
```

---

### Task 8: Visual Verification

- [ ] **Step 1: Start dev server if not running**

```bash
npm run dev
```

Expected: `✓ Ready in ...ms` at `http://localhost:3000`

- [ ] **Step 2: Open `http://localhost:3000/pixel-office`**

- [ ] **Step 3: WorkbenchDock**
  - 🛠️ button visible at bottom-right
  - Click → 12 chips appear
  - Click outside → collapses

- [ ] **Step 4: Placeholder panels**
  - Expand → click 🔧工具
  - Drawer slides in, shows "施工中，即將推出"
  - Click mask → Drawer closes

- [ ] **Step 5: P01 visual mode**
  - Expand → click 🤖 Agent
  - Agent list renders (or "尚無 Agent")
  - Click "+ 新增 Agent" → form appears with required fields
  - Fill id + workspace + agentDir → 新增 button enables → submit → agent in list
  - Click agent → inline edit form

- [ ] **Step 6: P01 delete**
  - Click 刪除 → red "確定？" button
  - Wait 3s → auto-resets
  - Click 刪除 → click 確定？ → agent removed

- [ ] **Step 7: P01 JSON mode**
  - Click JSON 模式 → textarea shows agents array
  - Break JSON → red border + error + 儲存 disabled
  - Fix → error clears

- [ ] **Step 8: P01 save**
  - Edit something → click 儲存
  - Green toast "已儲存" for ~2s
  - Reload page → changes persisted

- [ ] **Step 9: Close behavior**
  - Click mask → closes; click ✕ → closes
  - Closing does NOT re-expand Dock

- [ ] **Step 10: Final check — all files committed**

All files should already be committed from prior steps. Verify:

```bash
git status
```

Expected: `nothing to commit, working tree clean`

If any files remain unstaged, add them explicitly by name before committing. Do NOT use `git add -A` or `git add .`.
