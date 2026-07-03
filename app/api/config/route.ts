import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { getConfig, setConfig } from "@/lib/config";

export async function GET() {
  if (!(await usuarioAtual())) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  return NextResponse.json(await getConfig());
}

const CHAVES_PERMITIDAS = ["msgWhatsapp", "msgEmailAssunto", "msgEmailCorpo"];

export async function PUT(req: Request) {
  const u = await usuarioAtual();
  if (!u || u.papel !== "admin") {
    return NextResponse.json({ error: "apenas admin pode editar as mensagens" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "body inválido" }, { status: 400 });
  }
  for (const [chave, valor] of Object.entries(body)) {
    if (CHAVES_PERMITIDAS.includes(chave) && typeof valor === "string") {
      await setConfig(chave, valor);
    }
  }
  return NextResponse.json({ ok: true });
}
