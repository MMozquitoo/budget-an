"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { useCoachChat } from "@/components/CoachChatProvider";

interface PopupState {
  top: number;
  left: number;
  /** What actually gets sent to askAbout — the resolved record if the
   * selection sits inside one, otherwise the raw highlighted text. */
  context: string;
}

/**
 * Claude.ai-style "select text, ask about it" — highlight anything on any
 * page and a small button appears right above the selection. No dedicated
 * per-row button needed for this; it works on any text anywhere.
 *
 * When the same label appears on multiple rows (two transactions both named
 * "FULLI - mobilis"), the raw selected text alone can't tell them apart — the
 * agent had to ask "which one?". So if the selection falls inside an element
 * carrying `data-ask-context` (a table row, a list item — set by the page,
 * same string its own "ask" button would use, e.g. one with the transaction
 * id baked in), that unambiguous context is sent instead of the plain text.
 */
export default function SelectionAskPopup() {
  const { askAbout } = useCoachChat();
  const [popup, setPopup] = useState<PopupState | null>(null);

  const checkSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!selection || selection.isCollapsed || text.length < 2) {
      setPopup(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setPopup(null);
      return;
    }
    const node = range.commonAncestorContainer;
    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
    const recordContext = element?.closest?.("[data-ask-context]")?.getAttribute("data-ask-context");
    const context = recordContext || `Texte sélectionné sur la page : "${text}"`;
    setPopup({ top: rect.top, left: rect.left + rect.width / 2, context });
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", checkSelection);
    document.addEventListener("touchend", checkSelection);
    return () => {
      document.removeEventListener("mouseup", checkSelection);
      document.removeEventListener("touchend", checkSelection);
    };
  }, [checkSelection]);

  if (!popup) return null;

  return (
    <button
      style={{ top: Math.max(8, popup.top - 44), left: popup.left }}
      className="fixed z-[60] -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg transition-colors hover:bg-gray-800"
      // Keep the browser selection alive through the click — by default,
      // mousedown on another element collapses it before onClick ever fires.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        askAbout(popup.context);
        window.getSelection()?.removeAllRanges();
        setPopup(null);
      }}
    >
      <Sparkles className="h-3.5 w-3.5" />
      Demander au coach
    </button>
  );
}
