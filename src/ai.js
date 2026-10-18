const ALLOWED_ACTIONS = new Set(['follow', 'come', 'stop', 'say', 'status']);
function fallbackPlan(command, requestedTarget) {
  const text = String(command || '').trim(); const lower = text.toLocaleLowerCase('pt-BR'); const target = String(requestedTarget || '').trim();
  if (/\b(parar|pare|fica parado|cancele|cancelar)\b/.test(lower)) return { action: 'stop', target: '', message: 'Navegação parada.' };
  if (/\b(status|como você está|como voce esta|situação|situacao)\b/.test(lower)) return { action: 'status', target: '', message: '' };
  if (/\b(siga|seguir|me acompanha|me acompanhe|me segue|me siga)\b/.test(lower)) { const m = text.match(/\b(?:siga|seguir)\s+([A-Za-z0-9_]{3,16})/i); return { action: 'follow', target: target || (m ? m[1] : ''), message: '' }; }
  if (/\b(venha|vem|aproxime|chegue perto)\b/.test(lower)) { const m = text.match(/\b(?:venha|vem|aproxime)\s+(?:até|ate)\s+([A-Za-z0-9_]{3,16})/i); return { action: 'come', target: target || (m ? m[1] : ''), message: '' }; }
  if (/\b(diga|fale|mande no chat|escreva no chat)\b/.test(lower)) { const message = text.replace(/^(diga|fale|mande no chat|escreva no chat)\s*/i, '').replace(/^['“]|['”]$/g, '').trim(); if (message) return { action: 'say', target: '', message }; }
  return { action: 'status', target: '', message: "Sem chave de IA, tente 'me siga', 'venha até mim', 'pare' ou 'status'." };
}
function parseModelJson(raw) {
  const cleaned = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''); const data = JSON.parse(cleaned);
  if (!data || !ALLOWED_ACTIONS.has(data.action)) throw new Error('A IA retornou uma ação não permitida.');
  return { action: data.action, target: typeof data.target === 'string' ? data.target.trim().slice(0, 16) : '', message: typeof data.message === 'string' ? data.message.trim().slice(0, 180) : '' };
}
async function planCommand(command, requestedTarget, botState) {
  const apiKey = process.env.GEMINI_API_KEY; if (!apiKey) return fallbackPlan(command, requestedTarget);
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const prompt = ['Você planeja ações para um bot companheiro no Minecraft.', 'Responda apenas com JSON válido.', 'Ações permitidas: follow, come, stop, say, status.', 'Formato: {"action":"follow|come|stop|say|status","target":"nome do jogador ou vazio","message":"mensagem curta ou vazio"}.', 'Nunca invente comandos de servidor nem use comandos administrativos.', 'follow segue jogador; come vai até jogador; stop para; say manda texto no chat; status responde sem agir.', 'Estado: ' + JSON.stringify(botState || {}), 'Jogador indicado: ' + String(requestedTarget || '').slice(0, 16), 'Pedido: ' + String(command || '').slice(0, 500)].join('\n');
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey);
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 180 } }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Gemini API respondeu HTTP ' + response.status + '. Confira a chave, o modelo e a cota.');
  const payload = await response.json(); const raw = payload?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join(''); return parseModelJson(raw);
}
module.exports = { planCommand };
