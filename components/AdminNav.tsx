"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import PnelLogo from "@/components/PnelLogo";

const links = [
  { href: "/", label: "Consulta" },
  { href: "/disparo", label: "Disparo RSVP" },
  { href: "/cadastro", label: "Formulário público" },
  { href: "/admin/usuarios", label: "Usuários", adminOnly: true },
  { href: "/conta", label: "Minha conta" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setIsAdmin(u?.papel === "admin"))
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <PnelLogo variant="dark" className="h-7 w-auto" />
          <span className="text-sm font-semibold text-slate-400">Fornecedores</span>
        </Link>
        <div className="flex flex-1 flex-wrap gap-1">
          {links
            .filter((l) => !l.adminOnly || isAdmin)
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  pathname === l.href
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </Link>
            ))}
        </div>
        <button
          onClick={logout}
          className="text-sm text-slate-400 transition hover:text-slate-600"
        >
          Sair
        </button>
      </div>
    </nav>
  );
}
