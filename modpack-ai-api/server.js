import express from "express";

const app = express();
const PORT = Number(process.env.PORT || 10000);
const HUB_API_KEY = process.env.HUB_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const HUB_ORIGIN = process.env.HUB_ORIGIN || "https://mikael-modpack-hub.onrender.com";
const MAX_MESSAGE_CHARS = 12000;

app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin === HUB_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", HUB_ORIGIN);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(origin === HUB_ORIGIN ? 204 : 403);
  next();
});

const requests = new Map();
function rateLimit(req, res, next) {
  const key = req.ip || "unknown";
  const now = Date.now();
  const recent = (requests.get(key) || []).filter(t => now - t < 60_000);
  if (recent.length >= 20) return res.status(429).json({ ok:false, error:"Limite de 20 mensagens por minuto atingido. Aguarde um pouco." });
  recent.push(now);
  requests.set(key, recent);
  if (requests.size > 2000) {
    for (const [ip, times] of requests) if (!times.some(t => now - t < 60_000)) requests.delete(ip);
  }
  next();
}

function requireHubKey(req, res, next) {
  if (!HUB_API_KEY || req.get("x-api-key") !== HUB_API_KEY) {
    return res.status(401).json({ ok:false, error:"Acesso não autorizado." });
  }
  next();
}

const SYSTEM_INSTRUCTION = `Você é Mikael AI, especialista em Minecraft Java e Bedrock, modpacks e modding.
Responda sempre em português brasileiro, com instruções claras e adequadas para iniciantes.
Especialidades: Forge, Fabric, NeoForge, versões Minecraft, CurseForge, Modrinth, dependências,
compatibilidade de mods, análise de crash logs, configurações, desempenho, FPS e uso de RAM.
Nunca invente IDs, versões, dependências, links ou compatibilidade. Quando não houver dados suficientes,
explique a incerteza e peça o log, versão do jogo, loader e lista de mods necessários.
Ao analisar crash logs, identifique evidências concretas e separe causa provável de hipótese.
Não prometa aumento garantido de FPS. Não afirme que pesquisou CurseForge/Modrinth em tempo real:
esta API só pode usar dados fornecidos na conversa. Para ações externas, explique a limitação.
Não solicite senhas, tokens privados ou chaves de API. Não execute código enviado pelo usuário.`;

app.get("/health", (_req, res) => res.json({
  ok:true,
  service:"mikael-ai-modpack-api",
  provider:"gemini",
  model:GEMINI_MODEL,
  aiConfigured:Boolean(GEMINI_API_KEY),
  hubKeyConfigured:Boolean(HUB_API_KEY)
}));

app.post("/v1/chat", requireHubKey, rateLimit, async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-12) : [];
  if (!message) return res.status(400).json({ ok:false, error:"Envie uma mensagem." });
  if (message.length > MAX_MESSAGE_CHARS) return res.status(413).json({ ok:false, error:"A mensagem passou do limite de 12.000 caracteres." });
  if (!GEMINI_API_KEY) return res.status(503).json({ ok:false, code:"AI_NOT_CONFIGURED", error:"A Mikael AI está no ar, mas falta configurar GEMINI_API_KEY nos Secrets do Render." });

  const contents = [];
  for (const item of history) {
    if (!item || !["user","model"].includes(item.role) || typeof item.text !== "string") continue;
    contents.push({ role:item.role, parts:[{text:item.text.slice(0, MAX_MESSAGE_CHARS)}] });
  }
  contents.push({ role:"user", parts:[{text:message}] });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
      method:"POST",
      headers:{"Content-Type":"application/json","x-goog-api-key":GEMINI_API_KEY},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:SYSTEM_INSTRUCTION}]},
        contents,
        generationConfig:{temperature:0.35, maxOutputTokens:1800}
      }),
      signal:controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const status = response.status === 429 ? 429 : 502;
      return res.status(status).json({ok:false,error:response.status===429
        ? "O provedor de IA atingiu o limite temporário. Tente novamente mais tarde."
        : "O provedor de IA não conseguiu responder. Verifique a chave e a configuração do modelo no Render."});
    }
    const answer = data?.candidates?.[0]?.content?.parts?.map(p=>p.text || "").join("\n").trim();
    if (!answer) return res.status(502).json({ok:false,error:"A IA retornou uma resposta vazia. Tente novamente."});
    return res.json({ok:true,answer,model:GEMINI_MODEL});
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return res.status(timedOut ? 504 : 502).json({ok:false,error:timedOut
      ? "A resposta demorou demais. Tente novamente."
      : "Não foi possível conectar ao provedor de IA."});
  } finally {
    clearTimeout(timeout);
  }
});

app.use((err, _req, res, _next) => {
  if (err?.type === "entity.too.large") return res.status(413).json({ok:false,error:"Corpo da solicitação muito grande."});
  if (err instanceof SyntaxError) return res.status(400).json({ok:false,error:"JSON inválido."});
  return res.status(500).json({ok:false,error:"Erro interno."});
});

app.listen(PORT, "0.0.0.0", () => console.log(`Mikael AI API listening on ${PORT}`));
