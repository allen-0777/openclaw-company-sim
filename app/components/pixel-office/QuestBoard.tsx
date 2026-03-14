"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Quest } from "@/lib/quest-system";
import Link from "next/link";

interface QuestBoardProps {
  onClose: () => void;
}

export function QuestBoard({ onClose }: QuestBoardProps) {
  const { t } = useI18n();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/quests")
      .then((res) => res.json())
      .then((data) => {
        if (data.quests) {
          setQuests(data.quests);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const phases = [1]; // Currently only phase 1

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--background)]">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>📜</span> {t("quest.board.title")}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[var(--background)]">
          {loading ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              {t("common.loading")}
            </div>
          ) : (
            phases.map((phaseId) => {
              const phaseQuests = quests.filter((q) => q.phase === phaseId);
              if (phaseQuests.length === 0) return null;

              return (
                <div key={phaseId} className="space-y-4">
                  <div className="border-b border-[var(--border)] pb-2">
                    <h3 className="text-lg font-semibold text-[var(--accent)]">
                      {t(`quest.phase${phaseId}.title`)}
                    </h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t(`quest.phase${phaseId}.desc`)}
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {phaseQuests.map((quest) => (
                      <div
                        key={quest.id}
                        className={`
                          relative p-4 rounded-lg border transition-all
                          ${
                            quest.status === "locked"
                              ? "bg-[var(--muted)]/30 border-[var(--border)] opacity-60 grayscale"
                              : quest.status === "completed"
                              ? "bg-green-500/10 border-green-500/30"
                              : "bg-[var(--card)] border-[var(--accent)] shadow-sm ring-1 ring-[var(--accent)]/20"
                          }
                        `}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">
                                {quest.status === "locked"
                                  ? "🔒"
                                  : quest.status === "completed"
                                  ? "✅"
                                  : "🔥"}
                              </span>
                              <h4 className="font-medium text-base">
                                {t(quest.titleKey)}
                              </h4>
                              {quest.status === "active" && (
                                <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-[var(--accent)] text-white rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[var(--muted-foreground)]">
                              {t(quest.descKey)}
                            </p>
                            
                            {quest.status === "active" && (
                                <div className="mt-3 p-3 bg-[var(--background)] rounded border border-[var(--border)] text-sm">
                                    <strong className="text-[var(--foreground)]">Task:</strong> {t(quest.taskKey)}
                                </div>
                            )}
                          </div>

                          {quest.status === "active" && quest.actionLink && (
                            <Link
                              href={quest.actionLink}
                              className="shrink-0 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              {t(quest.actionLabelKey || "quest.action.goConfig")} →
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
