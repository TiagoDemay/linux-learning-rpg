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
