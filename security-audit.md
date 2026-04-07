# Relatório de Auditoria de Segurança — Linux Learning RPG
**Data:** 07/04/2026 | **Autor:** Manus AI | **Versão analisada:** bcb85ad3 → atual

---

## Sumário Executivo

A auditoria identificou **9 vulnerabilidades** distribuídas em três categorias: lógica de jogo exposta no cliente, ausência de controles no servidor e configurações de infraestrutura inadequadas. Três são classificadas como **Críticas** (exploração imediata sem autenticação especial), quatro como **Altas** e duas como **Médias**.

---

## Vulnerabilidades Encontradas

### 🔴 CRÍTICA — V1: Lógica de validação dos desafios exposta no bundle JS

**Arquivo:** `client/src/data/tasks.ts`

Toda a lógica de validação (`validate: (vfs, history) => boolean`) e os campos `commands[]` e `hint` de todos os 100 desafios são compilados no bundle JavaScript público. Qualquer aluno pode abrir o DevTools do navegador, inspecionar o bundle e ver exatamente quais comandos são aceitos como resposta correta, sem precisar resolver o desafio.

**Impacto:** O aluno pode completar todos os 100 desafios em segundos sem aprender nada, apenas copiando as respostas do código-fonte.

**Correção necessária:** Mover a validação para o servidor. O cliente envia o comando digitado; o servidor valida contra a lógica armazenada server-side e retorna apenas `{ success: boolean, reward: number }`.

---

### 🔴 CRÍTICA — V2: Hints revelados automaticamente ao avançar de desafio

**Arquivo:** `client/src/components/Terminal.tsx` (linha 257)

Ao concluir um desafio, o terminal exibe automaticamente `💡 Dica: ${next.hint}` do **próximo** desafio sem que o aluno precise comprar ou solicitar o item "Pergaminho da Revelação". O item da loja existe, mas a dica já é entregue de graça.

**Impacto:** O sistema de economia da loja (15 moedas por hint) é completamente contornado. O aluno nunca precisa comprar o item.

**Correção necessária:** Remover a exibição automática do hint ao avançar. Exibir apenas o título e a descrição do próximo desafio.

---

### 🔴 CRÍTICA — V3: Compras da loja são 100% client-side sem validação server-side

**Arquivo:** `client/src/pages/Home.tsx` (função `handleBuyItem`)

Toda a lógica de compra da loja — verificação de saldo, dedução de moedas, adição de itens ao inventário — ocorre exclusivamente no cliente. O estado é salvo no `localStorage` e depois enviado para o servidor via `progress.save`. Um aluno pode manipular o `localStorage` diretamente para adicionar itens sem pagar, ou chamar a API `progress.save` com `purchasedItems` e `consumableStock` arbitrários.

**Impacto:** Itens como "Poção do Atalho" (skip) podem ser obtidos gratuitamente em quantidade ilimitada, permitindo pular todos os desafios sem custo.

**Correção necessária:** Implementar a lógica de compra como uma mutation tRPC server-side (`shop.buy`) que verifica o saldo no banco, deduz as moedas e registra os itens comprados. O servidor deve ser a fonte de verdade do inventário.

---

### 🟠 ALTA — V4: Ausência de headers de segurança HTTP

**Arquivo:** `server/_core/index.ts`

O servidor Express não configura nenhum header de segurança: sem `helmet`, sem `X-Frame-Options`, sem `Content-Security-Policy`, sem `X-Content-Type-Options`. O body parser aceita payloads de até **50 MB** — excessivo para uma API de jogo que envia apenas strings JSON pequenas.

**Impacto:** Vulnerabilidade a clickjacking, MIME sniffing e ataques de DoS via payloads grandes. O limite de 50 MB permite que um atacante envie requisições gigantes para consumir memória do servidor.

**Correção necessária:** Instalar `helmet` e reduzir o limite do body parser para `1mb`.

---

### 🟠 ALTA — V5: `openId` dos usuários retornado pela função `getTopPlayers`

**Arquivo:** `server/db.ts` (função `getTopPlayers`, linhas 332–390)

A query `getTopPlayers` seleciona `openId: users.openId` em todos os três branches. Embora o router (`routers.ts`) não exponha o campo `openId` na resposta pública do ranking, a função retorna o dado e qualquer alteração futura no router pode acidentalmente expô-lo.

**Impacto:** O `openId` é um identificador OAuth sensível que não deve circular fora do servidor.

**Correção necessária:** Remover `openId` do `select` na função `getTopPlayers` em `db.ts`.

---

