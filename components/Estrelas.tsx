"use client";

/** Exibe uma nota de 0–5 em estrelas (com meia estrela). */
export function EstrelasNota({
  nota,
  total,
}: {
  nota: number | null;
  total?: number;
}) {
  if (nota == null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-500" title={`${nota} de 5`}>
      <span aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i}>{nota >= i ? "★" : nota >= i - 0.5 ? "⯪" : "☆"}</span>
        ))}
      </span>
      <span className="font-medium text-slate-600">
        {nota.toFixed(1)}
        {total != null && ` (${total})`}
      </span>
    </span>
  );
}

/** Seletor de estrelas 1–5 (interativo). */
export function EstrelasSeletor({
  valor,
  onChange,
}: {
  valor: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-1 text-2xl">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={i <= valor ? "text-amber-500" : "text-slate-300 hover:text-amber-300"}
          aria-label={`${i} estrela${i > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
