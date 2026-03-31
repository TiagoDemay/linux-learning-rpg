CREATE TABLE `user_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`coins` int NOT NULL DEFAULT 0,
	`unlockedLevels` json NOT NULL DEFAULT ('["floresta-stallman"]'),
	`completedLevels` json NOT NULL DEFAULT ('[]'),
	`currentLevel` varchar(64) NOT NULL DEFAULT 'floresta-stallman',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_progress_id` PRIMARY KEY(`id`)
);
