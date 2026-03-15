# Workbench 骨架 + P01 Agent Loop — 設計規格

**日期：** 2026-03-15
**狀態：** 已核准，待實作

---

## 1. 目標

在 Pixel Office 頁面新增一個浮動工具台（Workbench），提供 12 個操作面板的入口。本次實作：
- Workbench 骨架（WorkbenchDock + WorkbenchDrawer + JsonPreview）
- P01 Agent Loop 面板（完整實作）
- 其餘 11 個面板以 PanelPlaceholder 填充

---

## 2. 設計決策

| 項目 | 決策 |
|------|------|
| Dock 樣式 | 收合展開式：平時 🛠️ 按鈕，點擊展開 12 個 chip |
| Drawer 樣式 | 覆蓋式：浮在 Canvas 上，有遮罩，不壓縮 Canvas |
| 整合方式 | 獨立元件 + props，page.tsx 增量最小 |
| 首個真實面板 | P01 Agent Loop（CRUD agents.list[]） |

---

## 3. z-index 分配

已知 fixed 元素 z-index：
- sidebar 手機遮罩：`z-[55]`
- GlobalSetupCheck：`z-[100]`

Workbench 使用高於 sidebar 遮罩、低於 GlobalSetupCheck 的範圍：

| 元素 | z-index |
|------|---------|
| WorkbenchDock | `z-[57]` |
| 遮罩（mask） | `z-[58]` |
| WorkbenchDrawer | `z-[59]` |
| Toast（Drawer 內部） | 相對定位，無需全域 z-index |

---

## 4. WorkbenchDock

**位置：** `position: fixed; bottom: 24px; right: 24px; z-[52]`

**收合/展開狀態由 Dock 自身管理（內部 state `expanded`）。**

行為規則：
- 點 🛠️ → `expanded = true`
- 點 chip → 呼叫 `onOpen(panelId)`，同時 `expanded = false`
- 點 Dock 外部（document mousedown 事件） → `expanded = false`
- **Drawer 關閉不會重新展開 Dock**（使用者需再按 🛠️）
- 展開/收合互不影響 Drawer 的開關狀態（兩者獨立）

**12 個面板定義：**

| ID | Emoji | 標籤 |
|----|-------|------|
| P01 | 🤖 | Agent |
| P02 | 🔧 | 工具 |
| P03 | 📋 | 任務板 |
| P04 | 👥 | 子任務 |
| P05 | ⚡ | 技能 |
| P06 | 📊 | Context |
| P07 | 🗂️ | 任務鏈 |
| P08 | ⏰ | Cron |
| P09 | 🔗 | 團隊 |
| P10 | 📡 | 頻道 |
| P11 | 🌐 | Gateway |
| P12 | 🔀 | 模型 |

**Props：**
```tsx
interface WorkbenchDockProps {
  onOpen: (panelId: string) => void
}
```

---

## 5. WorkbenchDrawer

**位置：** `position: fixed; top: 0; right: 0; bottom: 0; width: 420px; z-[54]`

**進出動畫：** `translateX(100%)` → `translateX(0)`，200ms ease-out，CSS transition

**遮罩：** `position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-[53]`，點擊關閉 Drawer

**面板切換行為：**
`panel` prop 變化時（例如從 P01 切到 P02），直接置換 Drawer 內容，不保留前一面板的表單狀態。
（此路徑在目前 UX 上不可達：chip 點擊會先收合 Dock，需再次展開才能選其他面板，屆時 Drawer 已關閉。）

**面板結構：**
```
┌──────────────────────────────┐
│ [emoji] 面板名稱          [✕] │  ← 標題列（44px）
├──────────────────────────────┤
│  [視覺模式]  [JSON 模式]      │  ← Tab 切換（36px）
├──────────────────────────────┤
│                              │
│  面板內容（flex-1, overflow-y-auto） │
│                              │
├──────────────────────────────┤
│  [取消]           [儲存]     │  ← 底部操作列（52px，僅 P01 顯示）
└──────────────────────────────┘
```

