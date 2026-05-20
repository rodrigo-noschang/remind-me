import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import { taskOccurrences } from "@/db/schema/taskOccurrences";
import { tasks } from "@/db/schema/tasks";

export const scheduledNotifications = sqliteTable("scheduled_notifications", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  occurrenceId: text("occurrence_id").references(() => taskOccurrences.id, { onDelete: "cascade" }),
  scheduledLocalDate: text("scheduled_local_date").notNull(),
  scheduledLocalTime: text("scheduled_local_time").notNull(),
  scheduledTimezone: text("scheduled_timezone").notNull(),
  scheduledForUtc: text("scheduled_for_utc").notNull(),
  status: text("status", { enum: ["scheduled", "sent", "canceled"] }).notNull().default("scheduled"),
  providerNotificationId: text("provider_notification_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});
