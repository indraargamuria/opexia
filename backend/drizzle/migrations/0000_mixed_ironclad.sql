CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`actor_id` text NOT NULL,
	`payload` text,
	`checksum` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_entity` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_actor_id` ON `audit_logs` (`actor_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_action` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_created_at` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`billing_rate` real,
	`currency` text DEFAULT 'USD' NOT NULL,
	`address` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_name_unique` ON `clients` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `clients_code_unique` ON `clients` (`code`);--> statement-breakpoint
CREATE INDEX `idx_clients_code` ON `clients` (`code`);--> statement-breakpoint
CREATE INDEX `idx_clients_is_active` ON `clients` (`is_active`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'planning' NOT NULL,
	`budget_hours` real,
	`budget_cost` real,
	`start_date` text,
	`end_date` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_projects_client_id` ON `projects` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_projects_status` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `idx_projects_client_status` ON `projects` (`client_id`,`status`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#6366f1' NOT NULL,
	`erp_code` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE INDEX `idx_tags_name` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`role` text DEFAULT 'worker' NOT NULL,
	`billable_rate` real,
	`assigned_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_team_members_user_id` ON `team_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_team_members_project_id` ON `team_members` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_team_members_user_project` ON `team_members` (`user_id`,`project_id`);--> statement-breakpoint
CREATE INDEX `idx_team_members_role` ON `team_members` (`role`);--> statement-breakpoint
CREATE TABLE `time_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`description` text,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`duration_minutes` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`entry_method` text DEFAULT 'timer' NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`rejection_reason` text,
	`checksum` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_time_entries_user_id` ON `time_entries` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_time_entries_project_id` ON `time_entries` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_time_entries_status` ON `time_entries` (`status`);--> statement-breakpoint
CREATE INDEX `idx_time_entries_started_at` ON `time_entries` (`started_at`);--> statement-breakpoint
CREATE INDEX `idx_time_entries_user_started` ON `time_entries` (`user_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_time_entries_project_status` ON `time_entries` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_time_entries_approved_by` ON `time_entries` (`approved_by`);--> statement-breakpoint
CREATE TABLE `time_entry_tags` (
	`time_entry_id` text NOT NULL,
	`tag_id` text NOT NULL,
	FOREIGN KEY (`time_entry_id`) REFERENCES `time_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_time_entry_tags_entry_id` ON `time_entry_tags` (`time_entry_id`);--> statement-breakpoint
CREATE INDEX `idx_time_entry_tags_tag_id` ON `time_entry_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`avatar_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);