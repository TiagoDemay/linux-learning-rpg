# Pós-hardening: análise detalhada de vulnerabilidades remanescentes

Data: 2026-04-14 (UTC)
Escopo: revisão do estado **após** as correções recentes (OAuth, CSRF, rate-limit, anti-bruteforce, CSP e endpoint de logs).

## Resumo executivo

As correções recentes reduziram riscos importantes, porém ainda há superfícies relevantes:

- **1 risco alto**;
- **4 riscos médios**;
- **2 riscos baixos**.

---

## 1) [ALTO] Sessão JWT aceita `appId` sem validação contra o projeto atual

**Onde:** `server/_core/sdk.ts` (`verifySession`).

### Evidência
A função `verifySession` valida assinatura e expiração, mas apenas checa se `openId`, `appId` e `name` são strings não vazias; ela **não exige** que `appId === ENV.appId`.

### Impacto
Se houver compartilhamento indevido de segredo entre ambientes/projetos, um token válido de outro contexto pode ser aceito aqui (confusão de contexto/autorização).

### Recomendações
- Em `verifySession`, rejeitar tokens cujo `appId` difere de `ENV.appId`.
- Opcional: adicionar `iss` e `aud` e validá-los no `jwtVerify`.

---

## 2) [MÉDIO] Vida útil da sessão muito longa (1 ano) sem rotação/revogação server-side

**Onde:** `shared/const.ts` (`ONE_YEAR_MS`), `server/_core/sdk.ts` (`createSessionToken` / `signSession`).

### Evidência
Sessão emitida com validade padrão de 1 ano e sem mecanismo de revogação (blacklist/jti/rotating refresh).

### Impacto
Roubo de cookie/session token gera janela longa de abuso mesmo após logout local em outro dispositivo.

### Recomendações
- Reduzir TTL do access token (ex.: horas).
- Implementar refresh token rotativo com revogação server-side.
- Incluir `jti` e lista de revogação para invalidação imediata.

---

## 3) [MÉDIO] Proteção anti-bruteforce de desafios é in-memory e não distribuída

**Onde:** `server/routers.ts` (`challengeAttemptTracker`).

### Evidência
Tentativas são rastreadas em `Map` em memória do processo.

### Impacto
Em ambiente com múltiplas instâncias/pods, atacante pode distribuir tentativas entre réplicas. Reinício do processo zera contadores.

### Recomendações
- Persistir contador em Redis (ou banco) com TTL por chave.
- Definir limites globais por usuário e por IP, não só por instância.

---

## 4) [MÉDIO] CSRF check depende de `Host` da requisição e pode ficar frágil sem normalização na borda

**Onde:** `server/_core/index.ts` (middleware CSRF por `Origin/Referer` vs `Host`).

### Evidência
A comparação usa `req.get("host")` como referência de confiança.

### Impacto
Sem normalização estrita no reverse proxy/LB, variações de host/porta/canonicalização podem gerar bypass ou falso bloqueio.

### Recomendações
- Comparar contra allowlist explícita de origins canônicos em produção.
- Garantir que proxy sobrescreve/valida `Host` e `X-Forwarded-*`.

---

## 5) [MÉDIO] Callback OAuth não limita tentativas por identidade lógica

**Onde:** `server/_core/index.ts` (`/api/oauth/callback` rate-limit).

### Evidência
Há limiter por IP, mas sem correlação por `code`, `nonce`, `openId` ou fingerprint adicional.

### Impacto
Em ambientes NAT/proxy e ataques distribuídos, o controle por IP pode ser insuficiente.

### Recomendações
- Registrar falhas por motivo (`nonce inválido`, `code inválido`, etc.).
- Bloqueio temporário por padrões de abuso + telemetria ativa.

---

## 6) [BAIXO] Parse de `state` inválido retorna erro 500 genérico no callback

**Onde:** `server/_core/oauth.ts` + `server/_core/sdk.ts`.

### Evidência
Falhas em `parseOAuthState` entram no `catch` geral do callback e retornam `500`.

### Impacto
Ajuda a mascarar erros do cliente como falha interna e dificulta triagem operacional; também facilita ruído de monitoramento.

### Recomendações
- Tratar erro de estado inválido como `400` explícito.

---

## 7) [BAIXO] Endpoint de logs de dev ainda é superfície sensível em ambientes compartilhados

**Onde:** `vite.config.ts` (`/__manus__/logs`).

### Evidência
Mesmo com restrição de localhost/token, continua sendo endpoint ativo em dev quando ligado em host público.

### Impacto
Risco residual de exposição operacional se token for reutilizado/fraco ou configuração for indevida.

### Recomendações
- Desabilitar plugin por padrão fora de máquina local.
- Exigir token forte e rotativo quando habilitado em ambiente remoto.

---

## Pontos que melhoraram com as últimas correções

- OAuth state agora possui nonce e validação no callback.
- Middleware de CSRF para mutações tRPC foi introduzido.
- CSP em produção e trust proxy configurável.
- Rate limit dedicado para callback OAuth.
- Anti-bruteforce por desafio foi adicionado.
- Mensagens de erro de storage foram sanitizadas.

---

## Prioridade sugerida de próxima iteração

1. Validar `appId` do token e adicionar `iss/aud`.
2. Reduzir TTL de sessão e implantar revogação/rotação.
3. Migrar anti-bruteforce para armazenamento distribuído.
4. Endurecer validação de origins canônicos na camada de borda + app.
5. Melhorar telemetria/classificação de falhas no callback OAuth.
