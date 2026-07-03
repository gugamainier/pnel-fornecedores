/**
 * URL base oficial do app para montar links em e-mails/mensagens.
 * Ordem: APP_URL (explícita) → VERCEL_PROJECT_PRODUCTION_URL (automática na Vercel)
 * → host da requisição (dev local).
 */
export function baseUrl(req?: Request): string {
  const explicita = process.env.APP_URL;
  if (explicita) return explicita.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  if (req) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const host = req.headers.get("host");
    if (host) return `${proto}://${host}`;
  }
  return "https://pnel-fornecedores.vercel.app";
}
