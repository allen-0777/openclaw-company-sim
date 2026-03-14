"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

// Standard OpenClaw configuration template
const DEFAULT_CONFIG = {
  identity: {
    name: "MyBot",
    emoji: "🤖",
    theme: "helpful assistant"
  },
  agent: {
    workspace: "~/.openclaw/workspace",
    model: {
      primary: "openai/gpt-4o",
      fallbacks: ["anthropic/claude-3-5-sonnet"]
    }
  },
  models: {
    providers: {
      openai: {
        api: "https://api.openai.com/v1",
        models: [
          { id: "gpt-4o", contextWindow: 128000 },
          { id: "gpt-3.5-turbo", contextWindow: 16000 }
        ]
      }
    }
  },
  auth: {
    profiles: {
      openai: {
        api_key: "YOUR_OPENAI_API_KEY"
      }
    }
  },
  channels: {
    feishu: {
      enabled: false,
      appId: "",
      appSecret: "",
      encryptKey: ""
    }
  },
  gateway: {
    port: 18789,
    auth: {
      token: "your-secure-token"
    }
  }
};

export default function ConfigPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"visual" | "json">("visual");
  const [rawConfig, setRawConfig] = useState("");
  const [parsedConfig, setParsedConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/raw");
      const data = await res.json();
      if (res.ok) {
        setRawConfig(data.content);
        try {
          const parsed = JSON.parse(data.content);
          setParsedConfig(parsed);
          // Auto-switch to JSON mode if it looks like an empty or invalid config
          if (!parsed.agent && !parsed.agents) {
             setMode("json");
          }
        } catch {
          // If JSON is invalid, force JSON mode
          setMode("json");
          setError("Invalid JSON detected. Switched to JSON mode.");
        }
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setStatus(null);
    
    let contentToSave = rawConfig;
    
    if (mode === "visual") {
      // In visual mode, serialize parsedConfig back to JSON
      contentToSave = JSON.stringify(parsedConfig, null, 2);
    }

    try {
      const res = await fetch("/api/config/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentToSave }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("Configuration saved successfully!");
        setRawConfig(contentToSave);
        if (mode === "json") {
            try {
                setParsedConfig(JSON.parse(contentToSave));
            } catch {}
        }
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(t("config.confirmReset"))) return;
    const defaultConfigStr = JSON.stringify(DEFAULT_CONFIG, null, 2);
    setRawConfig(defaultConfigStr);
    setParsedConfig(DEFAULT_CONFIG);
    setStatus("Reset to default template. Please fill in your API keys and save.");
    setMode("json"); // Switch to JSON mode so they can see/edit keys easily
  };

  if (loading) return (
    <div className="flex flex-col h-full bg-[#0f1117] items-center justify-center">
        <div className="text-gray-500 animate-pulse">{t("common.loading")}</div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#0f1117] text-gray-200 overflow-hidden">
      <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-[#2e344e] bg-[#161821] shadow-md z-10">
        <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          ⚙️ {t("config.title")}
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 border border-transparent hover:border-red-900/30 transition-all mr-2"
          >
            🗑️ {t("config.resetDefault")}
          </button>
          <div className="flex bg-[#0f1117] rounded-lg p-1 border border-[#2e344e]">
            <button
              onClick={() => setMode("visual")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === "visual"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {t("config.visual")}
            </button>
            <button
              onClick={() => setMode("json")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === "json"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {t("config.json")}
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-green-900/20 active:scale-95"
          >
            {saving ? (
                <>
                <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
                {t("config.saving")}
                </>
            ) : t("config.save")}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar">
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 text-red-200 rounded-lg text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <span className="text-lg">❌</span>
            <div>
                <div className="font-semibold mb-1">Error</div>
                {error}
            </div>
          </div>
        )}
        {status && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 text-green-200 rounded-lg text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <span className="text-lg">✅</span>
            {status}
          </div>
        )}

        {mode === "visual" ? (
          <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <VisualEditor config={parsedConfig} onChange={setParsedConfig} t={t} />
          </div>
        ) : (
          <div className="h-full relative rounded-lg overflow-hidden border border-[#2e344e] shadow-inner bg-[#0d0e12]">
            <textarea
              value={rawConfig}
              onChange={(e) => setRawConfig(e.target.value)}
              className="w-full h-full bg-transparent text-gray-300 font-mono text-sm p-4 focus:outline-none resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function VisualEditor({ config, onChange, t }: { config: any; onChange: (cfg: any) => void; t: (k: string) => string }) {
  // Deep clone helper
  const updateConfig = (newConfig: any) => {
    onChange(newConfig);
  };

  const handleChange = (path: string, value: any) => {
    const newConfig = JSON.parse(JSON.stringify(config));
    const parts = path.split(".");
    let current = newConfig;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    onChange(newConfig);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Gateway Settings */}
      <section className="bg-[#161821] rounded-xl border border-[#2e344e] p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-100 mb-4 pb-2 border-b border-[#2e344e] flex items-center gap-2">
          🌐 {t("config.gateway")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">{t("config.gatewayPort")}</label>
            <input
              type="number"
              value={config.gateway?.port || 18789}
              onChange={(e) => handleChange("gateway.port", parseInt(e.target.value))}
              className="w-full bg-[#0f1117] border border-[#2e344e] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">{t("config.gatewayToken")}</label>
            <input
              type="password"
              value={config.gateway?.auth?.token || ""}
              onChange={(e) => handleChange("gateway.auth.token", e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2e344e] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
              placeholder={t("config.gatewayTokenPlaceholder")}
            />
          </div>
        </div>
      </section>

      {/* Agents List */}
      <section className="bg-[#161821] rounded-xl border border-[#2e344e] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#2e344e]">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            🤖 {t("config.agents")}
            </h2>
            <button 
                onClick={() => {
                    const newList = [...(config.agents?.list || [])];
                    newList.push({ id: `agent-${Date.now().toString().slice(-4)}`, name: "New Agent", identity: { emoji: "🤖" }, model: "openai/gpt-4o" });
                    handleChange("agents.list", newList);
                }}
                className="px-2 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded text-xs transition-colors"
            >
                {t("config.addAgent")}
            </button>
        </div>
        <div className="space-y-3">
          {(config.agents?.list || []).map((agent: any, idx: number) => (
            <div key={idx} className="bg-[#0f1117] border border-[#2e344e] rounded-lg p-4 flex flex-col gap-3 group">
              <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-gray-500">#{idx + 1}</div>
                  <button 
                    onClick={() => {
                        if(!confirm(t("config.confirmDelete"))) return;
                        const newList = [...(config.agents?.list || [])];
                        newList.splice(idx, 1);
                        handleChange("agents.list", newList);
                    }}
                    className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-opacity text-xs"
                  >
                    {t("config.deleteAgent")}
                  </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-3">
                    <label className="block text-[10px] uppercase text-gray-500 mb-1">{t("config.agentId")}</label>
                    <input
                    value={agent.id || ""}
                    onChange={(e) => {
                        const newList = [...(config.agents?.list || [])];
                        newList[idx] = { ...agent, id: e.target.value };
                        handleChange("agents.list", newList);
                    }}
                    className="w-full bg-[#1a1d26] border border-[#2e344e] rounded px-2 py-1.5 text-xs text-gray-300 focus:border-blue-500/50 outline-none"
                    />
                </div>
                <div className="md:col-span-4">
                    <label className="block text-[10px] uppercase text-gray-500 mb-1">{t("config.agentName")}</label>
                    <input
                    value={agent.name || ""}
                    onChange={(e) => {
                        const newList = [...(config.agents?.list || [])];
                        newList[idx] = { ...agent, name: e.target.value };
                        handleChange("agents.list", newList);
                    }}
                    className="w-full bg-[#161821] border border-[#2e344e] rounded px-2 py-1.5 text-xs text-gray-200 focus:border-blue-500/50 outline-none"
                    />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-[10px] uppercase text-gray-500 mb-1">{t("config.agentEmoji")}</label>
                    <input
                    value={agent.identity?.emoji || ""}
                    onChange={(e) => {
                        const newList = [...(config.agents?.list || [])];
                        newList[idx] = { ...agent, identity: { ...agent.identity, emoji: e.target.value } };
                        handleChange("agents.list", newList);
                    }}
                    className="w-full bg-[#161821] border border-[#2e344e] rounded px-2 py-1.5 text-xs text-center text-gray-200 focus:border-blue-500/50 outline-none"
                    />
                </div>
                <div className="md:col-span-4">
                    <label className="block text-[10px] uppercase text-gray-500 mb-1">{t("config.agentModel")}</label>
                    <input
                    value={agent.model || ""}
                    onChange={(e) => {
                        const newList = [...(config.agents?.list || [])];
                        newList[idx] = { ...agent, model: e.target.value };
                        handleChange("agents.list", newList);
                    }}
                    className="w-full bg-[#161821] border border-[#2e344e] rounded px-2 py-1.5 text-xs text-gray-200 focus:border-blue-500/50 outline-none font-mono"
                    placeholder="e.g. openai/gpt-4"
                    />
                </div>
              </div>
            </div>
          ))}
          {(!config.agents?.list || config.agents.list.length === 0) && (
            <div className="text-sm text-gray-500 italic text-center py-4 border border-dashed border-[#2e344e] rounded-lg">
              {t("config.noAgents")}
            </div>
          )}
        </div>
      </section>

      {/* Model Providers */}
      <section className="bg-[#161821] rounded-xl border border-[#2e344e] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#2e344e]">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            🧠 {t("config.models")}
            </h2>
            <button 
                onClick={() => {
                    const newId = prompt(t("config.enterProviderId") || "Enter provider ID (e.g. openai, anthropic):");
                    if (newId) {
                        const newProviders = { ...(config.models?.providers || {}) };
                        if (!newProviders[newId]) {
                            newProviders[newId] = { api: "", models: [] };
                            handleChange("models.providers", newProviders);
                        }
                    }
                }}
                className="px-2 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded text-xs transition-colors"
            >
                {t("config.addProvider")}
            </button>
        </div>
        <div className="space-y-4">
            {Object.entries(config.models?.providers || {}).map(([key, provider]: [string, any]) => (
                <div key={key} className="bg-[#0f1117] border border-[#2e344e] rounded-lg p-4 group relative">
                    <button
                        onClick={() => {
                            if(!confirm(t("config.confirmDeleteProvider"))) return;
                            const newProviders = { ...(config.models?.providers || {}) };
                            delete newProviders[key];
                            handleChange("models.providers", newProviders);
                        }}
                        className="absolute top-3 right-3 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-opacity text-xs"
                    >
                        {t("config.deleteProvider")}
                    </button>
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-bold text-blue-400 uppercase tracking-wider">{key}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="block text-[10px] uppercase text-gray-500 mb-1">{t("config.modelApi")}</label>
                            <input
                                value={provider.api || ""}
                                onChange={(e) => handleChange(`models.providers.${key}.api`, e.target.value)}
                                className="w-full bg-[#161821] border border-[#2e344e] rounded px-2 py-1.5 text-xs text-gray-300 font-mono focus:border-blue-500/50 outline-none"
                                placeholder="https://api..."
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase text-gray-500 mb-1">{t("config.providerKey")}</label>
                            <input
                                type="password"
                                value={config.auth?.profiles?.[key]?.api_key || ""}
                                onChange={(e) => handleChange(`auth.profiles.${key}.api_key`, e.target.value)}
                                className="w-full bg-[#161821] border border-[#2e344e] rounded px-2 py-1.5 text-xs text-gray-300 font-mono focus:border-blue-500/50 outline-none"
                                placeholder="sk-..."
                            />
                            <p className="text-[10px] text-gray-600 mt-1">
                                {t("config.providerKeyHint")}
                            </p>
                        </div>
                        <div>
                            <button
                                onClick={async () => {
                                    const btn = document.getElementById(`test-btn-${key}`) as HTMLButtonElement;
                                    if (btn) btn.disabled = true;
                                    const originalText = btn ? btn.innerText : "";
                                    if (btn) btn.innerText = t("config.testingProvider");

                                    try {
                                        const res = await fetch("/api/config/test-provider", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                providerId: key,
                                                baseUrl: provider.api,
                                                apiKey: config.auth?.profiles?.[key]?.api_key
                                            })
                                        });
                                        const data = await res.json();
                                        alert(data.ok ? `${t("config.testProviderSuccess")}\n${data.message}` : `${t("config.testProviderFail")}: ${data.error}`);
                                    } catch (e: any) {
                                        alert(`${t("config.testProviderFail")}: ${e.message}`);
                                    } finally {
                                        if (btn) {
                                            btn.disabled = false;
                                            btn.innerText = originalText;
                                        }
                                    }
                                }}
                                id={`test-btn-${key}`}
                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs transition-colors border border-gray-600"
                            >
                                🔌 {t("config.testProvider")}
                            </button>
                        </div>
                    </div>
                </div>
            ))}
             {(!config.models?.providers || Object.keys(config.models.providers).length === 0) && (
                <div className="text-sm text-gray-500 italic text-center py-4 border border-dashed border-[#2e344e] rounded-lg">
                  {t("config.noProviders")}
                </div>
            )}
        </div>
      </section>
    </div>
  );
}
