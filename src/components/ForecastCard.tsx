"use client";

import { useEffect, useState } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { TrendingUp, AlertTriangle } from "lucide-react";

interface Point {
  key: string;
  projected: number;
}
interface Forecast {
  startingBalance: number;
  startingSource: string;
  avgNetFlow: number;
  horizon: number;
  points: Point[];
  shortfall: Point | null;
}

const MONTH_ABBR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
function fmtKey(k: string) {
  const [y, m] = k.split("-");
  return `${MONTH_ABBR[Number(m) - 1]} ${y.slice(2)}`;
}

/** Forward cash-flow projection for the dashboard. */
export default function ForecastCard() {
  const [data, setData] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/forecast?horizon=6")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data || data.points.length === 0) return null;

  const end = data.points[data.points.length - 1];
  const max = Math.max(...data.points.map((x) => Math.abs(x.projected)), 1);

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-50 p-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Prévision de trésorerie</h2>
        </div>
        <span className="text-xs text-gray-400">
          {data.avgNetFlow >= 0 ? "+" : ""}
          {formatCurrency(data.avgNetFlow)}/mois
        </span>
      </div>

      <div className="mb-1 flex items-end gap-2">
        <span className={cn("text-2xl font-bold", end.projected >= 0 ? "text-gray-900" : "text-red-600")}>
          {formatCurrency(end.projected)}
        </span>
        <span className="mb-1 text-xs text-gray-400">projeté dans {data.horizon} mois</span>
      </div>

      {data.startingSource === "none" && (
        <p className="mb-3 text-xs text-amber-600">
          Solde de départ à 0 — enregistre ton patrimoine pour une projection en euros réels.
        </p>
      )}

      {data.shortfall && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Solde négatif dès {fmtKey(data.shortfall.key)} ({formatCurrency(data.shortfall.projected)})
        </div>
      )}

      <div className="mt-2 flex gap-1">
        {data.points.map((p) => (
          <div key={p.key} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-12 w-full items-end">
              <div
                className={cn("w-full rounded-t", p.projected >= 0 ? "bg-emerald-400" : "bg-red-400")}
                style={{ height: Math.max(4, (Math.abs(p.projected) / max) * 48) }}
              />
            </div>
            <span className="text-[9px] text-gray-400">{fmtKey(p.key).split(" ")[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
