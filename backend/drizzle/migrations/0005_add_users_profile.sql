ALTER TABLE `users` ADD `hourly_rate` real;--> statement-breakpoint
ALTER TABLE `users` ADD `timezone` text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `date_format` text DEFAULT 'YYYY-MM-DD' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `weekly_start_day` text DEFAULT 'monday' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` text;