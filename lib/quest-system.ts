import fs from "fs";
import path from "path";
import { OPENCLAW_HOME, OPENCLAW_CONFIG_PATH } from "@/lib/openclaw-paths";

const QUESTS_FILE = path.join(OPENCLAW_HOME, "quests.json");

export type QuestStatus = "locked" | "active" | "completed";

export interface Quest {
  id: string;
  phase: number;
  titleKey: string; // i18n key
  descKey: string;  // i18n key
  taskKey: string;  // i18n key
  status: QuestStatus;
  progress: number; // 0 to 100
  actionLink?: string; // URL to redirect
  actionLabelKey?: string; // i18n key
}

export interface QuestPhase {
  id: number;
  titleKey: string;
  descKey: string;
  quests: Quest[];
}

const DEFAULT_QUESTS: Quest[] = [
  // Phase 1: Loop Basics
  {
    id: "s01",
    phase: 1,
    titleKey: "quest.s01.title",
    descKey: "quest.s01.desc",
    taskKey: "quest.s01.task",
    status: "active", // First quest is active by default
    progress: 0,
    actionLink: "/config",
    actionLabelKey: "quest.action.goConfig",
  },
  {
    id: "s02",
    phase: 1,
    titleKey: "quest.s02.title",
    descKey: "quest.s02.desc",
    taskKey: "quest.s02.task",
    status: "locked",
    progress: 0,
    actionLink: "/skills",
    actionLabelKey: "quest.action.goConfig", // Or skills page
  },
  // Future phases can be added here
];

export function getQuests(): Quest[] {
  let storedQuests: Record<string, Quest> = {};
  
  if (fs.existsSync(QUESTS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(QUESTS_FILE, "utf-8"));
      if (Array.isArray(data)) {
        data.forEach((q: Quest) => {
          storedQuests[q.id] = q;
        });
      }
    } catch (e) {
      console.error("Failed to parse quests.json", e);
    }
  }

  // Merge defaults with stored state
  return DEFAULT_QUESTS.map(def => {
    const stored = storedQuests[def.id];
    if (stored) {
      return { ...def, status: stored.status, progress: stored.progress };
    }
    return def;
  });
}

export function saveQuestProgress(id: string, updates: Partial<Quest>) {
  const quests = getQuests();
  const index = quests.findIndex(q => q.id === id);
  if (index !== -1) {
    quests[index] = { ...quests[index], ...updates };
    
    // Auto-unlock next quest if completed
    if (updates.status === "completed") {
      const currentPhase = quests[index].phase;
      const nextQuestIndex = quests.findIndex(q => q.phase === currentPhase && q.id !== id && q.status === "locked");
      if (nextQuestIndex !== -1) {
        // Simple logic: unlock next in same phase. 
        // For strict ordering s01 -> s02, we can check IDs.
        if (id === "s01" && quests.find(q => q.id === "s02")?.status === "locked") {
             const s02Idx = quests.findIndex(q => q.id === "s02");
             if (s02Idx !== -1) quests[s02Idx].status = "active";
        }
      }
    }

    fs.writeFileSync(QUESTS_FILE, JSON.stringify(quests, null, 2));
  }
}

export function checkQuestCompletion(id: string): boolean {
  // This function will contain the logic to verify if a quest is actually done
  // by inspecting the system state (config files, logs, etc.)
  
  if (id === "s01") {
    // s01: Agent Loop - Check if any agent exists and has sent a message recently?
    // For now, simple check: Is there at least 1 agent in config?
    try {
      if (fs.existsSync(OPENCLAW_CONFIG_PATH)) {
        const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG_PATH, "utf-8"));
        return Array.isArray(config.agents?.list) && config.agents.list.length > 0;
      }
    } catch { return false; }
  }
  
  if (id === "s02") {
    // s02: Tool Use - Check if any agent has a skill (besides builtin ones)?
    // Or check logs for tool usage?
    // Let's check if any agent has "skills" configured in openclaw.json
    try {
      if (fs.existsSync(OPENCLAW_CONFIG_PATH)) {
        const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG_PATH, "utf-8"));
        if (Array.isArray(config.agents?.list)) {
           // Check if any agent has a skill other than defaults
           // This is a weak check, ideally we check execution logs.
           // But for "setup" phase, configuration presence is a good proxy.
           return config.agents.list.some((a: any) => Array.isArray(a.skills) && a.skills.length > 0);
        }
      }
    } catch { return false; }
  }

  return false;
}
