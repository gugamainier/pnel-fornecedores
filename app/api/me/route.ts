import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";

export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  return NextResponse.json(u);
}
