"use client";

import { usePathname } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCoachChat } from "@/components/CoachChatProvider";
import ChatPanel from "@/components/ChatPanel";

/**
 * Floating coach — reachable from every page except "/" (the full chat is
 * already there). One shared conversation (CoachChatProvider) keeps talking
 * across page navigations: open it on /dashboard, keep going on /household.
 */
export default function CoachWidget() {
  const pathname = usePathname();
  const { widgetOpen, setWidgetOpen } = useCoachChat();

  if (pathname === "/") return null;

  return (
    <>
      {widgetOpen && (
        <div className="fixed bottom-36 right-4 z-50 h-[70vh] max-h-[600px] w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl md:bottom-24 md:right-6">
          <ChatPanel variant="compact" onClose={() => setWidgetOpen(false)} />
        </div>
      )}
      <button
        onClick={() => setWidgetOpen(!widgetOpen)}
        className={cn(
          "fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all active:scale-95 md:bottom-6 md:right-6",
          widgetOpen
            ? "bg-gray-800 text-white"
            : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:shadow-xl"
        )}
        aria-label={widgetOpen ? "Fermer le coach financier" : "Ouvrir le coach financier"}
      >
        {widgetOpen ? <X className="h-5 w-5" /> : <Sparkles className="h-6 w-6" />}
      </button>
    </>
  );
}
