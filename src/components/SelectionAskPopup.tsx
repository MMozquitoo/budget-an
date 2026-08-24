"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { useCoachChat } from "@/components/CoachChatProvider";

interface PopupState {
  top: number;
  left: number;
  text: string;
}

/**
 * Claude.ai-style "select text, ask about it" — highlight anything on any
 * page and a small button appears right above the selection. No dedicated
 * per-row button needed for this; it works on any text anywhere.
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
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setPopup(null);
      return;
    }
    setPopup({ top: rect.top, left: rect.left + rect.width / 2, text });
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
        askAbout(`Texte sélectionné sur la page : "${popup.text}"`);
        window.getSelection()?.removeAllRanges();
        setPopup(null);
      }}
    >
      <Sparkles className="h-3.5 w-3.5" />
      Demander au coach
    </button>
  );
}
