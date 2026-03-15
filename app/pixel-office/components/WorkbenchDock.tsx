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
