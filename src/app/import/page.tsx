"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency, cn, CATEGORY_LABELS, GROUP_LABELS } from "@/lib/utils";
import { Upload, FileText, Check, AlertTriangle, Loader2, ArrowRight } from "lucide-react";

interface PreviewRow {
  date: string;
  amount: number;
  group: string;
  category: string;
  description: string;
  ruleName: string | null;
}
interface Preview {
  parsed: number;
  prepared: number;
  byRule: number;
  skippedTransfer: number;
  skippedInvalid: number;
  skippedUnmapped: number;
  unmapped: Array<{ key: string; description: string; amount: number }>;
  alreadyPresent: number;
  newCount: number;
  range: { from: string; to: string } | null;
  preview: PreviewRow[];
}

export default function ImportPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"analyze" | "import" | null>(null);
  const [result, setResult] = useState<{ inserted: number; total?: number; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setResult(null);
    setPreview(null);
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const analyze = async () => {
    if (!csv.trim()) return;
    setBusy("analyze");
    setError(null);
    try {
      const res = await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erreur");
      setPreview(await res.json());
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'analyse");
    } finally {
      setBusy(null);
    }
  };

  const confirmImport = async () => {
    setBusy("import");
    setError(null);
    try {
      const res = await fetch("/api/import/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erreur");
      setResult(await res.json());
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'import");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Importer un relevé</h1>
        <p className="text-sm text-gray-500">
          Dépose ton export bancaire (CSV). Aperçu avant validation — rien n&apos;est écrit tant que tu ne confirmes pas.
        </p>
      </div>

      {/* Dropzone */}
      <label
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/40"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
      >
        <Upload className="mb-2 h-8 w-8 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">
          {fileName ? fileName : "Choisir un fichier CSV ou le glisser ici"}
        </span>
        <span className="mt-1 text-xs text-gray-400">Format : export bancaire séparé par des points-virgules</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>

      {csv && !preview && !result && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={analyze}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy === "analyze" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Analyser
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <Check className="mx-auto h-10 w-10 text-emerald-600" />
          <h3 className="mt-3 text-lg font-semibold text-emerald-800">
            {result.inserted > 0 ? `${result.inserted} opérations importées` : (result.message || "Rien de nouveau")}
          </h3>
          {result.total !== undefined && (
            <p className="mt-1 text-sm text-emerald-700">La base contient maintenant {result.total} opérations.</p>
          )}
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Voir le tableau de bord <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="mt-6 space-y-5">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["Nouvelles", preview.newCount, "text-emerald-600"],
              ["Déjà présentes", preview.alreadyPresent, "text-gray-500"],
              ["Non mappées", preview.skippedUnmapped, preview.skippedUnmapped > 0 ? "text-amber-600" : "text-gray-500"],
              ["Transferts ignorés", preview.skippedTransfer, "text-gray-500"],
            ].map(([label, val, color]) => (
              <div key={label as string} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={cn("text-2xl font-bold", color as string)}>{val}</p>
              </div>
            ))}
          </div>

          {preview.range && (
            <p className="text-xs text-gray-400">
              Période du relevé : {preview.range.from} → {preview.range.to} · {preview.parsed} lignes lues ·{" "}
              {preview.byRule} classées par une règle
            </p>
          )}

          {preview.skippedUnmapped > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              <p className="mb-1 font-medium">Catégories non reconnues (ignorées) :</p>
              <ul className="list-inside list-disc text-xs">
                {preview.unmapped.map((u, i) => (
                  <li key={i}>{u.key} — {u.description}</li>
                ))}
              </ul>
              <p className="mt-1 text-xs">Crée une règle sur la page Règles pour les classer à l&apos;avenir.</p>
            </div>
          )}

          {preview.newCount > 0 ? (
            <>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs text-gray-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Description</th>
                        <th className="px-3 py-2 font-medium">Catégorie</th>
                        <th className="px-3 py-2 text-right font-medium">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.preview.map((r, i) => (
                        <tr key={i}>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-500">{r.date}</td>
                          <td className="max-w-[220px] truncate px-3 py-2 text-gray-800">{r.description}</td>
                          <td className="px-3 py-2 text-gray-500">
                            {CATEGORY_LABELS[r.category] || r.category}
                            {r.ruleName && <span className="ml-1 text-[10px] text-indigo-500">règle</span>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-900">
                            {formatCurrency(r.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.newCount > preview.preview.length && (
                  <p className="border-t border-gray-100 px-3 py-2 text-xs text-gray-400">
                    … et {preview.newCount - preview.preview.length} autres
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={confirmImport}
                  disabled={busy !== null}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Confirmer l&apos;import ({preview.newCount})
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
              Rien de nouveau à importer — ces opérations sont déjà dans la base.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
