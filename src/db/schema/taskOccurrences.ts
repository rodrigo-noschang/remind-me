import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import { reminderRules } from "@/db/schema/reminderRules";
import { tasks } from "@/db/schema/tasks";

export const taskOccurrences = sqliteTable("task_occurrences", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  reminderRuleId: text("reminder_rule_id")
    .notNull()
    .references(() => reminderRules.id, { onDelete: "cascade" }),
  dueLocalDate: text("due_local_date").notNull(),
  windowStartLocalDate: text("window_start_local_date").notNull(),
  windowEndLocalDate: text("window_end_local_date").notNull(),
  timezone: text("timezone").notNull(),
  completedAtUtc: text("completed_at_utc"),
  skippedAtUtc: text("skipped_at_utc"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});
