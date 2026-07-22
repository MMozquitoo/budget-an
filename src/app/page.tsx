"use client";

import { useChat } from "@ai-sdk/react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TrendsChart, SummaryChart, NetWorthChart } from "@/components/ChatCharts";
import type { TrendPoint, SummaryToolOutput, NetWorthPoint } from "@/components/ChatCharts";
import DOMPurify from "dompurify";

const SUGGESTIONS = [
  { icon: Receipt, text: "Résumé du mois", color: "text-blue-600 bg-blue-50" },
  { icon: TrendingUp, text: "Tendance des dépenses", color: "text-emerald-600 bg-emerald-50" },
  { icon: PiggyBank, text: "Mes abonnements", color: "text-violet-600 bg-violet-50" },
  { icon: CalendarDays, text: "Patrimoine net", color: "text-amber-600 bg-amber-50" },
];

export default function ChatPage() {
  const { messages, status, sendMessage, setMessages } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== "ready") return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleSuggestion = (text: string) => {
    if (status !== "ready") return;
    sendMessage({ text });
  };

  const isStreaming = status === "streaming";

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col bg-white md:h-[100dvh] md:bg-gray-50">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 pb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-5 text-xl font-bold text-gray-900">
              Budget AN
            </h1>
            <p className="mt-1 text-center text-sm text-gray-400 max-w-xs">
              Ton assistant financier. Demande ce dont tu as besoin.
            </p>

            <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-3">
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
          <div className="mx-auto max-w-2xl px-4 py-4 md:py-6">
            {messages.map((message) => (
              <div key={message.id} className="mb-4">
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 text-sm text-white">
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
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(formatMarkdown(part.text)),
                              }}
                            />
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
        {messages.length > 0 && (
          <div className="mb-2 flex justify-center">
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Nouvelle conversation
            </button>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-2xl items-center gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pose une question sur tes finances..."
            disabled={isStreaming}
            className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 transition-all"
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

function formatMarkdown(text: string): string {
  let html = text;

  // Tables
  const tableRegex = /(\|.+\|[\r\n]+\|[\s:|-]+\|[\r\n]+((\|.+\|[\r\n]*)+))/g;
  html = html.replace(tableRegex, (match) => {
    const rows = match.trim().split("\n").filter((r) => r.trim());
    if (rows.length < 2) return match;
    const headers = rows[0].split("|").filter((c) => c.trim()).map((c) => c.trim());
    const dataRows = rows.slice(2);
    let table = '<table class="w-full border-collapse rounded-lg overflow-hidden text-sm"><thead><tr>';
    headers.forEach((h) => {
      table += `<th class="bg-gray-50 border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">${h}</th>`;
    });
    table += "</tr></thead><tbody>";
    dataRows.forEach((row, i) => {
      const cells = row.split("|").filter((c) => c.trim()).map((c) => c.trim());
      const bg = i % 2 === 0 ? "" : "bg-gray-50/50";
      table += `<tr class="${bg}">`;
      cells.forEach((c) => {
        const formatted = c
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>");
        table += `<td class="border-b border-gray-100 px-3 py-2 text-gray-700">${formatted}</td>`;
      });
      table += "</tr>";
    });
    table += "</tbody></table>";
    return table;
  });

  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold text-gray-900 mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold text-gray-900 mt-4 mb-1">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold text-gray-900 mt-4 mb-2">$1</h1>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="border-gray-200 my-3" />');

  // Bold / italic / code
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/`(.*?)`/g, '<code class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-indigo-700">$1</code>');

  // Lists
  html = html.replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-gray-700">$1</li>');
  html = html.replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal text-gray-700">$2</li>');

  // Blockquotes
  html = html.replace(/^> (.*$)/gm, '<blockquote class="border-l-3 border-indigo-300 bg-indigo-50/50 pl-3 py-1 text-sm text-gray-600 rounded-r-lg my-1.5">$1</blockquote>');

  // Paragraphs
  html = html.replace(/\n{2,}/g, '</p><p class="my-1.5">');
  html = html.replace(/\n/g, "<br />");

  return html;
}
