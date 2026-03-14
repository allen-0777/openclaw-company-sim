import { NextResponse } from "next/server";
import fs from "fs";
import { OPENCLAW_CONFIG_PATH } from "@/lib/openclaw-paths";

export async function POST(req: Request) {
  try {
    const { content } = await req.json();
    if (typeof content !== "string") {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }

    // Basic validation: ensure it's valid JSON
    try {
      JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
    }

    // Create backup
    if (fs.existsSync(OPENCLAW_CONFIG_PATH)) {
      const backupPath = `${OPENCLAW_CONFIG_PATH}.bak`;
      fs.copyFileSync(OPENCLAW_CONFIG_PATH, backupPath);
    }

    // Write new content
    fs.writeFileSync(OPENCLAW_CONFIG_PATH, content, "utf-8");

    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
