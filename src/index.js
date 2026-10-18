require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { startBot, stopBot, getStatus, executeAction } = require('./bot');
const { planCommand } = require('./ai');
const app = express();
const port = Number(process.env.PORT || 10000);
const panelToken = process.env.PANEL_TOKEN || '';
if (!panelToken || panelToken === 'COLOQUE_UM_TOKEN_LONGO_AQUI') {
  console.error('ERRO: configure PANEL_TOKEN com um token privado longo nas variáveis de ambiente.');
  process.exit(1);
}
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));
function requireToken(req, res, next) {
  const header = req.get('authorization') || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(supplied); const b = Buffer.from(panelToken);
  if (!supplied || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ ok: false, error: 'Token do painel inválido.' });
  next();
}
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));
app.get('/api/status', requireToken, (_req, res) => res.json({ ok: true, status: getStatus() }));
app.post('/api/start', requireToken, (_req, res) => { try { res.json(startBot()); } catch (e) { res.status(400).json({ ok: false, error: e.message, status: getStatus() }); } });
app.post('/api/stop', requireToken, (_req, res) => { try { res.json(stopBot()); } catch (e) { res.status(400).json({ ok: false, error: e.message, status: getStatus() }); } });
app.post('/api/command', requireToken, async (req, res) => {
  const command = typeof req.body?.command === 'string' ? req.body.command.trim() : '';
  const target = typeof req.body?.target === 'string' ? req.body.target.trim().slice(0, 16) : '';
  if (!command || command.length > 500) return res.status(400).json({ ok: false, error: 'Informe um pedido de até 500 caracteres.' });
  try { const plan = await planCommand(command, target, getStatus()); const result = executeAction(plan); res.json({ ...result, plan: { action: plan.action, target: plan.target || '', message: plan.message || '' } }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message, status: getStatus() }); }
});
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ ok: false, error: 'Erro interno no painel.' }); });
app.listen(port, '0.0.0.0', () => console.log('Painel ouvindo na porta ' + port));
