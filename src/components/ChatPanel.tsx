"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  Loader2,
  Sparkles,
  Receipt,
  TrendingUp,
  PiggyBank,
  CalendarDays,
  RotateCcw,
  History,
  Trash2,
  X,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCoachChat } from "@/components/CoachChatProvider";
import { TrendsChart, SummaryChart, NetWorthChart } from "@/components/ChatCharts";
import type { TrendPoint, SummaryToolOutput, NetWorthPoint } from "@/components/ChatCharts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SUGGESTIONS = [
  { icon: Receipt, text: "Résumé du mois", color: "text-blue-600 bg-blue-50" },
  { icon: TrendingUp, text: "Tendance des dépenses", color: "text-emerald-600 bg-emerald-50" },
  { icon: PiggyBank, text: "Mes abonnements", color: "text-violet-600 bg-violet-50" },
  { icon: CalendarDays, text: "Patrimoine net", color: "text-amber-600 bg-amber-50" },
];

export default function ChatPanel({
  variant = "full",
  onClose,
}: {
  variant?: "full" | "compact";
  onClose?: () => void;
}) {
  const {
    messages,
    status,
    error,
    clearError,
    submit: sendToAgent,
    conversationId,
    conversations,
    newConversation,
    loadConversation,
    deleteConversation,
    loadConversations,
    anchor,
    clearAnchor,
  } = useCoachChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Only auto-scroll while the user is already at the bottom — otherwise a
  // streaming response yanks them back down every time it re-renders, which
  // made it impossible to scroll up and read earlier messages mid-response.
  const isNearBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  // Re-focus the input as soon as it re-enables (response finished), so the
  // next question can be typed immediately without clicking back into it.
  useEffect(() => {
    if (status === "ready") inputRef.current?.focus();
  }, [status]);

  // Adrien just picked something to ask about (a transaction row, a chart
  // point) — jump straight into the composer.
  useEffect(() => {
    if (anchor) inputRef.current?.focus();
  }, [anchor]);

  const submit = () => {
    if (!input.trim() || status !== "ready") return;
    isNearBottomRef.current = true; // sending always snaps back to the new exchange
    sendToAgent(input);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  // Enter sends; Shift+Enter inserts a newline.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleSuggestion = (text: string) => {
    if (status !== "ready") return;
    sendToAgent(text);
  };

  const isStreaming = status === "streaming";
  const compact = variant === "compact";

  return (
    <div
      className={cn(
        "flex flex-col bg-white",
        compact ? "h-full" : "h-[calc(100dvh-4rem)] md:h-[100dvh] md:bg-gray-50"
      )}
    >
      {/* Top bar: title (compact only), conversation history, close (compact only) */}
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-1.5">
        {compact ? (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            Coach financier
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => { if (!showHistory) loadConversations(); setShowHistory((v) => !v); }}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          >
            <History className="h-4 w-4" /> Historique
          </button>
          {compact && onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {showHistory && (
        <div className="max-h-64 overflow-y-auto border-b border-gray-100 bg-white">
          {conversations.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400">Aucune conversation enregistrée.</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => { loadConversation(c.id); setShowHistory(false); }}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 hover:bg-gray-50",
                  c.id === conversationId && "bg-indigo-50"
                )}
              >
                <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                  {c.title || "Sans titre"}
                </span>
                <span className="shrink-0 text-[10px] text-gray-400">{c.messageCount} msg</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                  className="shrink-0 rounded p-1 text-gray-300 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 pb-4">
            <div className={cn(
              "flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200",
              compact ? "h-12 w-12" : "h-16 w-16"
            )}>
              <Sparkles className={cn("text-white", compact ? "h-6 w-6" : "h-8 w-8")} />
            </div>
            {!compact && (
              <h1 className="mt-5 text-xl font-bold text-gray-900">
                Budget AN
              </h1>
            )}
            <p className={cn("text-center text-gray-400 max-w-xs", compact ? "mt-3 text-xs" : "mt-1 text-sm")}>
              Ton coach financier. Demande ce dont tu as besoin.
            </p>

            <div className={cn("grid w-full grid-cols-2 gap-3", compact ? "mt-5 max-w-xs" : "mt-8 max-w-sm")}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleSuggestion(s.text)}
                  className="flex items-center gap-2.5 rounded-2xl border border-gray-100 bg-white p-3.5 text-left shadow-sm transition-all active:scale-[0.98] hover:shadow-md hover:border-gray-200"
                >
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", s.color)}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 leading-tight">
                    {s.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={cn("px-4 py-4 md:py-6", compact ? "" : "mx-auto max-w-2xl")}>
            {messages.map((message) => (
              <div key={message.id} className="mb-4">
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 text-sm text-white">
                      {message.parts.map((part, i) =>
                        part.type === "text" ? <span key={i}>{part.text}</span> : null
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1 text-[0.9rem] leading-relaxed text-gray-800">
                      {message.parts.map((part, i) => {
                        if (part.type === "text") {
                          return (
                            <div
                              key={i}
                              className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-table:my-2 prose-pre:my-2 prose-hr:my-3 prose-strong:text-gray-900 prose-td:px-3 prose-td:py-1.5 prose-th:px-3 prose-th:py-1.5 prose-th:text-left prose-th:font-semibold prose-table:text-sm"
                            >
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {part.text}
                              </ReactMarkdown>
                            </div>
                          );
                        }
                        if (part.type.startsWith("tool-")) {
                          const p = part as {
                            type: string;
                            toolCallId: string;
                            toolName?: string;
                            state?: string;
                            output?: unknown;
                          };
                          const toolName = p.toolName || part.type.replace("tool-", "");
                          if (p.state === "output-available" && p.output) {
                            return renderToolChart(toolName, p.output, i);
                          }
                          if (p.state === "output-available") return null;
                          return (
                            <div key={i} className="my-1.5 flex items-center gap-1.5 text-xs text-gray-400">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              {toolLabel(toolName)}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2.5 mb-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Réflexion...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input bar - fixed at bottom */}
      <div className="border-t border-gray-100 bg-white px-3 pb-2 pt-2 md:px-4 md:pb-4 md:pt-3">
        {error && (
          <div className={cn("mb-2 flex items-center justify-between gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700", !compact && "mx-auto max-w-2xl")}>
            <span>
              {error.message.includes("429") || error.message.toLowerCase().includes("trop de requ")
                ? "Trop de messages envoyés d'un coup — attends un instant et réessaie."
                : "Une erreur est survenue. Réessaie."}
            </span>
            <button
              onClick={clearError}
              className="shrink-0 font-medium text-red-800 hover:underline"
            >
              Fermer
            </button>
          </div>
        )}
        {messages.length > 0 && (
          <div className="mb-2 flex justify-center">
            <button
              onClick={newConversation}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Nouvelle conversation
            </button>
          </div>
        )}
        {anchor && (
          <div className={cn("mb-2 flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700", !compact && "mx-auto max-w-2xl")}>
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">{anchor}</span>
            <button
              onClick={clearAnchor}
              className="shrink-0 rounded p-0.5 text-indigo-400 hover:text-indigo-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className={cn("flex items-end gap-2", !compact && "mx-auto max-w-2xl")}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Pose une question sur tes finances..."
            rows={1}
            className="max-h-32 flex-1 resize-none overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 transition-all"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:hover:bg-indigo-600"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function renderToolChart(toolName: string, output: unknown, key: number) {
  if (toolName === "getTrends" && Array.isArray(output) && output.length >= 2) {
    return <TrendsChart key={key} data={output as TrendPoint[]} />;
  }
  if (
    toolName === "getSummary" &&
    output !== null &&
    typeof output === "object" &&
    "byGroup" in output
  ) {
    return <SummaryChart key={key} data={output as SummaryToolOutput} />;
  }
  if (toolName === "getNetWorth" && Array.isArray(output) && output.length >= 2) {
    return <NetWorthChart key={key} data={output as NetWorthPoint[]} />;
  }
  return null;
}

function toolLabel(name: string): string {
  const labels: Record<string, string> = {
    queryTransactions: "Recherche de transactions...",
    getSummary: "Calcul du résumé...",
    getTrends: "Analyse des tendances...",
    reclassify: "Reclassification...",
    getSubscriptions: "Consultation des abonnements...",
    getNetWorth: "Consultation du patrimoine...",
    deleteTransaction: "Suppression de la transaction...",
  };
  return labels[name] || "Traitement...";
}
