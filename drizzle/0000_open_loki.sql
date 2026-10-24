CREATE TABLE `oauth_states` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`verifier` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`value` text NOT NULL,
	`updated` integer NOT NULL
);
