CREATE TABLE `tournament_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` varchar(64) NOT NULL,
	`tournamentName` varchar(128) NOT NULL,
	`resetAt` timestamp NOT NULL DEFAULT (now()),
	`userId` int NOT NULL,
	`userName` text,
	`userEmail` varchar(320),
	`coins` int NOT NULL DEFAULT 0,
	`completedLevels` json NOT NULL DEFAULT ('[]'),
	`currentLevel` varchar(64) NOT NULL DEFAULT 'floresta-stallman',
	`challengeProgress` json NOT NULL DEFAULT ('{}'),
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `tournament_history_id` PRIMARY KEY(`id`)
);
