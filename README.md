# Minecraft AI Companion — Etapa 1

Painel web e bot para testar o servidor Aternos `catalufa.aternos.host:40492`, versão `26.3`, com acesso offline/cracked habilitado.

## Funções desta etapa
- Conectar e desconectar manualmente.
- Mostrar estado e posição do bot.
- Seguir um jogador, ir até um jogador, parar e mandar mensagem no chat.
- Interpretar pedidos básicos sem chave de IA; integração Gemini opcional.

## Configuração no Render
- Runtime: Node.
- Build command: `npm install`.
- Start command: `npm start`.
- Configure `MC_HOST`, `MC_PORT`, `MC_VERSION`, `BOT_USERNAME` e `PANEL_TOKEN`.
- `GEMINI_API_KEY` é opcional. Não coloque chaves secretas no GitHub.
- Abra o endereço HTTPS do Render, informe o token e clique em Conectar bot depois de ligar o Aternos.

## Limitações importantes
Esta é a primeira etapa, não um agente de sobrevivência completo. Ainda não coleta recursos, minera, faz crafting, come ou luta autonomamente. Geyser permite jogadores Bedrock no servidor, mas este bot conecta como cliente Java. A compatibilidade declarada do pacote com 26.3 precisa ser confirmada num teste real; whitelist, plugins ou limites do Aternos podem impedir a entrada. Render Free pode suspender/reiniciar o serviço e não garante conexão permanente.

Não há APK nesta etapa e não existe reconexão automática.
