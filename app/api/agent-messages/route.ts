import { NextResponse } from "next/server";
import { promises as fs, existsSync } from "fs";
import path from "path";
import { OPENCLAW_AGENTS_DIR } from "@/lib/openclaw-paths";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_MESSAGES = 30;
const MAX_LINE_SCAN = 200;

interface ParsedMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

function extractUserText(content: unknown[]): string {
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    if (b.type !== "text" || typeof b.text !== "string") continue;
    let text = b.text;
    const metaEnd = text.indexOf("] ");
    if (text.includes("Sender (untrusted metadata)") && metaEnd > 0) {
      text = text.slice(metaEnd + 2);
    }
    return text.trim();
  }
  return "";
}

function extractAssistantText(content: unknown[]): string {
  const parts: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    if (b.type === "text" && typeof b.text === "string") {
      parts.push(b.text.trim());
    }
  }
  return parts.join("\n");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const agentId = url.searchParams.get("agentId");
  const sinceParam = url.searchParams.get("since");
  const since = sinceParam ? parseInt(sinceParam, 10) : 0;

  if (!agentId) {
    return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
  }

  const sessionsDir = path.join(OPENCLAW_AGENTS_DIR, agentId, "sessions");
  if (!existsSync(sessionsDir)) {
    return NextResponse.json({ messages: [] });
  }

  try {
    const indexPath = path.join(sessionsDir, "sessions.json");
    if (!existsSync(indexPath)) {
      return NextResponse.json({ messages: [] });
    }

    const indexRaw = await fs.readFile(indexPath, "utf8");
    const sessionsIndex = JSON.parse(indexRaw) as Record<
      string,
      { sessionId?: string; updatedAt?: number }
    >;

    let newestKey = "";
    let newestUpdate = 0;
    for (const [key, meta] of Object.entries(sessionsIndex)) {
      if (key.includes(":subagent:")) continue;
      if (key.includes(":boss-mode")) continue;
      const upd = meta?.updatedAt ?? 0;
      if (upd > newestUpdate) {
        newestUpdate = upd;
        newestKey = key;
      }
    }

    if (!newestKey || !sessionsIndex[newestKey]?.sessionId) {
      return NextResponse.json({ messages: [] });
    }

    const sessionId = sessionsIndex[newestKey].sessionId!;
    const transcriptPath = path.join(sessionsDir, `${sessionId}.jsonl`);
    if (!existsSync(transcriptPath)) {
      return NextResponse.json({ messages: [] });
    }

    const raw = await fs.readFile(transcriptPath, "utf8");
    const allLines = raw.split("\n").filter((l) => l.trim());
    const linesToScan = allLines.slice(-MAX_LINE_SCAN);

    const messages: ParsedMessage[] = [];

    for (const line of linesToScan) {
      let record: any;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }

      if (record?.type !== "message" || !record?.message) continue;

      const msg = record.message;
      const role = msg.role;
      if (role !== "user" && role !== "assistant") continue;

      const content = Array.isArray(msg.content) ? msg.content : [];

      let ts = 0;
      if (typeof record.timestamp === "string") {
        ts = Date.parse(record.timestamp);
      } else if (typeof msg.timestamp === "number") {
        ts = msg.timestamp;
      }

      if (since > 0 && ts > 0 && ts <= since) continue;

      const text =
        role === "user"
          ? extractUserText(content)
          : extractAssistantText(content);

      if (!text) continue;

      messages.push({
        id: record.id || `${ts}-${role}`,
        role,
        text: text.length > 500 ? text.slice(0, 497) + "..." : text,
        timestamp: ts || Date.now(),
      });
    }

    const trimmed = messages.slice(-MAX_MESSAGES);

    return NextResponse.json(
      {
        messages: trimmed,
        sessionKey: newestKey,
        lastUpdate: newestUpdate,
      },
      { headers: { "Cache-Control": "no-store, no-cache, max-age=0" } }
    );
  } catch (error) {
    console.error("Error reading agent messages:", error);
    return NextResponse.json({ messages: [] });
  }
}
