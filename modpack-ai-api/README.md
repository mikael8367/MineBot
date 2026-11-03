# Mikael AI — Modpack API

Serviço Node.js independente do Mikael Modpack Hub.

## Render
- Runtime: Node
- Build command: `npm install --prefix modpack-ai-api`
- Start command: `npm start --prefix modpack-ai-api`
- Health check: `/health`
- Region: Ohio

## Environment
- `HUB_API_KEY`: segredo compartilhado com o backend do Hub.
- `HUB_ORIGIN`: `https://mikael-modpack-hub.onrender.com`
- `GEMINI_API_KEY`: chave do Google AI Studio (configurar nos Secrets do Render).
- `GEMINI_MODEL`: padrão `gemini-3.8-flash`.

A API não armazena conversas. A rota `POST /v1/chat` exige o cabeçalho `X-API-Key`.
