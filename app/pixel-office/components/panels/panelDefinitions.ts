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
