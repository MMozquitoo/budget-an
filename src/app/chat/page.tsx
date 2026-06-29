"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const { messages, status, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== "ready") return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Asistente</h1>
        <p className="text-sm text-gray-500">
          Pregúntame sobre tus finanzas, corrige clasificaciones o analiza tus
          datos
        </p>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8">
            <div className="text-center">
              <Bot className="mx-auto h-12 w-12 text-indigo-300" />
              <h3 className="mt-4 text-lg font-semibold text-gray-600">
                Hola, soy tu asistente financiero
              </h3>
              <p className="mt-2 max-w-md text-sm text-gray-400">
                Puedo consultar tus transacciones, mostrarte resúmenes,
                tendencias, corregir clasificaciones y más. Pregúntame lo que
                necesites.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {[
                  "¿Cuánto gasté en restaurantes este año?",
                  "Resumen de octubre 2025",
                  "¿Cuáles son mis suscripciones?",
                  "¿Cómo va mi patrimonio?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      sendMessage({ text: q });
                    }}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 rounded-lg p-4",
                  message.role === "user"
                    ? "bg-indigo-50"
                    : "bg-white"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    message.role === "user"
                      ? "bg-indigo-600"
                      : "bg-gray-100"
                  )}
                >
                  {message.role === "user" ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-indigo-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm text-gray-800">
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <div
                          key={index}
                          className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2 prose-table:my-2 prose-pre:my-2"
                          dangerouslySetInnerHTML={{
                            __html: formatMarkdown(part.text),
                          }}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}
            {status === "streaming" && (
              <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analizando...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregúntame sobre tus finanzas..."
          disabled={status !== "ready"}
          className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status !== "ready" || !input.trim()}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code class="rounded bg-gray-100 px-1 py-0.5 text-xs">$1</code>')
    .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold">$1</h1>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n{2,}/g, '</p><p class="my-1">')
    .replace(/\n/g, "<br />");
}