### 🟠 ALTA — V6: Ausência de rate limiting na rota `progress.save`

**Arquivo:** `server/routers.ts`

Não há nenhum controle de frequência nas chamadas à rota `progress.save`. Um script automatizado pode chamar essa rota centenas de vezes por segundo tentando encontrar combinações de `coins` e `challengeProgress` que passem pela validação.

**Impacto:** Mesmo com a validação anti-cheat implementada anteriormente, um atacante pode fazer brute-force para descobrir os limites exatos aceitos pelo servidor.

**Correção necessária:** Implementar rate limiting por usuário (ex: máximo de 10 saves por minuto).

---

### 🟠 ALTA — V7: `purchasedItems` e `consumableStock` aceitos sem validação no `progress.save`

**Arquivo:** `server/routers.ts` (rota `progress.save`)

A validação anti-cheat implementada anteriormente verifica `coins`, `completedLevels` e `challengeProgress`, mas **não valida** `purchasedItems` nem `consumableStock`. Um aluno pode enviar `purchasedItems: ["autocomplete","man-extended","history-50","cheat-sheet-git","cheat-sheet-network","cheat-sheet-permissions"]` e `consumableStock: {"reveal-hint": 999, "skip-challenge": 999, "double-coins": 999}` diretamente via API.

**Impacto:** Todos os itens da loja podem ser obtidos gratuitamente via chamada direta à API.

**Correção necessária:** Adicionar validação de `purchasedItems` e `consumableStock` na função `validateProgress` do servidor, verificando se os valores são consistentes com as moedas gastas.

---

### 🟡 MÉDIA — V8: Hint exibido automaticamente ao abrir o terminal (primeiro desafio)

**Arquivo:** `client/src/components/Terminal.tsx` (linha 111)

Ao entrar em um território, a mensagem de boas-vindas exibe `${currentChallenge.description}` diretamente. Para os territórios 1 e 2 (Floresta de Stallman e Tundra do Slackware), as descrições ainda contêm os comandos explícitos. Para os demais territórios, as descrições foram melhoradas, mas o campo `commands[]` no painel lateral lista os comandos esperados com clique para inserir automaticamente.

**Impacto:** O painel lateral com `commands[]` clicáveis essencialmente entrega a resposta ao aluno sem esforço cognitivo.

**Correção necessária:** Remover os botões clicáveis de `commands[]` do painel lateral, ou substituí-los por categorias genéricas (ex: "Comandos de rede") sem revelar o comando exato.

---

### 🟡 MÉDIA — V9: Ausência de log de auditoria para tentativas suspeitas

**Arquivo:** `server/routers.ts`

Quando a validação anti-cheat rejeita um progresso suspeito (moedas acima do limite, IDs inválidos, etc.), o servidor lança um `TRPCError` mas não registra o evento em nenhum log persistente. O professor não tem como saber que um aluno tentou fazer batota.

**Impacto:** Impossibilidade de detectar padrões de abuso ou identificar alunos que tentam explorar o sistema repetidamente.

**Correção necessária:** Registrar tentativas bloqueadas em uma tabela `security_events` com `userId`, `timestamp`, `type` e `details`.

---

## Tabela de Priorização

| # | Vulnerabilidade | Severidade | Esforço | Prioridade |
|---|---|---|---|---|
| V3 | Compras da loja 100% client-side | 🔴 Crítica | Alto | 1 |
| V7 | purchasedItems/consumableStock sem validação | 🟠 Alta | Baixo | 2 |
| V2 | Hints automáticos ao avançar desafio | 🔴 Crítica | Baixo | 3 |
| V4 | Sem headers de segurança + body 50MB | 🟠 Alta | Baixo | 4 |
| V8 | commands[] clicáveis no painel lateral | 🟡 Média | Baixo | 5 |
| V5 | openId retornado em getTopPlayers | 🟠 Alta | Baixo | 6 |
| V6 | Sem rate limiting no progress.save | 🟠 Alta | Médio | 7 |
| V1 | Lógica de validação no bundle JS | 🔴 Crítica | Alto | 8 |
| V9 | Sem log de auditoria de segurança | 🟡 Média | Médio | 9 |

---

## Nota sobre V1 (Validação no cliente)

A V1 é a vulnerabilidade estrutural mais profunda e exige refatoração significativa: mover toda a lógica `validate()` para o servidor, o que implica reescrever o Terminal para enviar comandos via tRPC em vez de validar localmente. Este é um trabalho de médio prazo. As demais vulnerabilidades (V2–V9) podem ser corrigidas imediatamente sem alterar a arquitetura.