**Tab 切換規則：**
- 視覺模式 ↔ JSON 模式切換時，**不丟失資料**（兩個 mode 共用同一份 `editedList` state）
- JSON 模式顯示 `editedList` 的 JSON，編輯後同步回 `editedList`
- 切 Tab 不觸發儲存，底部儲存按鈕兩個模式皆可用

**Props：**
```tsx
interface WorkbenchDrawerProps {
  panel: string | null
  onClose: () => void
}
```

---

## 6. JsonPreview

**功能：**
- 接收 `value: unknown`，`JSON.stringify(value, null, 2)` 後語法高亮（key 藍色、string 綠色、number/boolean 橙色、null 灰色）
- 右上角「複製」按鈕，複製後顯示 ✓ 並 1.5s 後還原
- `editable` prop：改為 `<textarea>`，`onChange` 只在 parse 合法時 fire，非法 JSON 顯示紅色邊框 + 錯誤訊息（不 fire onChange）

**Props：**
```tsx
interface JsonPreviewProps {
  value: unknown
  editable?: boolean
  onChange?: (parsed: unknown) => void
  className?: string
}
```

---

## 7. P01 Agent Loop

### 7.1 資料型別

```tsx
// 來自 /api/config 的 agents.list[] 格式（依 openclaw.json 規格）
interface AgentConfig {
  id: string
  name?: string
  agentDir: string
  workspace: string
  model?: string
  identity?: { name?: string; emoji?: string }
}

// /api/config 回傳的完整格式（相關欄位）
interface OpenclawConfig {
  agents: {
    list: AgentConfig[]
    defaults?: { model?: { primary?: string } }
  }
  models: {
    providers: Record<string, {
      models: Array<{ id: string; name?: string }>
    }>
  }
  // ... 其他欄位（gateway, channels, auth 等，不修改）
}
```

### 7.2 資料流

**兩個 API 用途不同，不可混用：**

| API | 用途 |
|-----|------|
| `GET /api/config/raw` | 取得原始 config 字串（含 gateway、auth、channels 等所有欄位），用於編輯後回寫 |
| `GET /api/config` | 取得計算後的 providers 陣列，用於 model 下拉選單 |

```
mount：
  1. GET /api/config/raw → { content: string }
     → rawConfig = content
     → editedList = deep copy of JSON.parse(rawConfig).agents.list
  2. GET /api/config → { providers: Array<{id, models:[{id,name?},...]}> }
     → modelOptions = providers.flatMap(p => p.models.map(m => `${p.id}/${m.id}`))

儲存流程：
  1. configObj = JSON.parse(rawConfig)（使用載入時的原始字串，保留所有欄位）
  2. configObj.agents.list = editedList
  3. POST /api/config/save { content: JSON.stringify(configObj, null, 2) }
  4. 成功 → rawConfig = JSON.stringify(configObj, null, 2)，顯示成功 toast
  5. 失敗 → 顯示失敗 toast，rawConfig 不更新
```

**注意：** 使用載入時的 `rawConfig` 作為儲存基礎，避免覆蓋 gateway/auth/channels 等非 agents 欄位。

### 7.3 視覺模式 — Agent 列表

每個 Agent 顯示：`[emoji] [name] · [id] · [model] [編輯] [刪除]`

互動規則：
- 點擊 Agent 列（或「編輯」按鈕）→ 展開 inline 表單（accordion）
- **同時只能展開一個**：展開新的自動收合當前
- 展開不同 Agent 時，若當前有待確認刪除 → **自動重置刪除確認狀態**

### 7.4 視覺模式 — 表單欄位

| 欄位 | 新增時 | 編輯時 | 說明 |
|------|--------|--------|------|
| `id` | 可填（必填）| 唯讀 | 重複 ID → 紅框 + 「ID 已存在」，儲存 disabled |
| `identity.name` | 可填 | 可填 | Agent 顯示名稱 |
| `identity.emoji` | 可填 | 可填 | 直接輸入 emoji 字元 |
| `model` | 下拉（可空） | 下拉（可空） | 來自 providers 展平，空 = 繼承 defaults |
| `workspace` | 可填 | 可填 | 路徑字串 |
| `agentDir` | 可填 | 可填 | 路徑字串 |

### 7.5 刪除確認

