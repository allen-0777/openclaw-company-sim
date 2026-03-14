# OpenClaw Bot Dashboard — 開發技術文件

> 最後更新：2026-03-14

---

## 目錄

1. [專案定位](#1-專案定位)
2. [技術棧](#2-技術棧)
3. [檔案結構地圖](#3-檔案結構地圖)
4. [核心概念與型別](#4-核心概念與型別)
5. [官方 JSON 格式速查](#5-官方-json-格式速查)
6. [API 端點總覽](#6-api-端點總覽)
7. [像素辦公室系統詳解](#7-像素辦公室系統詳解)
8. [已完成功能清單](#8-已完成功能清單)
9. [開發 Roadmap](#9-開發-roadmap)
10. [開發環境設定](#10-開發環境設定)
11. [常見問題](#11-常見問題)

---

## 1. 專案定位

**OpenClaw Bot Dashboard** 是一個**無後端資料庫**的 Next.js 儀表板，直接讀取本機 `~/.openclaw/openclaw.json` 及 JSONL 會話記錄，提供：

- 多 Agent 即時監控（狀態、Token、Cron Jobs、Subagents）
- **像素辦公室**（Pixel Office）：以像素風格遊戲視覺化呈現 Agent 工作狀態
- GUI 操作介面，底層嚴格對應 OpenClaw 官方 JSON 格式，不需要另學 CLI

**設計原則**
- 所有資料直接來自本地檔案，無需資料庫
- GUI 操作 = 讀寫官方 JSON，格式 100% 相容
- 像素辦公室是核心體驗入口，而非附加功能

---

## 2. 技術棧

| 層 | 技術 |
|----|------|
| Framework | Next.js 16 + React 19 + TypeScript |
| 樣式 | Tailwind CSS 4（CSS 變數主題） |
| 遊戲引擎 | Canvas 2D（自製 60fps 遊戲迴圈） |
| 國際化 | 自製 i18n Context（zh-TW / zh / en，500+ 翻譯鍵） |
| 部署 | `npm run dev` / Docker |

---

## 3. 檔案結構地圖

```
app/
├── page.tsx                      首頁：Agent 卡片牆
├── config/page.tsx               設定：Visual/JSON 雙模式編輯
├── models/page.tsx               模型：Provider 管理 + 單模型測試
├── sessions/page.tsx             會話：Token 用量 + Session 瀏覽
├── skills/page.tsx               技能：管理與篩選（builtin/extension/custom）
├── alerts/page.tsx               告警：規則設定 + 飛書通知
├── pixel-office/
│   ├── page.tsx                  像素辦公室主頁（~2400 行，含遊戲引擎整合）
│   └── components/
│       ├── BossInteractionPanel.tsx   角色互動面板（Status / Chat / Tasks 三 Tab）
│       ├── EditorToolbar.tsx          家具編輯工具列
│       └── EditActionBar.tsx          編輯模式快捷操作列
├── components/
│   ├── GlobalSetupCheck.tsx      安裝引導 Modal（CLI 未安裝時觸發）
│   ├── agent-card.tsx            Agent 狀態卡片（首頁使用）
│   └── pixel-office/
│       └── QuestBoard.tsx        龍蝦養成手冊 Modal
└── api/                          34 個 API 端點（詳見 §6）

lib/
├── i18n.tsx                      國際化（zh-TW / zh / en）
├── quest-system.ts               任務進度系統（phase 1 quests）
├── gateway-url.ts                Gateway URL 建構工具
├── config-cache.ts               設定 In-memory 快取（含 TTL）
├── openclaw-paths.ts             路徑常數（OPENCLAW_HOME、CONFIG_PATH 等）
├── openclaw-cli.ts               CLI 子行程執行封裝
├── openclaw-skills.ts            技能掃描（解析 SKILL.md frontmatter）
├── model-probe.ts                模型可用性探測
├── session-test-fallback.ts      Session 測試 + CLI fallback 邏輯
├── json.ts                       JSON 解析工具
└── pixel-office/
    ├── engine/
    │   ├── officeState.ts        辦公室狀態機（主控，角色/家具/座位管理）
    │   ├── renderer.ts           Canvas 渲染（tiles/sprites/UI/特效）
    │   ├── gameLoop.ts           遊戲迴圈（requestAnimationFrame）
    │   ├── characters.ts         角色創建 + 動畫狀態機
    │   └── matrixEffect.ts       Matrix 程式碼雨 + SRE 黑話特效
    ├── agentBridge.ts            Agent 活動 → 辦公室角色同步（核心橋接）
    ├── bugs/bugSystem.ts         蟲子物理模擬（費洛蒙場 + 空間網格）
    ├── editor/
    │   ├── editorState.ts        編輯器狀態
    │   └── editorActions.ts      編輯動作（塗刷/放置/旋轉/刪除）
    ├── layout/
    │   ├── furnitureCatalog.ts   家具目錄定義（含旋轉/尺寸）
    │   ├── layoutSerializer.ts   版面序列化 / 反序列化
    │   └── tileMap.ts            Tile 地圖 + A* 尋路 + 可行走性判斷
    ├── sprites/
    │   ├── spriteData.ts         精靈元資料 + 角色調色板
    │   ├── spriteCache.ts        精靈渲染快取
    │   └── pngLoader.ts          PNG 精靈載入
    ├── types.ts                  型別定義（TileType / CharacterState / Direction...）
    ├── constants.ts              遊戲常數（TILE_SIZE / 動畫時長 / 偏移量）
    ├── colorize.ts               調色板顏色位移工具
    ├── floorTiles.ts             地板 Tile 圖案與顏色
    ├── wallTiles.ts              牆壁 Tile 渲染
    ├── notificationSound.ts      音效 + 背景音樂播放
    └── useOfficeWebSocket.ts     WebSocket Hook（即時 log 推送）
```

---

## 4. 核心概念與型別

### AgentActivity（lib/pixel-office/agentBridge.ts）

```typescript
interface AgentActivity {
  agentId: string
  name: string
  emoji: string
  state: 'idle' | 'working' | 'waiting' | 'offline'
  currentTool?: string      // 目前執行中的工具名稱
  toolStatus?: string       // 工具執行狀態文字
  lastActive: number        // Unix timestamp (ms)
  subagents?: SubagentInfo[]
  cronJobs?: CronJobInfo[]
}

interface SubagentInfo {
  toolId: string
  label: string
  activityEvents?: Array<{ key: string; text: string; at: number }>
}

interface CronJobInfo {
  key: string
  jobId: string
  label: string
  isRunning: boolean
  lastRunAt: number
  nextRunAt?: number
  lastStatus: 'success' | 'running' | 'failed'
  lastSummary?: string
  consecutiveFailures: number
}
```

### 角色狀態機

```
offline  → 角色不顯示（自動移除）
idle     → 坐在桌前，黃色指示燈
waiting  → 等待泡泡 + 藍色指示燈
working  → 打字動畫 + 綠色指示燈 + 工具名氣泡浮現
```

### 資料輪詢頻率

| 資料 | 頻率 | 端點 |
|------|------|------|
| Agent 活動狀態 | 每 1 秒 | `/api/agent-activity` |
| Chat 訊息（對話面板開啟時）| 每 4 秒 | `/api/agent-messages` |
| Canvas 浮動訊息泡泡 | 每 3 秒 | `/api/agent-messages` |
| Agent 統計 | 每 30 秒 | `/api/config` |
| Gateway 健康 | 每 10 秒 | `/api/gateway-health` |

---

## 5. 官方 JSON 格式速查

### 主設定 `~/.openclaw/openclaw.json`

```json
{
  "agents": {
    "defaults": {
      "model": { "primary": "openai/gpt-4o", "fallbacks": ["anthropic/claude-3-5-sonnet"] }
    },
    "list": [
      {
        "id": "main",
        "name": "Main Agent",
        "agentDir": "~/.openclaw/agents/main",
        "workspace": "~/workspace",
        "model": "openai/gpt-4o",
        "identity": { "name": "Main", "emoji": "🤖" }
      }
    ]
  },
  "models": {
    "providers": {
      "openai": {
        "api": "https://api.openai.com/v1",
        "models": [
          { "id": "gpt-4o", "name": "GPT-4o", "contextWindow": 128000, "maxTokens": 16384 }
        ]
      }
    }
  },
  "auth": {
    "profiles": {
      "openai": { "api_key": "sk-..." }
    }
  },
  "gateway": {
    "port": 18789,
    "host": "localhost",
    "auth": { "token": "your-secure-token" }
  },
  "channels": {
    "feishu": {
      "enabled": true,
      "appId": "cli_xxx",
      "appSecret": "xxx",
      "encryptKey": "xxx",
      "dm": { "allowFrom": ["ou_xxx"] }
    },
    "discord": { "enabled": false }
  },
  "bindings": [
    { "agentId": "main", "match": { "channel": "feishu" } }
  ],
  "cron": { "store": "~/.openclaw/cron/jobs.json" }
}
```

### Cron Jobs `~/.openclaw/cron/jobs.json`

```json
{
  "jobs": [
    {
      "id": "daily-summary-001",
      "agentId": "main",
      "sessionKey": "agent:main:cron:daily-summary",
      "name": "Daily Summary",
      "enabled": true,
      "payload": {
        "kind": "message",
        "message": "請產出今日工作摘要"
      },
      "state": {
        "nextRunAtMs": 1741910400000,
        "lastRunAtMs": 1741824000000,
        "lastDurationMs": 3200,
        "lastStatus": "success",
        "consecutiveErrors": 0
      }
    }
  ]
}
```

### SKILL.md `~/.openclaw/skills/<skillId>/SKILL.md`

```markdown
---
name: "Web Search"
description: "搜尋網路資訊"
emoji: "🔍"
---

# Web Search Skill

此技能讓 Agent 能夠搜尋網路...
```

解析後型別：
```typescript
interface Skill {
  id: string           // 目錄名稱
  name: string
  description: string
  emoji: string
  source: 'builtin' | `extension:${string}` | 'custom'
  location: string     // 絕對路徑
  usedBy: string[]     // 使用此技能的 agentId 陣列
}
```

### Session JSONL `~/.openclaw/agents/<id>/sessions/<timestamp>.jsonl`

每行為一個 JSON 物件：

```jsonl
{"type":"message","message":{"role":"user","content":[{"type":"text","text":"Hello"}],"timestamp":"2026-03-14T10:00:00Z"}}
{"type":"message","message":{"role":"assistant","content":[{"type":"text","text":"Hi!"},{"type":"tool_use","id":"call_1","name":"exec","input":{"command":"ls"}}],"stopReason":"tool_use","usage":{"input":100,"output":50}}}
{"type":"message","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"call_1","content":"file1.txt\nfile2.txt"}]}}
```

---

## 6. API 端點總覽

### 設定類

| 端點 | Method | 說明 | 主要參數 |
|------|--------|------|---------|
| `/api/config` | GET | agents + providers + defaults + groupChats | — |
| `/api/config/raw` | GET | 原始 JSON 字串 | — |
| `/api/config/save` | POST | 寫入設定（自動備份至 `.bak`） | `content: string` |
| `/api/config/agent-model` | PATCH | 更新單一 agent 的 model | `agentId`, `model` |
| `/api/config/test-provider` | POST | 測試 provider API 連線 | `providerId`, `modelId` |

### Agent 狀態類

| 端點 | Method | 說明 | 主要參數 |
|------|--------|------|---------|
| `/api/agent-activity` | GET | 完整 `AgentActivity[]`（subagents + cronJobs） | — |
| `/api/agent-status` | GET | 簡化狀態（working/idle/offline） | — |
| `/api/agent-messages` | GET | 最近 30 條對話訊息 | `agentId`, `since`（timestamp） |

### 對話 / 測試類

| 端點 | Method | 說明 | 主要參數 |
|------|--------|------|---------|
| `/api/test-session` | POST | **送訊息給 Agent**（走 Gateway HTTP） | `agentId`, `sessionKey`, `text` |
| `/api/test-agents` | POST | 批次測試所有 agent model | — |
| `/api/test-agent-model` | POST | 測試單一 agent model | `agentId` |
| `/api/test-model` | POST | 測試任意 provider/model | `providerId`, `modelId` |
| `/api/test-platforms` | POST | 測試所有頻道綁定 | — |
| `/api/test-sessions` | POST | 測試所有 main session | — |
| `/api/test-dm-sessions` | POST | 測試所有 DM session | — |

> **`/api/test-session` 重要細節**
> - 優先走 Gateway HTTP：`POST http://127.0.0.1:{port}/v1/chat/completions`
> - Headers：`x-openclaw-agent-id`、`x-openclaw-session-key`、`Authorization: Bearer {token}`
> - HTTP 失敗才 fallback 到 CLI（`lib/session-test-fallback.ts`）
> - **只要 Gateway 在跑就能對話，不受 Node.js 版本限制**

### 統計類

| 端點 | Method | 說明 |
|------|--------|------|
| `/api/stats-all` | GET | 全局 token + 回應時間趨勢（日/週/月） |
| `/api/stats/[agentId]` | GET | 單一 agent 詳細統計 |
| `/api/stats-models` | GET | 各模型用量統計 |
| `/api/activity-heatmap` | GET | Agent 活動熱力圖資料 |

### 像素辦公室類

| 端點 | Method | 說明 |
|------|--------|------|
| `/api/pixel-office/layout` | GET/POST | 版面讀寫（`~/.openclaw/pixel-office/layout.json`） |
| `/api/pixel-office/version` | GET | 版本資訊 |
| `/api/pixel-office/tracks` | GET | 背景音樂清單 |
| `/api/pixel-office/idle-rank` | GET | Agent 閒置排行 |
| `/api/pixel-office/contributions` | GET | GitHub 貢獻圖資料 |

### 其他

| 端點 | Method | 說明 |
|------|--------|------|
| `/api/gateway-health` | GET | Gateway 健康（版本 + 延遲 + 狀態） |
| `/api/skills` | GET | 所有技能清單 |
| `/api/skills/content` | GET | 單一技能 SKILL.md 內容（`skillId` param） |
| `/api/alerts` | GET/POST | 告警規則讀寫 |
| `/api/alerts/check` | GET/POST | 觸發告警檢查（可發飛書通知） |
| `/api/quests` | GET | 任務手冊進度 |
| `/api/sessions/[agentId]` | GET | 列出 agent 所有 session（含 token 用量） |
| `/api/setup-script/generate` | GET | 生成 macOS 一鍵安裝腳本 |

---

## 7. 像素辦公室系統詳解

### 整體資料流

```
/api/agent-activity（每 1 秒）
        ↓
agentBridge.syncAgentsToOffice()
        ↓
officeState.ts（角色狀態機）
        ↓
renderer.ts（Canvas 渲染，60fps）
        ↓
用戶看到的像素辦公室畫面
```

### 角色點擊互動流程

```
canvas.handleMouseDown
        ↓
officeState.getCharacterAt(worldX, worldY) → charId
        ↓
agentIdMapRef: charId → agentId
        ↓
setBossPanelAgent({ id, name, emoji })
setBossPanelMessages([])   ← 清空舊訊息
        ↓
BossInteractionPanel 開啟
```

### BossInteractionPanel 三個 Tab

**📊 狀態 Tab**
- Agent 狀態 badge（🟢 working / 🟡 idle / 🔵 waiting / ⚫ offline）
- 最後活躍時間（相對時間：`2m ago`）
- 目前執行工具（`currentTool` + `toolStatus`）
- Subagents 清單（每個 subagent 的最新活動事件）
- Cron Jobs 清單（狀態 + 下次執行時間 + 最後摘要）
- Session 統計（Tokens / Sessions / Messages）

**💬 對話 Tab**
- 對話歷史（user/agent 訊息泡泡）
- 快速指令按鈕（Wake Up / Status / Check Logs）
- 輸入框（Enter 送出，Shift+Enter 換行）
- 外部 session 訊息同步（每 4 秒 poll `/api/agent-messages`）

**📋 任務 Tab**
- 6 個快速模板按鈕（摘要報告 / 調查問題 / 清理 / 打包發布 / 修復 Bug / 產出報表）
- 任務描述 textarea
- 優先級選擇（🔴 高 / 🟡 中 / 🟢 低）
- 附加 Context 欄位（可選）
- 派遣 → 自動跳轉對話 Tab

### Canvas 特效系統

| 特效 | 觸發條件 | 實作位置 |
|------|---------|---------|
| 程式碼片段浮動 | agent 執行工具 | `officeState.pushCodeSnippet()` |
| 對話泡泡浮現 | 新訊息到達 | `chat-bubble` 系統 |
| Matrix 程式碼雨 | 角色消失/出現 | `matrixEffect.ts` |
| SRE 黑話 | Gateway SRE 角色 | `matrixEffect.ts` |
| 蟲子爬行 | 背景裝飾 | `bugSystem.ts`（費洛蒙場物理） |
| 角色入場動畫 | 新 agent 上線 | `officeState.addAgent()` |

---

## 8. 已完成功能清單

### 核心監控
- ✅ Agent 卡片牆（首頁，含平台綁定 + Token 趨勢圖）
- ✅ 模型 Provider 管理 + 單模型連線測試
- ✅ 會話列表 + Token 用量統計
- ✅ 訊息統計圖表（SVG sparklines，日/週/月）
- ✅ 技能管理（builtin / extension / custom，含搜尋篩選）
- ✅ 告警中心（規則設定 + 飛書通知推送）
- ✅ Gateway 健康檢查（CLI 版本 + HTTP 延遲 + 狀態指示燈）

### 設定管理
- ✅ Visual 模式表單編輯（各欄位有說明）
- ✅ JSON 模式直接編輯原始設定
- ✅ 儲存自動備份（`.bak` 檔）
- ✅ Agent Model 切換（卡片上直接操作）

### 像素辦公室
- ✅ 60fps Canvas 遊戲引擎
- ✅ Agent 角色自動生成與同步
- ✅ 角色狀態即時反映（working / idle / waiting / offline）
- ✅ 浮動工具名氣泡（currentTool）
- ✅ Subagent 子角色顯示（含活動事件）
- ✅ Cron Job 時鐘氣泡
- ✅ 對話訊息浮動泡泡（Canvas 層）
- ✅ 家具編輯器（放置 / 旋轉 / 刪除 / 顏色）
- ✅ 地板 / 牆壁繪製工具（多種圖案）
- ✅ 版面持久化（`~/.openclaw/pixel-office/layout.json`）
- ✅ Matrix 特效
- ✅ 蟲子物理模擬（BugSystem）
- ✅ Gateway SRE 特殊監控角色
- ✅ 角色點擊 → BossInteractionPanel（Status/Chat/Tasks）
- ✅ 背景音樂 + 通知音效
- ✅ QuestBoard 龍蝦養成手冊（Phase 1）

### 基礎設施
- ✅ GlobalSetupCheck（CLI 未安裝時自動彈出引導）
- ✅ i18n（zh-TW / zh / en，500+ 翻譯鍵）
- ✅ 深色 / 淺色主題切換
- ✅ 響應式 Mobile 適配
- ✅ Docker 部署支援

---

## 9. 開發 Roadmap

### 像素辦公室 GUI 工作台（12 個模組，待實作）

目標：在像素辦公室內新增一個**浮動工具列**，點擊任意功能後右側滑出操作面板。面板有「視覺模式」（表單）和「JSON 模式」（可直接編輯官方格式）雙切換。

**架構**
```
WorkbenchDock（右下角浮動工具列）
    ↓ 點擊任意圖示
WorkbenchDrawer（右側 420px 滑出面板）
    ├── 視覺模式（表單輸入）
    └── JSON 模式（即時預覽 + 直接編輯）
            ↓ 儲存
    /api/config/save → ~/.openclaw/openclaw.json
```

**12 個面板對應功能**

| 面板 | 功能描述 | 讀寫位置 |
|------|---------|---------|
| **P01** Agent Loop | Agent 新增 / 編輯 / 刪除表單 | `agents.list[]` |
| **P02** Tool Use | 即時執行指令 + tool_use 解析視覺化 | 呼叫 `/api/test-session` |
| **P03** TodoWrite | 看板式任務板（pending/in_progress/completed）→ 傳給 Agent | 組合 prompt |
| **P04** Subagents | 派遣子任務 + 活動串流監控 | poll `/api/agent-activity` |
| **P05** Skills | SKILL.md 瀏覽 / 新增 / 編輯 | `~/.openclaw/skills/` |
| **P06** Context Compact | Token 進度條 + 壓縮觸發 | 讀 `session.contextTokens` |
| **P07** Task System | DAG 視覺化任務相依設定 | 組合結構化 prompt |
| **P08** Background Tasks | Cron Job 完整 CRUD（新增/暫停/刪除） | `~/.openclaw/cron/jobs.json` |
| **P09** Agent Teams | Agent ↔ Channel 拖拉式綁定管理 | `bindings[]` |
| **P10** Team Protocols | 頻道設定（feishu/discord/telegram）+ 測試 | `channels` |
| **P11** Autonomous Agents | Gateway + Auth 設定 + 健康測試 | `gateway` + `auth.profiles` |
| **P12** Worktree Isolation | Model Provider 管理 + 模型探測 | `models.providers` |

**需要新增的檔案**
```
app/pixel-office/components/
    WorkbenchDock.tsx           浮動工具列（12 個圖示）
    WorkbenchDrawer.tsx         右側滑出面板殼
    JsonPreview.tsx             JSON 預覽（語法高亮 + 複製）
    panels/
        P01AgentLoop.tsx
        P02ToolUse.tsx
        P03TodoWrite.tsx
        P04Subagents.tsx
        P05Skills.tsx
        P06ContextCompact.tsx
        P07TaskSystem.tsx
        P08BackgroundTasks.tsx
        P09AgentTeams.tsx
        P10TeamProtocols.tsx
        P11AutonomousAgents.tsx
        P12WorktreeIsolation.tsx

app/api/
    skills/create/route.ts      寫入新 SKILL.md
    cron/route.ts               GET/POST/DELETE cron jobs
```

---

## 10. 開發環境設定

### 快速啟動

```bash
# Clone
git clone https://github.com/allen-0777/openclaw-company-sim.git
cd openclaw-company-sim

# 安裝依賴
npm install

# 啟動開發服務器
npm run dev
# → http://localhost:3000

# 型別檢查
npx tsc --noEmit

# 自訂 OpenClaw 設定路徑
OPENCLAW_HOME=/opt/openclaw npm run dev
```

### 環境需求

| 項目 | 版本 / 說明 |
|------|------------|
| Node.js | ≥ 22.16.0（OpenClaw CLI 要求） |
| OpenClaw CLI | 已安裝，`~/.openclaw/openclaw.json` 存在 |
| OpenClaw Gateway | 運行中（預設 port 18789） |

> **Chat 對話功能的重要說明**
>
> `/api/test-session` 優先走 **Gateway HTTP API**，不走 CLI 子行程：
> ```
> POST http://127.0.0.1:18789/v1/chat/completions
> Headers:
>   x-openclaw-agent-id: {agentId}
>   x-openclaw-session-key: {sessionKey}
>   Authorization: Bearer {token}
> ```
> 只要 Gateway 在跑（`openclaw gateway start` 或背景服務），對話功能就能正常使用，不受 Node.js 版本限制。

### 主題 / i18n 設定

- 主題：`localStorage.setItem('theme', 'dark' | 'light')`
- 語言：`localStorage.setItem('locale', 'zh-TW' | 'zh' | 'en')`

### Docker 部署

```bash
docker build -t openclaw-dashboard .
docker run -d \
  -p 3000:3000 \
  -v ~/.openclaw:/root/.openclaw \
  openclaw-dashboard
```

---

## 11. 常見問題

**Q：對話框出現 `openclaw requires Node >=22.16.0`**

原因：Gateway HTTP 呼叫失敗，觸發了 CLI fallback，CLI 做了 Node 版本檢查。

解法：
1. 確認 OpenClaw Gateway 正在運行 → 右上角指示燈應為綠色
2. 若需使用 CLI，升級 Node：`nvm install 22.16.0 && nvm use 22.16.0 && nvm alias default 22.16.0`

---

**Q：`Config was last written by a newer OpenClaw (2026.x.xx)`**

升級 CLI：
```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

---

**Q：像素辦公室沒有任何角色**

1. 確認 `~/.openclaw/openclaw.json` 的 `agents.list` 有設定至少一個 agent
2. 確認 Gateway 健康（右上角指示燈 🟢）
3. 嘗試重整頁面

---

**Q：修改設定後沒有生效**

- 確認儲存的是 `~/.openclaw/openclaw.json`
- 若使用自訂路徑，需設定環境變數：`OPENCLAW_HOME=/your/path`
- 部分設定（如 channels）需要重啟 Gateway 才生效

---

**Q：如何新增翻譯鍵**

在 `lib/i18n.tsx` 的三個 locale 物件（`zh-TW`、`zh`、`en`）各加一行：
```typescript
"your.key": "翻譯文字",
```
使用：`const { t } = useI18n(); t('your.key')`

---

*本文件由開發對話自動整理生成，如有變更請同步更新。*
