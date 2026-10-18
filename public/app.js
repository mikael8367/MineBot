const $ = id => document.getElementById(id);
let token = sessionStorage.getItem('panelToken') || '';
$('token').value = token;
function showMessage(text, isError = false) { $('lastMessage').textContent = isError ? '' : (text || ''); $('lastError').textContent = isError ? (text || '') : ''; }
async function api(path, body) {
  if (!token) throw new Error('Digite primeiro o token privado do painel.');
  const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: 'Bearer ' + token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({})); if (!response.ok || data.ok === false) throw new Error(data.error || ('Erro HTTP ' + response.status)); return data;
}
function renderStatus(status) { if (!status) return; $('stateBadge').textContent = status.state || 'desconhecido'; $('serverInfo').textContent = (status.username || 'bot') + ' → ' + (status.host || '?') + ':' + (status.port || '?') + ' · versão ' + (status.version || '?'); $('position').textContent = status.position ? 'Posição: X ' + status.position.x + ', Y ' + status.position.y + ', Z ' + status.position.z : 'Posição: ainda indisponível'; if (status.lastMessage) $('lastMessage').textContent = status.lastMessage; $('lastError').textContent = status.lastError || ''; }
async function refreshStatus() { try { const data = await api('/api/status'); renderStatus(data.status); $('authMessage').textContent = 'Painel conectado.'; } catch (e) { $('authMessage').textContent = e.message; } }
$('saveToken').addEventListener('click', async () => { token = $('token').value.trim(); if (!token) { $('authMessage').textContent = 'Digite o token.'; return; } sessionStorage.setItem('panelToken', token); await refreshStatus(); });
$('startBot').addEventListener('click', async () => { try { const d = await api('/api/start', {}); renderStatus(d.status); showMessage(d.message); await refreshStatus(); } catch (e) { showMessage(e.message, true); } });
$('stopBot').addEventListener('click', async () => { try { const d = await api('/api/stop', {}); renderStatus(d.status); showMessage(d.message); } catch (e) { showMessage(e.message, true); } });
$('refresh').addEventListener('click', refreshStatus);
$('sendCommand').addEventListener('click', async () => { const command = $('command').value.trim(); const target = $('target').value.trim(); if (!command) return showMessage('Digite uma ordem primeiro.', true); try { const d = await api('/api/command', { command, target }); renderStatus(d.status); showMessage((d.message || 'Ordem processada') + (d.plan ? ' (ação: ' + d.plan.action + ')' : '')); } catch (e) { showMessage(e.message, true); } });
document.querySelectorAll('[data-command]').forEach(b => b.addEventListener('click', () => { $('command').value = b.dataset.command; }));
if (token) refreshStatus();
setInterval(() => { if (token && document.visibilityState === 'visible') refreshStatus(); }, 10000);
