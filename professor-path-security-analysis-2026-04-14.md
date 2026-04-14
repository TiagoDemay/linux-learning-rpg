# Análise de segurança focada no path do professor (nova aba incluída)

Data: 2026-04-14 (UTC)
Escopo: fluxo `/professor` (abas Alunos, Torneio Ativo e Histórico), APIs `professor.*` no backend e implicações de segurança operacional.

## Resumo executivo

Com a nova aba no painel do professor, o sistema mantém autorização de admin no backend, mas surgem riscos de **exposição de dados em massa**, **ações destrutivas sem trilha forte de auditoria** e **escalabilidade/DoS por ausência de paginação**.

Severidade desta análise:
- **0 críticos**
- **2 altos**
- **4 médios**
- **2 baixos**

---

## 1) [ALTO] APIs administrativas retornam datasets amplos sem paginação

**Onde:** `professor.getStudents`, `professor.getParticipants`, `professor.getTournamentHistory` (backend) + renderização integral no `ProfessorPanel` (frontend).

### Evidência
- O painel consome listas completas e renderiza coleções inteiras em memória.
- Não há paginação/cursores para consultas administrativas principais.

### Impacto
Com crescimento de usuários/torneios, aumenta risco de degradação de performance (API + browser), travamentos e superfície de DoS por consultas pesadas.

### Recomendação
- Implementar paginação server-side (`limit`, `cursor`) para todas as listagens administrativas.
- Carregamento incremental na UI.

---

## 2) [ALTO] Ações destrutivas sensíveis sem step-up auth

**Onde:** `deleteUser`, `deleteTournamentHistory`, `setAllParticipants`, `setUserBlocked`.

### Evidência
- A confirmação atual ocorre por `confirm()` no cliente, sem reautenticação/step-up no servidor.
- Qualquer sessão admin ativa pode executar ações irreversíveis.

### Impacto
Se sessão de admin for comprometida, impacto operacional é imediato e amplo (exclusão de usuário, alteração de torneio, bloqueios em massa).

### Recomendação
- Exigir step-up para ações críticas (reconfirmar senha/OTP/challenge token curto).
- Adicionar janela de “cooldown” para operações em massa.

---

## 3) [MÉDIO] Ausência de trilha de auditoria para ações administrativas críticas

**Onde:** rotas administrativas em `server/routers.ts`.

### Evidência
- Existem `securityEvents` para manipulação de progresso, mas ações de gestão (bloquear/deletar/alterar participantes) não registram auditoria detalhada.

### Impacto
Dificulta investigação pós-incidente, atribuição de responsabilidade e resposta rápida.

### Recomendação
- Criar audit log de admin actions com `adminUserId`, ação, alvo, timestamp, before/after e IP.

---

## 4) [MÉDIO] Exposição de PII (e-mails) em múltiplas visões administrativas

**Onde:** tabelas de alunos, participantes e histórico exibem email.

### Evidência
- O frontend mostra emails em diversos blocos sem mascaramento.

### Impacto
Maior blast radius de privacidade em caso de comprometimento de conta admin ou captura de tela/compartilhamento indevido.

### Recomendação
- Mascarar parcialmente email por padrão e exibir completo sob ação explícita.
- Aplicar princípio de minimização de dados por contexto.

---

## 5) [MÉDIO] Exportação CSV sem trilha de auditoria

**Onde:** `exportTournamentCsv` no frontend.

### Evidência
- Exporta ranking + emails localmente, sem evento backend de auditoria.

### Impacto
Exfiltração de dados fica invisível para monitoramento.

### Recomendação
- Mover export para endpoint backend autenticado com registro de auditoria.

---

## 6) [MÉDIO] Controles anti-abuso de rotas professor não são granulares

**Onde:** `server/_core/index.ts` (rate-limit geral + alguns específicos, mas sem perfil fino para todas rotas professor).

### Evidência
- Há limiter geral em `/api/trpc`, porém sem limites específicos para operações administrativas pesadas.

### Impacto
Admin comprometido ou automação interna pode causar carga excessiva em operações sensíveis.

### Recomendação
- Limites dedicados por procedimento admin (especialmente listagens amplas e ações destrutivas).

---

## 7) [BAIXO] Chaves de renderização baseadas em nome podem causar inconsistência visual

**Onde:** tabela de alunos no frontend (`key={student.name ?? i}`).

### Evidência
- Nomes duplicados podem causar reuse indevido de linha no React.

### Impacto
Risco de confusão operacional (ação em linha errada percebida visualmente), embora não seja bypass de autorização.

### Recomendação
- Usar `student.userId` como key estável.

---

## 8) [BAIXO] Mensagens de erro ainda pouco classificadas para operações admin

**Onde:** UX do painel professor exibe `error.message` direto em alguns pontos.

### Evidência
- Erros são mostrados de forma genérica sem códigos operacionais padronizados por ação.

### Impacto
Menor capacidade de diagnóstico e playbook de suporte.

### Recomendação
- Padronizar códigos de erro administrativos e exibição com mensagens orientadas por tipo.

---

## Conclusão

A nova aba amplia valor operacional do painel, mas também amplia superfície administrativa. O próximo ciclo deve priorizar:
1. paginação real + limites finos por rota admin;
2. step-up auth para ações destrutivas;
3. auditoria robusta (incluindo exportações);
4. redução de exposição de PII por padrão.
