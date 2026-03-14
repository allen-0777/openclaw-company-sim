import { NextResponse } from "next/server";
import fs from "fs";
import { OPENCLAW_CONFIG_PATH } from "@/lib/openclaw-paths";

export async function GET() {
  try {
    if (!fs.existsSync(OPENCLAW_CONFIG_PATH)) {
      return NextResponse.json({ error: "Config file not found" }, { status: 404 });
    }
    const content = fs.readFileSync(OPENCLAW_CONFIG_PATH, "utf-8");
    return NextResponse.json({ content });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
