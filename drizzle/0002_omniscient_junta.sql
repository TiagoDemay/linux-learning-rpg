ALTER TABLE `user_progress` ADD `challengeProgress` json DEFAULT ('{}') NOT NULL;--> statement-breakpoint
ALTER TABLE `user_progress` ADD CONSTRAINT `user_progress_userId_unique` UNIQUE(`userId`);