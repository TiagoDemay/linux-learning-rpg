# Linux Learning RPG - TODO

## Estrutura Base
- [x] Inicializar projeto web-db-user
- [x] Schema do banco de dados (progresso do usuário)
- [x] Migração SQL aplicada

## Dados e Lógica
- [x] levels.ts - 10 locais com coordenadas, ícones, conexões e custos
- [x] tasks.ts - objetivos e validações para cada nível
- [x] terminal-logic.ts - motor de comandos Linux e VFS

## Mapa RPG
- [x] Fundo de pergaminho com textura
- [x] Borda decorativa medieval
- [x] Banner "MAPA MUNDI: TERRAS DO KERNEL"
- [x] Rosa dos ventos animada
- [x] 10 locais posicionados conforme imagem
- [x] Caminhos/conexões entre locais
- [x] Elementos decorativos: navios, ondas, serpentes, polvos, Tux
- [x] Animações de hover nos locais
- [x] Indicador de local bloqueado/desbloqueado/atual

## Simulador de Terminal
- [x] Interface de terminal estilo Ubuntu
- [x] VFS em memória com persistência de sessão
- [x] Comandos: ls, cd, mkdir, touch, rm, cat, pwd, echo, cp, mv, chmod, man, help, clear
- [x] Prompt dinâmico com usuário e diretório atual
- [x] Histórico de comandos (seta para cima/baixo)
- [x] Painel de tarefa atual com descrição e dicas

## Gamificação
- [x] Sistema de moedas (início com 0)
- [x] Barra de progresso no topo
- [x] Saldo de moedas sempre visível
- [x] Animação de sparkles ao completar tarefa
- [x] Animação ao desbloquear novo nível
- [x] Feedback visual de sucesso/erro

## Interface
- [x] Fonte MedievalSharp para títulos
- [x] Paleta: bege, marrom escuro, verde floresta, azul oceano
- [x] Navegação entre mapa e terminal
- [x] Modal de detalhes do local
- [x] Responsividade básica

## Testes
- [x] Testes do motor de terminal (31 testes passando)
- [x] Testes de validação de tarefas

## Atualização de Fundo
- [x] Upload da imagem do mapa para CDN
- [x] Substituir fundo CSS por imagem real no RPGMap.tsx

## Desafios da Floresta de Stallman (10 missões)
- [x] Redesenhar Task para suportar múltiplos desafios por nível (array de sub-tarefas)
- [x] Criar 10 desafios progressivos cobrindo os 20 comandos Linux
- [x] Atualizar Terminal.tsx para progressão entre sub-tarefas
- [x] Atualizar Home.tsx para rastrear sub-tarefa atual por nível
- [x] Testes dos novos desafios (54 testes passando)

## Reset / Reinício
- [x] Botão "Reiniciar Desafio" no terminal (reseta VFS + progresso do nível atual)
- [x] Botão "Reiniciar Jogo" no HUD (limpa todo o localStorage e volta ao início)

## Desafios da Tundra do Slackware
- [x] 10 desafios de rede e pacotes (ping, ip, ss, netstat, curl, wget, apt, dpkg, uname, hostname)
- [x] Suporte simulado para novos comandos de rede no terminal
- [x] Testes dos novos desafios (87 testes passando)

## Sistema de Ranking e Autenticação
- [x] Schema: tabela user_progress com userId, coins, unlockedLevels, completedLevels, challengeProgress
- [x] Migração SQL aplicada
- [x] tRPC: saveProgress (salvar moedas + progresso completo)
- [x] tRPC: getRanking (top 20 jogadores por moedas)
- [x] tRPC: getMyProgress (carregar progresso do usuário logado)
- [x] Tela de login/cadastro com OAuth Manus (botão Entrar no HUD)
- [x] Sincronização localStorage → banco ao fazer login (merge por maior saldo)
- [x] Tela de ranking com nome, moedas, territórios e posição
- [x] Botão de ranking (🏆) no HUD
- [x] Testes das procedures de ranking (93 testes passando)

## Controle de Acesso
- [x] Botão de reset visível apenas para usuário com role "admin"

