# Reanálise de segurança do repositório (v2)

Data: 2026-04-14 (UTC)
Objetivo: reavaliar o estado atual do código após os hardenings anteriores e identificar riscos residuais e regressões potenciais.

## Visão geral

Estado atual melhorou significativamente em OAuth/CSRF/rate-limit, porém a versão atual ainda apresenta riscos relevantes, principalmente relacionados a **estado em memória**, **limites distribuídos** e **controles suscetíveis a bypass operacional**.

Classificação desta rodada:
- **1 risco alto**
- **5 riscos médios**
- **2 riscos baixos**

---

## 1) [ALTO] DoS por crescimento de memória na revogação de sessão (logout público)

**Onde:** `server/routers.ts` + `server/_core/sessionRevocation.ts`.

### Evidência
- `auth.logout` é `publicProcedure` e tenta revogar qualquer token presente em cookie.
- Em caso de token inválido, ainda chama `revokeSessionToken` com TTL de 1 hora.
- O armazenamento de revogação fica em `Map` local em memória.

### Impacto
Um atacante pode enviar alto volume de requisições de logout com valores aleatórios de cookie, gerando muitas entradas de revogação e consumindo memória do processo (degradação/DoS).

### Recomendações
- Revogar apenas quando o token for **válido e verificável**.
- Exigir autenticação efetiva para caminho de revogação.
- Mover revogação para backend com quota (Redis) + limite por IP/usuário.

---

## 2) [MÉDIO] Revogação e anti-bruteforce não são distribuídos

**Onde:** `server/_core/sessionRevocation.ts` e `server/routers.ts` (`challengeAttemptTracker`).

### Evidência
Controles críticos estão em memória local por processo (`Map`).

### Impacto
Em múltiplas instâncias/pods:
- revogações podem não ser vistas entre réplicas;
- limites de tentativas podem ser contornados alternando instância;
- restart limpa estado e remove proteção histórica.

### Recomendações
Persistir ambos os controles em armazenamento compartilhado com TTL e chaves por usuário/IP/recurso.

---

## 3) [MÉDIO] Sessões longas continuam ampliando janela de comprometimento

**Onde:** `shared/const.ts` (`ONE_YEAR_MS`) + emissão de sessão em OAuth.

### Evidência
Token de sessão continua com validade longa (1 ano).

### Impacto
Se cookie for comprometido, janela de abuso permanece extensa.

### Recomendações
- Reduzir TTL de sessão.
- Implementar rotação (short-lived + refresh).

---

## 4) [MÉDIO] Middleware CSRF depende de headers e pode gerar bypass/false-positive por edge misconfig

**Onde:** `server/_core/index.ts`.

### Evidência
Validação de mutações depende de `Origin/Referer` e fallback com `Host` quando allowlist não está configurada.

### Impacto
Sem padronização rígida na borda (proxy/LB), pode ocorrer bloqueio indevido ou validação inconsistente.

### Recomendações
- Em produção, forçar allowlist explícita (`CSRF_ALLOWED_ORIGINS`) e falhar startup se ausente.
- Normalizar headers no proxy e documentar contrato de segurança.

---

## 5) [MÉDIO] Logout ainda exposto a automação sem limite dedicado

**Onde:** `server/_core/index.ts` + `server/routers.ts`.

### Evidência
Há limiters específicos para algumas rotas, mas não há limiter dedicado para logout.

### Impacto
Facilita abuso de rota de logout (incluindo vetor de crescimento de mapa de revogação).

### Recomendações
Adicionar rate-limit por IP e, idealmente, por identidade em `auth.logout`.

---

## 6) [MÉDIO] State OAuth usa cookie acessível por JS (risco residual em cenário de XSS)

**Onde:** `client/src/const.ts`.

### Evidência
Cookie de nonce é definido no cliente e não pode ser `HttpOnly` nesse desenho.

### Impacto
Com XSS ativo no origin, nonce/state podem ser manipulados.

### Recomendações
- Fortalecer ainda mais CSP e reduzir superfícies de script inline.
- Considerar iniciar OAuth no backend para emissão de state totalmente server-side.

---

## 7) [BAIXO] Tratamento de erro OAuth ainda agrega falhas distintas em mesma resposta final

**Onde:** `server/_core/oauth.ts`.

### Evidência
Há melhoria para state inválido (400), mas o `catch` final continua retornando 500 genérico para diversas falhas externas.

### Impacto
Diagnóstico operacional menos preciso.

### Recomendações
Classificar falhas por categoria (cliente, upstream OAuth, interna) para observabilidade e resposta.

---

## 8) [BAIXO] Documentação de segurança dispersa em múltiplos relatórios

**Onde:** raiz do repositório (`impartial-security-assessment...`, `post-hardening...`, esta reanálise).

### Evidência
Existem múltiplos relatórios com snapshots em momentos diferentes.

### Impacto
Risco de interpretação incorreta do estado atual se times consultarem documento antigo.

### Recomendações
Manter um `SECURITY_STATUS.md` canônico com status de cada achado (aberto, mitigado, aceito).

---

## Conclusão

O repositório evoluiu bem em controles de autenticação e validação de origem, mas os próximos ganhos de segurança dependem de:
1. substituir estado em memória por controle distribuído;
2. endurecer logout/revogação contra abuso volumétrico;
3. reduzir TTL de sessão e aprimorar observabilidade operacional.
