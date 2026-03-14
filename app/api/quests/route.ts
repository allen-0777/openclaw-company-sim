import { NextResponse } from "next/server";
import { getQuests, checkQuestCompletion, saveQuestProgress } from "@/lib/quest-system";

export async function GET() {
  try {
    const quests = getQuests();
    let updated = false;

    // Auto-check active quests
    for (const quest of quests) {
      if (quest.status === "active") {
        const isComplete = checkQuestCompletion(quest.id);
        if (isComplete) {
          saveQuestProgress(quest.id, { status: "completed", progress: 100 });
          updated = true;
        }
      }
    }

    // If updated, fetch again to get the latest state (including unlocked next quests)
    const finalQuests = updated ? getQuests() : quests;
    
    return NextResponse.json({ quests: finalQuests });
  } catch (error) {
    console.error("Error fetching quests:", error);
    return NextResponse.json({ error: "Failed to fetch quests" }, { status: 500 });
  }
}
