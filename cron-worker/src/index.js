// Gatilho horário do disparo de WhatsApp da PNEL: só chama o endpoint do
// app na Vercel, que decide a cota do dia, o bloco e a trava de qualidade.
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      fetch(`https://pnel-fornecedores.vercel.app/api/cron/disparo-whatsapp?key=${env.CRON_SECRET}`)
    );
  },
};
