// Gatilho horário do disparo de WhatsApp da PNEL: só chama o endpoint do
// app na Vercel, que decide a cota do dia, o bloco e a trava de qualidade.
// GET /run?key=<CRON_SECRET> dispara o mesmo fluxo manualmente (diagnóstico).

async function disparar(env) {
  try {
    const r = await fetch(
      `https://pnel-fornecedores.vercel.app/api/cron/disparo-whatsapp?key=${env.CRON_SECRET}`
    );
    const corpo = await r.text();
    console.log(`disparo: HTTP ${r.status} — ${corpo.slice(0, 300)}`);
    return new Response(corpo, {
      status: r.status,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error("disparo falhou:", e?.message ?? e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(disparar(env));
  },
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/run" && url.searchParams.get("key") === env.CRON_SECRET) {
      return disparar(env);
    }
    return new Response("pnel-wpp-cron ok", { status: 200 });
  },
};
