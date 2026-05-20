import { sqliteClient } from "@/db/client";

const initialSchemaSql = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('one_time', 'recurring')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminder_rules (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('one_time', 'recurring')),
  time_mode TEXT NOT NULL CHECK (time_mode IN ('recipient_local', 'fixed_instant')),
  timezone TEXT NOT NULL,
  local_date TEXT,
  local_time TEXT NOT NULL,
  recurrence_frequency TEXT CHECK (recurrence_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  due_day INTEGER,
  reminder_start_day INTEGER,
  reminder_end_day INTEGER,
  default_snooze_minutes INTEGER NOT NULL DEFAULT 15,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_occurrences (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  reminder_rule_id TEXT NOT NULL,
  due_local_date TEXT NOT NULL,
  window_start_local_date TEXT NOT NULL,
  window_end_local_date TEXT NOT NULL,
  timezone TEXT NOT NULL,
  completed_at_utc TEXT,
  skipped_at_utc TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (reminder_rule_id) REFERENCES reminder_rules(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  occurrence_id TEXT,
  scheduled_local_date TEXT NOT NULL,
  scheduled_local_time TEXT NOT NULL,
  scheduled_timezone TEXT NOT NULL,
  scheduled_for_utc TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'canceled')),
  provider_notification_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (occurrence_id) REFERENCES task_occurrences(id) ON DELETE CASCADE
);
`;

let bootstrapPromise: Promise<void> | null = null;

export function bootstrapDatabase() {
  bootstrapPromise ??= sqliteClient.execAsync(initialSchemaSql).catch((error: unknown) => {
    bootstrapPromise = null;
    throw error;
  });

  return bootstrapPromise;
}
