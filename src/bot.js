const mineflayer = require('@wp2508/mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
let bot = null; let connecting = false; let state = 'offline'; let lastError = ''; let lastMessage = ''; let joinedAt = null;
function getStatus() {
  const players = bot?.players ? Object.keys(bot.players).filter(name => name !== bot.username) : []; const p = bot?.entity?.position;
  return { state, username: bot?.username || process.env.BOT_USERNAME || 'CompanheiroAI', host: process.env.MC_HOST || 'catalufa.aternos.host', port: Number(process.env.MC_PORT || 40492), version: process.env.MC_VERSION || '26.3', players, position: p ? { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) } : null, joinedAt, lastError, lastMessage };
}
function startBot() {
  if (bot || connecting) return { ok: false, message: 'O bot já está conectado ou tentando conectar.', status: getStatus() };
  const host = process.env.MC_HOST || 'catalufa.aternos.host'; const port = Number(process.env.MC_PORT || 40492); const username = process.env.BOT_USERNAME || 'CompanheiroAI'; const version = process.env.MC_VERSION || '26.3';
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) throw new Error('BOT_USERNAME precisa ter de 3 a 16 caracteres: letras, números ou _.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('MC_PORT inválida.');
  connecting = true; state = 'connecting'; lastError = ''; lastMessage = 'Tentando conectar ao servidor...'; let instance;
  try { instance = mineflayer.createBot({ host, port, username, version, auth: 'offline', hideErrors: false }); }
  catch (error) { connecting = false; state = 'error'; lastError = error.message; throw error; }
  bot = instance; instance.loadPlugin(pathfinder);
  instance.once('login', () => { connecting = false; state = 'logged-in'; lastMessage = 'Login concluído; aguardando entrar no mundo.'; });
  instance.once('spawn', () => { connecting = false; state = 'online'; joinedAt = new Date().toISOString(); lastError = ''; lastMessage = 'Bot entrou no mundo.'; try { instance.pathfinder.setMovements(new Movements(instance)); } catch (error) { lastError = 'Falha ao configurar navegação: ' + error.message; } });
  instance.on('message', json => { lastMessage = json?.toString?.().slice(0, 300) || ''; });
  instance.on('kicked', reason => { lastError = 'Servidor expulsou o bot: ' + (typeof reason === 'string' ? reason : JSON.stringify(reason).slice(0, 300)); state = 'kicked'; });
  instance.on('error', error => { lastError = error?.message || String(error); state = 'error'; connecting = false; });
  instance.on('end', reason => { if (bot === instance) { bot = null; connecting = false; state = 'offline'; if (reason) lastMessage = 'Conexão encerrada: ' + String(reason).slice(0, 200); } });
  return { ok: true, message: 'Pedido de conexão enviado. Veja o estado no painel.', status: getStatus() };
}
function stopBot() { if (!bot) { connecting = false; state = 'offline'; return { ok: true, message: 'O bot já está desconectado.', status: getStatus() }; } const oldBot = bot; bot = null; connecting = false; state = 'offline'; lastMessage = 'Desconexão solicitada pelo painel.'; try { oldBot.quit('Desconectado pelo painel'); } catch (error) { lastError = error.message; } return { ok: true, message: 'Desconexão solicitada.', status: getStatus() }; }
function findPlayer(target) {
  if (!bot) throw new Error('O bot não está conectado.'); const names = Object.keys(bot.players || {}).filter(name => name !== bot.username);
  if (target) { const exact = names.find(name => name.toLowerCase() === target.toLowerCase()); if (!exact) throw new Error('Não encontrei o jogador ' + target + '. Confira o nome e se está online.'); const entity = bot.players[exact]?.entity; if (!entity) throw new Error('Vejo ' + exact + ', mas ainda não recebi a posição dele.'); return { name: exact, entity }; }
  const nearest = names.map(name => ({ name, entity: bot.players[name]?.entity })).filter(item => item.entity).sort((a, b) => bot.entity.position.distanceTo(a.entity.position) - bot.entity.position.distanceTo(b.entity.position))[0];
  if (!nearest) throw new Error('Não encontrei jogador visível. Entre no mundo e informe o nome se necessário.'); return nearest;
}
function executeAction(plan) {
  if (!plan || typeof plan.action !== 'string') throw new Error('Plano inválido.');
  if (plan.action === 'status') { if (plan.message) lastMessage = plan.message; return { ok: true, message: plan.message || 'Estado consultado.', status: getStatus() }; }
  if (plan.action === 'stop') { if (bot?.pathfinder) bot.pathfinder.setGoal(null); lastMessage = 'Navegação parada.'; return { ok: true, message: lastMessage, status: getStatus() }; }
  if (!bot || state !== 'online') throw new Error('O bot ainda não entrou no mundo.');
  if (plan.action === 'say') { const message = String(plan.message || '').trim(); if (!message) throw new Error('A mensagem está vazia.'); if (message.startsWith('/')) throw new Error('Por segurança, o painel não envia comandos iniciados por /.'); bot.chat(message.slice(0, 180)); lastMessage = 'Mensagem enviada: ' + message.slice(0, 120); return { ok: true, message: lastMessage, status: getStatus() }; }
  if (plan.action === 'follow' || plan.action === 'come') { const player = findPlayer(plan.target); if (plan.action === 'follow') bot.pathfinder.setGoal(new goals.GoalFollow(player.entity, 2), true); else { const p = player.entity.position; bot.pathfinder.setGoal(new goals.GoalNear(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z), 2)); } lastMessage = plan.action === 'follow' ? 'Seguindo ' + player.name + '.' : 'Indo até ' + player.name + '.'; return { ok: true, message: lastMessage, status: getStatus() }; }
  throw new Error('Ação não suportada.');
}
module.exports = { startBot, stopBot, getStatus, executeAction };
