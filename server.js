// Servidor do Cabo de Guerra — conecta na live do TikTok e repassa os eventos pro jogo.
// Rodar: npm install && npm start   (abre em http://localhost:3000)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const SIGN_API_KEY = process.env.EULER_API_KEY || undefined; // opcional (aumenta o limite de conexões)

// ---------- Servidor de arquivos (serve a pasta public) ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.mp3': 'audio/mpeg' };
// Procura os arquivos na pasta "public" e, se não achar, na raiz do projeto
const PASTAS = [path.join(__dirname, 'public'), __dirname];
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const nome = url === '/' ? 'index.html' : url;
  if (/\.\.|server\.js|package/.test(nome)) { res.writeHead(403); return res.end(); }
  const tenta = (i) => {
    if (i >= PASTAS.length) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Não encontrado: o index.html precisa estar na pasta "public" ou na raiz do repositório.');
    }
    const file = path.join(PASTAS[i], nome);
    fs.readFile(file, (err, data) => {
      if (err) return tenta(i + 1);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  };
  tenta(0);
});

// ---------- WebSocket: jogo <-> servidor ----------
const wss = new WebSocketServer({ server });
let tiktok = null;
let currentUser = '';

function broadcast(msg) {
  const txt = JSON.stringify(msg);
  for (const c of wss.clients) if (c.readyState === 1) c.send(txt);
}

function userOf(d) {
  const u = d.user || {};
  return {
    id: u.uniqueId || u.userId || 'anon',
    name: u.nickname || u.uniqueId || 'Anônimo',
  };
}

async function connectTikTok(username) {
  username = String(username || '').trim().replace(/^@/, '');
  if (!username) return broadcast({ type: 'status', ok: false, text: 'Digite seu @ do TikTok' });

  if (tiktok) { try { await tiktok.disconnect(); } catch {} tiktok = null; }
  currentUser = username;
  broadcast({ type: 'status', ok: false, text: `Conectando em @${username}...` });

  const conn = new TikTokLiveConnection(username, { signApiKey: SIGN_API_KEY, enableExtendedGiftInfo: true, processInitialData: false });
  tiktok = conn;

  conn.on(WebcastEvent.CHAT, (d) => broadcast({ type: 'chat', user: userOf(d), text: d.comment || '' }));

  conn.on(WebcastEvent.GIFT, (d) => {
    const det = d.giftDetails || {};
    const ext = d.extendedGiftInfo || {};
    const giftType = det.giftType ?? d.giftType;
    // Presentes em sequência (combo) só contam quando o combo termina
    if (giftType === 1 && !d.repeatEnd) return;
    broadcast({
      type: 'gift',
      user: userOf(d),
      giftName: det.giftName || ext.name || d.giftName || `Presente ${d.giftId}`,
      giftId: d.giftId,
      count: d.repeatCount || 1,
      diamonds: det.diamondCount || ext.diamond_count || d.diamondCount || 1,
    });
  });

  conn.on(WebcastEvent.LIKE, (d) => broadcast({ type: 'like', user: userOf(d), count: d.likeCount || 1 }));
  conn.on(WebcastEvent.FOLLOW, (d) => broadcast({ type: 'follow', user: userOf(d) }));
  conn.on(WebcastEvent.SHARE, (d) => broadcast({ type: 'share', user: userOf(d) }));
  conn.on(WebcastEvent.STREAM_END, () => broadcast({ type: 'status', ok: false, text: 'A live terminou' }));
  conn.on(ControlEvent.DISCONNECTED, () => {
    if (tiktok !== conn) return;
    broadcast({ type: 'status', ok: false, text: 'Desconectado. Tentando de novo em 10s...' });
    setTimeout(() => { if (tiktok === conn) connectTikTok(currentUser); }, 10000);
  });

  try {
    const state = await conn.connect();
    broadcast({ type: 'status', ok: true, text: `Conectado em @${username}` });
    console.log(`Conectado na sala ${state.roomId} (@${username})`);
  } catch (err) {
    console.error('Falha ao conectar:', err?.message || err);
    const offline = /offline|not live|UserOffline/i.test(String(err?.message || err?.constructor?.name || ''));
    broadcast({ type: 'status', ok: false, text: offline ? `@${username} não está ao vivo. Inicie a live primeiro.` : 'Não conectou. Confira o @ e tente de novo.' });
    if (tiktok === conn) tiktok = null;
  }
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'status', ok: !!tiktok?.isConnected, text: tiktok?.isConnected ? `Conectado em @${currentUser}` : 'Servidor pronto. Conecte sua live.' }));
  ws.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === 'connect') connectTikTok(msg.username);
    if (msg.type === 'disconnect' && tiktok) { tiktok.disconnect().catch(() => {}); tiktok = null; broadcast({ type: 'status', ok: false, text: 'Desconectado' }); }
  });
});

server.listen(PORT, () => console.log(`Cabo de guerra rodando em http://localhost:${PORT}`));
if (process.env.TIKTOK_USER) connectTikTok(process.env.TIKTOK_USER);
