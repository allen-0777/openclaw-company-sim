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
