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
