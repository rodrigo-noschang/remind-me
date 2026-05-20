import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { tasks } from "@/db/schema/tasks";

export const reminderRules = sqliteTable("reminder_rules", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["one_time", "recurring"] }).notNull(),
  timeMode: text("time_mode", { enum: ["recipient_local", "fixed_instant"] }).notNull(),
  timezone: text("timezone").notNull(),
  localDate: text("local_date"),
  localTime: text("local_time").notNull(),
  recurrenceFrequency: text("recurrence_frequency", {
    enum: ["daily", "weekly", "monthly", "yearly"]
  }),
  dueDay: integer("due_day"),
  reminderStartDay: integer("reminder_start_day"),
  reminderEndDay: integer("reminder_end_day"),
  defaultSnoozeMinutes: integer("default_snooze_minutes").notNull().default(15),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});
