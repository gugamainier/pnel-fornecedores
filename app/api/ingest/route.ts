// Endpoint temporário de desenvolvimento: recebe extrações do WhatsApp Web
// (via fetch no navegador) e grava em prisma/inbox/. Desabilitado em produção.
import { NextResponse } from "next/server";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Nome-Arquivo",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "indisponível" }, { status: 404, headers: CORS });
  }
  const nome = (req.headers.get("x-nome-arquivo") ?? "ingest").replace(/[^a-z0-9_-]/gi, "");
  const corpo = await req.text();
  const dir = join(process.cwd(), "prisma", "inbox");
  mkdirSync(dir, { recursive: true });
  const caminho = join(dir, `${nome}.json`);
  writeFileSync(caminho, corpo);
  return NextResponse.json({ ok: true, bytes: corpo.length, caminho }, { headers: CORS });
}