兩段式 inline（無 modal）：
1. 第一次點「刪除」→ 按鈕變紅顯示「確定？」
2. 3 秒無操作 → 自動恢復原狀
3. 展開其他 Agent accordion → 重置刪除確認
4. 第二次點「確定？」→ 從 `editedList` 移除（尚未儲存），需按「儲存」才寫入

### 7.6 JSON 模式

- JsonPreview editable=true，value = editedList（AgentConfig[]，非整個 config）
- 使用者直接編輯 JSON
- onChange fire → 更新 editedList
- 非法 JSON → 儲存按鈕 disabled
- 切回視覺模式 → 以最新 editedList 渲染（不丟失）

### 7.7 錯誤與 Loading 狀態

| 情境 | 處理 |
|------|------|
| GET /api/config 載入中 | 面板顯示 skeleton loader |
| GET /api/config 失敗 | 顯示「無法載入設定」+ 重試按鈕 |
| POST 成功 | 綠色 toast「已儲存」，2 秒消失 |
| POST 失敗 | 紅色 toast「儲存失敗：{message}」，4 秒或手動關閉 |
| JSON 非法（JSON 模式） | 儲存按鈕 disabled，JsonPreview 顯示紅框 + 錯誤文字 |
| id 重複（新增時） | 欄位紅框 + 「ID 已存在」，儲存按鈕 disabled |

### 7.8 Toast 實作

P01 內部維護一個 `toast` state：`{ type: 'success'|'error'; message: string } | null`
固定定位於 Drawer 內部頂部居中（相對 Drawer 定位，非全域）。
不引入全域 toast 系統。

---

## 8. PanelPlaceholder

```tsx
// 從 PANEL_DEFINITIONS（面板定義表）查 emoji + 標籤
// 顯示：大 emoji + 標籤名 + 「施工中，即將推出」
// 無互動，無 props（panelId 由 WorkbenchDrawer 透過 context 或 prop 傳入）
interface PanelPlaceholderProps {
  panelId: string
}
```

---

## 9. 共用常數（新建 panels/panelDefinitions.ts）

```tsx
export const PANEL_DEFINITIONS: Record<string, { emoji: string; label: string }> = {
  P01: { emoji: '🤖', label: 'Agent' },
  P02: { emoji: '🔧', label: '工具' },
  P03: { emoji: '📋', label: '任務板' },
  P04: { emoji: '👥', label: '子任務' },
  P05: { emoji: '⚡', label: '技能' },
  P06: { emoji: '📊', label: 'Context' },
  P07: { emoji: '🗂️', label: '任務鏈' },
  P08: { emoji: '⏰', label: 'Cron' },
  P09: { emoji: '🔗', label: '團隊' },
  P10: { emoji: '📡', label: '頻道' },
  P11: { emoji: '🌐', label: 'Gateway' },
  P12: { emoji: '🔀', label: '模型' },
}
```

---

## 10. 元件結構

```
app/pixel-office/
  page.tsx                              ← 新增 ~5 行（1 state + 2 JSX）
  components/
    WorkbenchDock.tsx                   ← 🆕
    WorkbenchDrawer.tsx                 ← 🆕
    JsonPreview.tsx                     ← 🆕
    panels/
      panelDefinitions.ts              ← 🆕 共用常數
      PanelPlaceholder.tsx             ← 🆕
      P01AgentLoop.tsx                 ← 🆕
```

---

## 11. page.tsx 改動（最小化）

```tsx
// 新增 1 個 state
const [workbenchPanel, setWorkbenchPanel] = useState<string | null>(null)

// JSX（緊接在 BossInteractionPanel 後方）
<WorkbenchDock onOpen={(id) => setWorkbenchPanel(id)} />
<WorkbenchDrawer
  panel={workbenchPanel}
  onClose={() => setWorkbenchPanel(null)}
/>

// imports
import { WorkbenchDock } from './components/WorkbenchDock'
import { WorkbenchDrawer } from './components/WorkbenchDrawer'
```

---

## 12. 不在此次範圍

- P02–P12 的真實實作
- `/api/skills/create` 和 `/api/cron` 新端點
- 手機端 Workbench 適配
- i18n 翻譯鍵（先 hardcode 中文）
- 全域 toast 系統
