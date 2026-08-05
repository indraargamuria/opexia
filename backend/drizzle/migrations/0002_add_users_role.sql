ALTER TABLE `users` ADD `role` text DEFAULT 'worker' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role`);