## Desafios dos 8 Territórios Restantes
- [x] Montanhas de Kernighan — compilação/scripting (gcc, make, bash, sh, which, env, export, alias)
- [x] Pântano de Systemd — serviços/daemons (systemctl, journalctl, service, cron, at)
- [x] Reino de Torvalds — git (git init, add, commit, status, log, diff, branch, merge, clone)
- [x] Cidade Livre de GNU — variáveis de ambiente (env, export, unset, source, .bashrc, PATH)
- [x] Planícies de RedHat — rpm/yum/dnf (rpm, yum, dnf install/remove/search/update)
- [x] Deserto de Debian — dpkg avançado (dpkg-query, dpkg-reconfigure, apt-cache, apt-get)
- [x] Ilhas de Canonical — snap/cloud (snap install/remove/list, ufw, ssh-keygen, scp)
- [x] Vale do Arch Linux — pacman/AUR (pacman -S/-R/-Ss/-Q, makepkg, yay)
- [x] Suporte simulado para todos os novos comandos no terminal (60+ comandos)
- [x] Testes: 93 testes passando

## Correções de Layout
- [x] Centralizar mapa verticalmente na tela (remover espaço vazio abaixo)

## Ajustes de Posição dos Marcadores
- [x] Floresta de Stallman: mover para baixo, ao lado da pedra com o GNU (x:14, y:28)
- [x] Reposicionar os 9 marcadores restantes próximos aos símbolos visuais (mais para baixo)

## Painel do Professor (/professor)
- [x] tRPC procedure: getStudents (lista todos os alunos com progresso)
- [x] Página ProfessorPanel.tsx com tabela de alunos
- [x] Colunas: posição, nome, moedas, territórios conquistados, desafios completos, último acesso
- [x] Filtro por nome e ordenação por coluna
- [x] Auto-refresh a cada 30 segundos
- [x] Rota /professor protegida por role admin no App.tsx
- [x] Botão de acesso ao painel no HUD (apenas admin) 📚
- [x] Testes da procedure getStudents (96 testes passando)

## Ajustes de UX
- [x] Tooltip dos marcadores: posicionamento dinâmico (abaixo quando y < 40%, acima caso contrário)
- [x] Remover botão "Reiniciar Desafio" e bloco de dica explícita do painel lateral do terminal

## Loja do Tux
- [x] Criar arquivo shop-items.ts com definição dos itens da loja
- [x] Adicionar shopItems ao GameState e persistência localStorage
- [x] Criar componente ShopModal.tsx com UI medieval
- [x] Integrar autocomplete expandido no terminal (item comprado)
- [x] Integrar "revelar dica" no terminal (item comprado)
- [x] Integrar "man page detalhada" no terminal (item comprado)
- [x] Integrar "histórico de comandos expandido" no terminal (item comprado)
- [x] Adicionar marcador da loja no RPGMap (abaixo do pinguim, ~x:44, y:60)
- [x] Conectar marcador ao ShopModal no Home.tsx
- [x] Testes dos itens da loja

## Reset + Histórico de Torneios
- [x] Criar tabela tournament_history no schema Drizzle
- [x] Aplicar migração SQL no banco
- [x] Procedure resetGame: salva snapshot, zera progress de todos os jogadores
- [x] Procedure getTournamentHistory: retorna lista de torneios anteriores
- [x] HUD: botão reiniciar chama resetGame no servidor
- [x] ProfessorPanel: aba/seção de histórico de torneios
- [x] Testes das novas procedures

## Correções pós-reset
- [x] Ranking: filtrar jogadores com 0 moedas e 0 territórios (sem progresso real)
- [x] ProfessorPanel: corrigir visibilidade da seção "Histórico de Torneios"
- [x] HUD: indicador de torneio ativo (nome do torneio atual)
- [x] Criar tabela active_tournament para guardar o nome do torneio em curso

## Sistema de Torneios (v2)
- [ ] Schema: tabela tournaments (id, name, status, createdAt) e tournament_participants (tournamentId, userId)
- [ ] Migrar banco com novas tabelas
- [ ] Procedure: createTournament (cria torneio e define como ativo)
- [ ] Procedure: renameTournament (renomeia torneio ativo)
- [ ] Procedure: setTournamentParticipants (ativa/desativa jogadores no torneio)
- [ ] Procedure: getTournamentParticipants (lista jogadores com status de participação)
- [ ] Procedure: resetGame atualizado para usar participantes do torneio
- [ ] UI: aba "Torneio Ativo" no ProfessorPanel com criação, renomeação e seleção de participantes
- [ ] Ranking e painel de alunos filtrados por participantes do torneio ativo

## Novas funcionalidades (Abril 2026)
- [ ] Banner de notificação para alunos ao criar/renomear torneio
- [ ] Seleção em massa de participantes (Ativar todos / Desativar todos)
- [ ] Deletar torneio do histórico
- [ ] Deletar usuário (com confirmação)
- [ ] Bloquear/desbloquear usuário

