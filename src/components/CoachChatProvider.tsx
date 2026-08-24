"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useChat } from "@ai-sdk/react";

interface Conversation {
  id: string;
  title: string | null;
  updatedAt: string;
  messageCount: number;
}

const PAGE_LABELS: Record<string, string> = {
  "/": "Chat",
  "/dashboard": "Résumé",
  "/household": "Détails",
  "/subscriptions": "Abonnements",
  "/net-worth": "Patrimoine",
  "/settings": "Réglages",
  "/budgets": "Budgets",
  "/insights": "Analyse",
  "/calendar": "Calendrier",
  "/import": "Import",
  "/rules": "Règles",
};

function pageLabelFor(pathname: string): string {
  return PAGE_LABELS[pathname] ?? pathname;
}

function useCoachChatState() {
  const pathname = usePathname();
  const { messages, status, error, clearError, sendMessage, setMessages } = useChat();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [anchor, setAnchor] = useState<string | null>(null);
  const savedSigRef = useRef("");

  const loadConversations = useCallback(() => {
    fetch("/api/conversations")
      .then((r) => (r.ok ? r.json() : []))
      .then(setConversations)
      .catch(() => {});
  }, []);

  // Every visit starts a fresh conversation — past ones stay reachable from
  // "Historique". This provider mounts once per app session (root layout),
  // so this only runs once, not on every page navigation.
  useEffect(() => {
    loadConversations();
    if (typeof window !== "undefined") localStorage.removeItem("currentConversation");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist after each completed exchange (creating the conversation lazily).
  useEffect(() => {
    if (status !== "ready" || messages.length === 0) return;
    const sig = messages.map((m) => m.id).join(",");
    if (sig === savedSigRef.current) return;
    savedSigRef.current = sig;
    let cancelled = false;
    (async () => {
      let id = conversationId;
      if (!id) {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }).then((r) => r.json());
        id = res.id;
        if (cancelled || !id) return;
        setConversationId(id);
      }
      await fetch(`/api/conversations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      if (!cancelled) loadConversations();
    })();
    return () => {
      cancelled = true;
    };
  }, [status, messages, conversationId, loadConversations]);

  const newConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    savedSigRef.current = "";
    clearError();
  }, [setMessages, clearError]);

  const loadConversation = useCallback(
    async (id: string) => {
      const c = await fetch(`/api/conversations/${id}`).then((r) => (r.ok ? r.json() : null));
      if (!c) return;
      const msgs = (c.messages ?? []) as Parameters<typeof setMessages>[0];
      setMessages(msgs);
      setConversationId(id);
      savedSigRef.current = (c.messages ?? []).map((m: { id?: string }) => m.id).join(",");
    },
    [setMessages]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (id === conversationId) newConversation();
      loadConversations();
    },
    [conversationId, newConversation, loadConversations]
  );

  // Tags every outgoing turn with the page Adrien is currently looking at
  // (and its active filters, via the URL) so "ce graphique" / "cette page"
  // resolve on the agent's side without him having to spell it out. Read at
  // send time rather than via useSearchParams() — that hook needs a Suspense
  // boundary in every page that reads it, which this provider (mounted once
  // for the whole app) shouldn't force on pages that don't otherwise need it.
  // `anchor` (set by askAbout, below) rides along the same way and is
  // consumed — cleared — as soon as it's actually sent.
  const submit = useCallback(
    (text: string) => {
      if (!text.trim() || status !== "ready") return;
      clearError();
      const search = typeof window !== "undefined" ? window.location.search : "";
      let pageContext = `Adrien est actuellement sur la page "${pageLabelFor(pathname)}" (${pathname}${search}).`;
      if (anchor) {
        pageContext += ` Adrien vient de sélectionner : ${anchor}.`;
        setAnchor(null);
      }
      sendMessage({ text }, { body: { pageContext } });
    },
    [status, clearError, sendMessage, pathname, anchor]
  );

  // Called from a page (a transaction row, a chart point, ...) when Adrien
  // picks something specific to ask about — pins it as context for his next
  // message and pops the widget open, instead of him having to describe
  // which row/point he means.
  const askAbout = useCallback((description: string) => {
    setAnchor(description);
    setWidgetOpen(true);
  }, []);

  return {
    messages,
    status,
    error,
    clearError,
    submit,
    conversationId,
    conversations,
    newConversation,
    loadConversation,
    deleteConversation,
    loadConversations,
    widgetOpen,
    setWidgetOpen,
    anchor,
    clearAnchor: () => setAnchor(null),
    askAbout,
  };
}

type CoachChatValue = ReturnType<typeof useCoachChatState>;

const CoachChatContext = createContext<CoachChatValue | null>(null);

export function CoachChatProvider({ children }: { children: ReactNode }) {
  const value = useCoachChatState();
  return <CoachChatContext.Provider value={value}>{children}</CoachChatContext.Provider>;
}

export function useCoachChat(): CoachChatValue {
  const ctx = useContext(CoachChatContext);
  if (!ctx) throw new Error("useCoachChat must be used within a CoachChatProvider");
  return ctx;
}
