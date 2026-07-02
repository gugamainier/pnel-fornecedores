"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteFornecedorButton({
  id,
  nome,
}: {
  id: number;
  nome: string;
}) {
  const router = useRouter();
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    if (!confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
    setExcluindo(true);
    const res = await fetch(`/api/fornecedores/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setExcluindo(false);
      alert("Não foi possível excluir.");
    }
  }

  return (
    <button
      onClick={excluir}
      disabled={excluindo}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
    >
      {excluindo ? "Excluindo…" : "Excluir"}
    </button>
  );
}
