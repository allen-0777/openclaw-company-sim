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