## Segurança de acesso
- [x] Verificar campo blocked no contexto tRPC (context.ts) para bloquear usuários
- [x] Verificar campo blocked no callback OAuth para impedir login
- [x] Retornar erro claro ao usuário bloqueado

## Exportação CSV
- [x] Botão "Exportar CSV" no ranking de cada torneio do histórico

## Visual do Mapa
- [x] Substituir linhas retas amarelas por caminhos medievais estilizados (SVG curvo, estrada de terra)
- [x] Adicionar pedras miliárias SVG ao longo dos caminhos medievais no mapa
- [x] Corrigir layout do tooltip dos marcadores: textos cortados, largura e fonte inadequadas
- [x] Corrigir definitivamente overflow/corte de texto no tooltip: usar portal/posicionamento fixo para evitar clipping pelo overflow:hidden do container pai
- [x] Ajustar unlockCost do Reino de Torvalds para 385 moedas (maior custo de todos os territórios)
- [x] Adicionar anel dourado pulsante ao marcador do Reino de Torvalds (destaque como desafio final)


## Ajustes de Custos e Descrições (Abril 2026)
- [x] Ajustar custos de desbloqueio: 0, 100, 120, 125, 135, 140, 145, 150, 300, 777
- [x] Melhorar descrições dos desafios do 3º ao 10º território (sem dicas nem comandos explícitos)

## Bônus de Conclusão de Território
- [x] Adicionar bônus de 80 moedas ao completar todos os desafios de um território

## Login Obrigatório
- [x] Tornar login obrigatório antes de iniciar o jogo (tela bloqueante para não autenticados)

## Visual Gamificado
- [x] Névoa cinza animada nos marcadores de territórios bloqueados no mapa
- [x] Névoa cinza cobrindo toda a área geográfica dos territórios bloqueados no mapa (não apenas o marcador)
- [x] Aumentar área de névoa dos territórios bloqueados (rx/ry maiores)
- [x] Moeda no HUD clicável para abrir Loja do Tux + label "Loja do Tux" ao lado
- [x] Scroll vertical na tabela de alunos do Painel do Professor

## Segurança — Auditoria de Moedas
- [x] Auditar e corrigir todas as falhas que permitem acúmulo fraudulento de moedas

## Auditoria de Segurança Completa
- [x] Auditoria completa: respostas hardcoded, rotas abertas, APIs expostas
- [x] V2: Remover hint automático ao avançar desafio no Terminal.tsx
- [x] V4: Adicionar helmet + reduzir body parser para 1mb
- [x] V5: Remover openId do select em getTopPlayers no db.ts
- [x] V7: Validar purchasedItems e consumableStock no progress.save server-side
- [x] V8: Remover botões clicáveis de commands[] do painel lateral do terminal

## Auditoria de Segurança — Fase 2
- [x] V1: Mover validação dos desafios para o servidor (challenge.submit)
- [x] V3: Mover compras da loja para o servidor (shop.buy)
- [x] V6: Rate limiting nas rotas tRPC (express-rate-limit)
- [x] V9: Log de auditoria de tentativas suspeitas no servidor (console.warn [SECURITY])

## Correção Definitiva de Segurança (ZIP + GitHub)
- [x] Aplicar migration SQL: purchasedItems, consumableStock, security_events
- [x] Sincronizar schema.ts com o ZIP (purchasedItems, consumableStock, security_events)
- [x] Atualizar db.ts com logSecurityEvent e getSecurityEvents
- [x] Atualizar routers.ts com versão completa do ZIP
- [x] Integrar Terminal.tsx com challenge.submit server-side
- [x] Integrar Home.tsx com shop.buy server-side
- [x] ShopModal.tsx: tipo onBuy aceita Promise (async)
- [x] server/_core/index.ts: validação de JWT_SECRET e DATABASE_URL no startup
- [x] server/_core/index.ts: rate limiting challenge.submit (20/min), shop.buy (10/min)
- [x] server/_core/cookies.ts: cookies httpOnly, sameSite, secure atualizados
- [x] 126 testes passando após todas as correções

## Aba de Auditoria no ProfessorPanel
- [x] procedure professor.getSecurityEvents (com filtros userId, type, limit)
- [x] Aba "Auditoria" no ProfessorPanel com tabela de eventos
- [x] Filtro por tipo de evento e por nome de usuário
- [x] Auto-refresh a cada 30 segundos
- [x] Badge com contagem de eventos recentes no tab

