CREATE TABLE `approval_policy` (
	`id` text PRIMARY KEY NOT NULL,
	`approval_level` text DEFAULT 'all' NOT NULL,
	`manual_entry_window_days` integer DEFAULT 7 NOT NULL,
	`max_timer_hours` integer DEFAULT 12 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `erp_config` (
	`id` text PRIMARY KEY NOT NULL,
	`export_format` text DEFAULT 'sap' NOT NULL,
	`cost_center_mapping_enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'Opexia Consulting' NOT NULL,
	`slug` text DEFAULT 'opexia-consulting' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workspace_settings_slug` ON `workspace_settings` (`slug`);
--> statement-breakpoint
INSERT OR IGNORE INTO `workspace_settings` (`id`, `name`, `slug`, `currency`, `timezone`) VALUES ('singleton', 'Opexia Consulting', 'opexia-consulting', 'USD', 'UTC');
--> statement-breakpoint
INSERT OR IGNORE INTO `approval_policy` (`id`, `approval_level`, `manual_entry_window_days`, `max_timer_hours`) VALUES ('singleton', 'all', 7, 12);
--> statement-breakpoint
INSERT OR IGNORE INTO `erp_config` (`id`, `export_format`, `cost_center_mapping_enabled`) VALUES ('singleton', 'sap', 1);