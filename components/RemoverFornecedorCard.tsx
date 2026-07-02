"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RemoverFornecedorCard({
  id,
  nome,
}: {
  id: number;
  nome: string;
}) {
  const router = useRouter();
  const [excluindo, setExcluindo] = useState(false);

  async function remover() {
    if (!confirm(`Remover "${nome}"? Esta ação não pode ser desfeita.`)) return;
    setExcluindo(true);
    const res = await fetch(`/api/fornecedores/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      setExcluindo(false);
      alert("Não foi possível remover.");
    }
  }

  return (
    <button
      onClick={remover}
      disabled={excluindo}
      className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
    >
      {excluindo ? "Removendo…" : "Remover"}
    </button>
  );
}