## Melhorias de Segurança e Performance (Professor)
- [x] Paginação em getStudents (db.ts + routers.ts + ProfessorPanel)
- [x] Paginação em getSecurityEvents (db.ts + routers.ts + ProfessorPanel)
- [x] Rate limiting em deleteUser (10/min por admin)
- [x] Rate limiting em setUserBlocked (20/min por admin)
- [x] Rate limiting em resetAllProgress (5/min por admin)
- [x] Trilha de auditoria: logSecurityEvent em deleteUser
- [x] Trilha de auditoria: logSecurityEvent em setUserBlocked
- [x] Trilha de auditoria: logSecurityEvent em resetAllProgress

## Bug Crítico: Terminal mostra erro em todo comando
- [x] Causa: CHALLENGE_MAX_ATTEMPTS_PER_WINDOW=12 era muito baixo (terminal chama submit a cada comando)
- [x] Aumentar CHALLENGE_MAX_ATTEMPTS_PER_WINDOW para 100 (100 tentativas por 10 minutos por desafio)
- [x] Aumentar rate limit HTTP de challenge.submit para 120/min
- [x] Corrigir catch do Terminal.tsx: ignorar TOO_MANY_REQUESTS silenciosamente (não exibir erro ao aluno)

## Terminal Linux Real (WebAssembly v86)
- [x] Avaliar abordagem técnica: v86 selecionado (Alpine Linux 3.19 x86 em WASM)
- [x] Construir imagem Alpine 3.19 x86 com git, bash, curl, grep, awk, sed, find, tar, gzip, openssh, util-linux, procps, nano, less, net-tools, openrc, sudo, shadow
- [x] Configurar usuário aventureiro com auto-login e prompt do jogo
- [x] Criar imagem ext2 de 512MB (comprimida para 20MB com gzip)
- [x] Upload CDN: vmlinuz (7MB), alpine-disk.img.gz (20MB), v86.wasm (2MB), libv86.js (329KB)
- [x] Instalar dependências: @xterm/xterm, @xterm/addon-fit, v86 (já presentes no projeto)
- [x] Criar componente V86Terminal.tsx com v86 + xterm.js + barra de progresso
- [x] Integrar V86Terminal no Terminal.tsx substituindo terminal VFS simulado
- [x] Capturar histórico de comandos reais e enviar ao challenge.submit
- [ ] Testar boot do Alpine Linux no browser e ajustar inittab/auto-login
- [ ] Testar os 10 desafios da Floresta de Stallman no terminal emulado
- [ ] Ajustar challenge-answers.ts para comandos reais se necessário

## Correção Terminal v86 (Boot Rápido)
- [x] Recriar imagem Alpine com init=/init-game.sh (sem openrc) para boot em 3-8s
- [x] Configurar .bashrc com prompt aventureiro@terras-do-kernel e mensagem de boas-vindas
- [x] Upload nova imagem para CDN: alpine-disk-v2.img_adaa3c25.gz (20MB)
- [x] Atualizar V86Terminal.tsx com init=/init-game.sh, barra de progresso melhorada e detecção de prompt
- [ ] Testar boot no browser e confirmar que o terminal abre em <15s

## Passos 1-2-3: Boot v86 + Desafios + Persistência de Sessão
- [x] Passo 1: Criar imagem Alpine v3 com stubs para apt, dpkg, systemctl, journalctl, rpm, yum, dnf, pacman, snap, lsb_release, ss, rsync, ufw, reflector, yay
- [x] Passo 1: Adicionar .gitconfig com defaultBranch=main e user.name=aventureiro
- [x] Passo 1: Corrigir init-game.sh para usar /bin/sh e montar /proc, /sys, /dev corretamente
- [x] Passo 1: Corrigir .bashrc com banner, PS1 colorido e aliases
- [x] Passo 1: Upload imagem v3-final para CDN
- [x] Passo 2: Corrigir challenge-answers.ts — desafio VIII do Reino de Torvalds aceita 'main' ou 'master'
- [x] Passo 3: Implementar persistência de sessão v86 com IndexedDB (salva a cada 30s, restaura na próxima abertura)
- [x] Passo 3: Adicionar botão "Nova sessão" para limpar estado salvo
- [x] Passo 3: Passar levelId para V86Terminal no Terminal.tsx (chave de sessão por nível)
- [x] Passo 3: Overlay de carregamento melhorado com etapas visuais e indicador de sessão restaurada
- [ ] Testar boot no browser e confirmar que o terminal abre em <15s (v3)
- [ ] Testar os 10 desafios da Floresta de Stallman no terminal emulado
