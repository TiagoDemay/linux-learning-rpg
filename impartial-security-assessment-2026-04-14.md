# Análise imparcial de segurança — linux-learning-rpg

Data da análise: 2026-04-14 (UTC)
Escopo: código fonte `server/`, `client/`, `shared/`, `drizzle/`, configuração de build/dev (`package.json`, `vite.config.ts`, `drizzle.config.ts`).
Critério: análise estática, sem considerar como fonte de verdade arquivos de revisão prévia de segurança.

## Resumo executivo

Foram identificados **8 pontos relevantes** de risco, sendo:

- **2 críticos** (quebra de sessão/autenticação e CSRF em endpoints com cookie);
- **2 altos** (bloqueio de contas via brute force e ausência de hardening de transporte na trust boundary de proxy);
- **3 médios** (CSP desabilitada, callback OAuth sem limitação de taxa, exposição de logs em dev sem autenticação);
- **1 baixo** (mensagens de erro detalhadas em upload/storage).

---

## Achados de segurança

## 1) [CRÍTICO] Login CSRF / Session swapping no callback OAuth

**Onde:** `server/_core/oauth.ts`, `client/src/const.ts`, `server/_core/sdk.ts`.

### Evidência técnica
- O `state` enviado no login é apenas `btoa(redirectUri)` e não inclui nonce assinado nem vínculo com sessão do navegador.  
- No callback, `code` e `state` são aceitos e processados sem validação de origem/nonce anti-CSRF.

### Impacto
Um atacante pode induzir a vítima a abrir uma URL `/api/oauth/callback?code=...&state=...` previamente obtida para a conta do atacante, fazendo a vítima ficar autenticada na conta errada (login CSRF / account confusion).

### Recomendação
- Gerar `state` com entropia forte (nonce), armazenar em cookie HttpOnly/SameSite e validar no callback.
- Invalidar o `state` após uso único.
- Opcional: usar PKCE se suportado pelo provedor OAuth.

---

## 2) [CRÍTICO] Superfície de CSRF em API autenticada por cookie

**Onde:** `server/_core/cookies.ts`, `server/_core/index.ts`, `server/routers.ts`.

### Evidência técnica
- Cookie de sessão em HTTPS usa `sameSite: "none"` e `secure: true`.
- Não há validação explícita de `Origin/Referer` nem token anti-CSRF nas mutações tRPC (`progress.save`, `shop.buy`, rotas administrativas etc.).

### Impacto
Em cenários com requisições cross-site permitidas pelo navegador/proxy (ou combinações de fallback e endpoints aceitáveis), um site malicioso pode acionar ações autenticadas em nome do usuário.

### Recomendação
- Implementar proteção CSRF robusta para todas as mutações (double-submit token ou synchronizer token).
- Bloquear `Origin` não confiável no middleware.
- Reavaliar necessidade de `SameSite=None`; preferir `Lax` quando possível.

---

## 3) [ALTO] Brute force de respostas de desafios (economia do jogo)

**Onde:** `server/routers.ts`, `server/_core/index.ts`.

### Evidência técnica
- `challenge.submit` tem rate-limit por IP (20/min), mas não há bloqueio progressivo por usuário/conta nem cooldown por desafio.
- A validação por regex permite tentativa iterativa sistemática de comandos válidos.

### Impacto
Automação distribuída (IPs rotativos, salas/labs) pode farmar recompensas e degradar integridade do ranking.

### Recomendação
- Limite por usuário + por desafio + janela temporal (ex.: N tentativas/10 min).
- Backoff exponencial e lock temporário após falhas repetidas.
- Correlacionar com `securityEvents` para resposta automática.

---

## 4) [ALTO] Trust proxy simplificada pode permitir interpretação incorreta de HTTPS

**Onde:** `server/_core/index.ts`, `server/_core/cookies.ts`.

### Evidência técnica
- `app.set("trust proxy", 1)` assume exatamente um proxy confiável.
- A decisão de cookie seguro usa `req.protocol`/`x-forwarded-proto`; cadeia real de proxies diferente pode gerar comportamento inesperado.

### Impacto
Em topologias de rede não aderentes (multi-proxy/CDN/LB), há risco de aplicar política de cookie inadequada e inconsistência de segurança.

### Recomendação
- Configurar `trust proxy` conforme infraestrutura real (subnet/lista de proxies confiáveis).
- Validar em staging produção com inspeção de headers reais.

---

## 5) [MÉDIO] CSP desabilitada globalmente

**Onde:** `server/_core/index.ts`.

### Evidência técnica
- `helmet({ contentSecurityPolicy: false })` desativa proteção CSP.

### Impacto
Aumenta impacto de qualquer XSS (refletido/armazenado/DOM-based), incluindo de bibliotecas de terceiros e templates dinâmicos.

### Recomendação
- Habilitar CSP com política explícita (`default-src 'self'`, nonces para scripts inline etc.).
- Medir e ajustar com modo report-only antes de enforcing.

---

## 6) [MÉDIO] Callback OAuth sem rate-limit dedicado

**Onde:** `server/_core/index.ts`, `server/_core/oauth.ts`.

### Evidência técnica
- Rate limit está aplicado em `/api/trpc` e sub-rotas específicas, mas não em `/api/oauth/callback`.

### Impacto
Maior risco de abuso (flood de callback), pressão no provedor OAuth e aumento de superfície para enumeração/DoS.

### Recomendação
- Adicionar limiter específico para callback OAuth (por IP + burst curto).
- Registrar telemetria de falhas por motivo.

---

## 7) [MÉDIO] Endpoint de coleta de logs em dev sem autenticação

**Onde:** `vite.config.ts`, `client/public/__manus__/debug-collector.js`.

### Evidência técnica
- Em desenvolvimento, `/__manus__/logs` aceita POST sem autenticação e grava payloads em disco.
- Há truncamento por arquivo, mas ainda existe vetor de ruído/abuso em ambiente compartilhado.

### Impacto
Pode poluir logs, ocultar sinais reais e consumir I/O em ambientes de desenvolvimento remoto compartilhado.

### Recomendação
- Restringir endpoint a localhost/IP de desenvolvedor, ou exigir token efêmero em dev.
- Desabilitar completamente em ambientes compartilhados.

---

## 8) [BAIXO] Mensagens de erro de storage podem vazar detalhes operacionais

**Onde:** `server/storage.ts`.

### Evidência técnica
- Em falha de upload, a mensagem combina status + texto retornado pelo upstream.

### Impacto
Pode expor detalhes internos (nomes de bucket/path/políticas) em logs ou respostas encadeadas.

### Recomendação
- Sanitizar mensagens externas e logar detalhes apenas em canal interno.

---

## Pontos positivos observados

- Uso de `helmet` e `express-rate-limit` na API principal.
- Validação robusta de payloads com Zod em diversas mutações sensíveis.
- Controle de autorização por role em procedimentos administrativos.
- Não foi identificado uso direto de SQL concat string (uso majoritário de Drizzle ORM).

---

## Próximos passos prioritários (ordem sugerida)

1. Corrigir fluxo OAuth (`state` forte + validação + uso único).
2. Introduzir proteção CSRF em mutações autenticadas por cookie.
3. Hardening de proxy/headers e revisão de política de cookies em produção.
4. Reforçar anti-abuso (rate-limit por usuário + callback OAuth limiter).
5. Reativar CSP com rollout progressivo.
