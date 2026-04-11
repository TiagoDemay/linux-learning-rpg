-- ============================================================
-- Migration 0005 — Security Fixes
-- Aplica as correções de segurança V2 e V5
-- Execute este arquivo no banco ANTES de fazer deploy do código
-- ============================================================

-- V2: Adicionar colunas de inventário à tabela user_progress
-- Garante que purchasedItems e consumableStock sejam persistidos no servidor
ALTER TABLE `user_progress`
  ADD COLUMN IF NOT EXISTS `purchasedItems` json NOT NULL DEFAULT (JSON_ARRAY()),
  ADD COLUMN IF NOT EXISTS `consumableStock` json NOT NULL DEFAULT (JSON_OBJECT());

-- V5: Criar tabela de eventos de segurança
-- Registra tentativas de manipulação bloqueadas pela validateProgress
CREATE TABLE IF NOT EXISTS `security_events` (
  `id`        int NOT NULL AUTO_INCREMENT,
  `userId`    int NOT NULL,
  `type`      varchar(64) NOT NULL,
  `details`   json,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_security_events_userId` (`userId`),
  KEY `idx_security_events_type` (`type`),
  KEY `idx_security_events_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
