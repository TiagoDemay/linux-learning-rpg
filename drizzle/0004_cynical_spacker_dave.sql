CREATE TABLE `active_tournament` (
	`id` int NOT NULL DEFAULT 1,
	`name` varchar(128) NOT NULL DEFAULT 'Torneio Atual',
	`tournamentId` int,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `active_tournament_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournament_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`userId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tournament_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`status` enum('active','finished') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tournaments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tournament_history` MODIFY COLUMN `completedLevels` json;--> statement-breakpoint
ALTER TABLE `tournament_history` MODIFY COLUMN `challengeProgress` json;--> statement-breakpoint
ALTER TABLE `users` ADD `blocked` int DEFAULT 0 NOT NULL;