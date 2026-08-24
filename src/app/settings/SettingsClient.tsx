"use client";

import { useState } from "react";
import { Settings, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Taxonomy } from "@/lib/taxonomy";
import RulesClient from "../rules/RulesClient";
import ImportClient from "../import/ImportClient";

interface Rule {
  id: string;
  name: string;
  priority: number;
  matchField: string;
  matchType: string;
  matchValue: string;
  group: string;
  category: string;
  active: boolean;
}

interface Suggestion {
  payee: string;
  matchValue: string;
  group: string;
  category: string;
  count: number;
  samples: string[];
}

const TABS = [
  { key: "rules", label: "Règles", icon: Settings },
  { key: "import", label: "Import", icon: Upload },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default function SettingsClient({
  rules,
  suggestions,
  taxonomy,
}: {
  rules: Rule[];
  suggestions: Suggestion[];
  taxonomy: Taxonomy;
}) {
  const [tab, setTab] = useState<Tab>("rules");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Réglages</h1>
        <p className="text-sm text-gray-500">
          Règles de classification et import de relevés bancaires.
        </p>
      </div>

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "rules" ? (
        <RulesClient rules={rules} suggestions={suggestions} taxonomy={taxonomy} />
      ) : (
        <ImportClient />
      )}
    </div>
  );
}
