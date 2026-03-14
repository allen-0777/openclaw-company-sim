import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { providerId, baseUrl, apiKey } = await req.json();

    if (!baseUrl) {
      return NextResponse.json({ ok: false, error: "Base URL is required" }, { status: 400 });
    }

    // Normalize URL: remove trailing slash
    const cleanUrl = baseUrl.replace(/\/$/, "");
    // Assume OpenAI compatible /v1/models endpoint
    // Some providers might need different paths, but /models is standard for OpenAI/Ollama/vLLM
    const testUrl = `${cleanUrl}/models`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const res = await fetch(testUrl, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ 
            ok: false, 
            error: `HTTP ${res.status}: ${text.slice(0, 100)}` 
        });
      }

      const data = await res.json();
      // Check if data looks like a models list
      const count = Array.isArray(data.data) ? data.data.length : 0;
      
      return NextResponse.json({ 
        ok: true, 
        message: `Successfully connected! Found ${count} models.` 
      });

    } catch (fetchErr: any) {
      clearTimeout(timeout);
      return NextResponse.json({ 
        ok: false, 
        error: fetchErr.name === "AbortError" ? "Connection timed out" : fetchErr.message 
      });
    }

  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
