"use client";

import { Sparkles } from "lucide-react";
import { useCoachChat } from "@/components/CoachChatProvider";

export default function AskCoachButton({ description }: { description: string }) {
  const { askAbout } = useCoachChat();

  return (
    <button
      onClick={() => askAbout(description)}
      title="Demander au coach"
      className="shrink-0 rounded p-1 text-gray-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
    >
      <Sparkles className="h-4 w-4" />
    </button>
  );
}
