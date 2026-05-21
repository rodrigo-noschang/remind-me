import { desc, eq } from "drizzle-orm";

import type { ScheduledNotification, TaskOccurrence, TaskWithRule } from "@/app/types";
import { db } from "@/db/client";
import { reminderRules } from "@/db/schema/reminderRules";
import { scheduledNotifications } from "@/db/schema/scheduledNotifications";
import { taskOccurrences } from "@/db/schema/taskOccurrences";
import { tasks } from "@/db/schema/tasks";
import type { CreateTaskRecordInput, TaskRepository } from "@/repositories/TaskRepository";

export class SqliteTaskRepository implements TaskRepository {
  async create(input: CreateTaskRecordInput): Promise<TaskWithRule> {
    db.transaction((tx) => {
      tx.insert(tasks).values(input.task).run();
      tx.insert(reminderRules).values(input.reminderRule).run();

      if (input.scheduledNotification) {
        tx.insert(scheduledNotifications).values(input.scheduledNotification).run();
      }
    });

    return {
      task: input.task,
      reminderRule: input.reminderRule
    };
  }

  async listActive(): Promise<TaskWithRule[]> {
    const rows = await db
      .select({
        task: tasks,
        reminderRule: reminderRules
      })
      .from(tasks)
      .innerJoin(reminderRules, eq(reminderRules.taskId, tasks.id))
      .where(eq(tasks.status, "active"))
      .orderBy(desc(tasks.createdAt));

    return rows.map(({ task, reminderRule }) => ({
      task: {
        ...task,
        description: task.description ?? undefined
      },
      reminderRule: {
        ...reminderRule,
        localDate: reminderRule.localDate ?? undefined,
        recurrenceFrequency: reminderRule.recurrenceFrequency ?? undefined,
        dueDay: reminderRule.dueDay ?? undefined,
        reminderStartDay: reminderRule.reminderStartDay ?? undefined,
        reminderEndDay: reminderRule.reminderEndDay ?? undefined
      }
    }));
  }

  async listOccurrencesByDueDate(dueLocalDate: string): Promise<TaskOccurrence[]> {
    const rows = await db
      .select()
      .from(taskOccurrences)
      .where(eq(taskOccurrences.dueLocalDate, dueLocalDate));

    return rows.map(normalizeOccurrence);
  }

  async listScheduledNotificationsByTask(taskId: string): Promise<ScheduledNotification[]> {
    const rows = await db
      .select()
      .from(scheduledNotifications)
      .where(eq(scheduledNotifications.taskId, taskId));

    return rows.map(normalizeScheduledNotification);
  }

  async completeOccurrence(occurrence: TaskOccurrence): Promise<TaskOccurrence> {
    const existing = await this.findOccurrence(occurrence.id);

    if (existing) {
      await db
        .update(taskOccurrences)
        .set({
          completedAtUtc: occurrence.completedAtUtc,
          skippedAtUtc: null,
          updatedAt: occurrence.updatedAt
        })
        .where(eq(taskOccurrences.id, occurrence.id))
        .run();

      return occurrence;
    }

    await db.insert(taskOccurrences).values(occurrence).run();
    return occurrence;
  }

  async reopenOccurrence(occurrence: TaskOccurrence): Promise<TaskOccurrence> {
    await db
      .update(taskOccurrences)
      .set({
        completedAtUtc: null,
        updatedAt: occurrence.updatedAt
      })
      .where(eq(taskOccurrences.id, occurrence.id))
      .run();

    return {
      ...occurrence,
      completedAtUtc: undefined
    };
  }

  async updateScheduledNotification(notification: ScheduledNotification): Promise<ScheduledNotification> {
    await db
      .update(scheduledNotifications)
      .set({
        occurrenceId: notification.occurrenceId,
        scheduledLocalDate: notification.scheduledLocalDate,
        scheduledLocalTime: notification.scheduledLocalTime,
        scheduledTimezone: notification.scheduledTimezone,
        scheduledForUtc: notification.scheduledForUtc,
        status: notification.status,
        providerNotificationId: notification.providerNotificationId,
        updatedAt: notification.updatedAt
      })
      .where(eq(scheduledNotifications.id, notification.id))
      .run();

    return notification;
  }

  private async findOccurrence(id: string): Promise<TaskOccurrence | null> {
    const rows = await db
      .select()
      .from(taskOccurrences)
      .where(eq(taskOccurrences.id, id))
      .limit(1);

    return rows[0] ? normalizeOccurrence(rows[0]) : null;
  }
}

function normalizeOccurrence(occurrence: typeof taskOccurrences.$inferSelect): TaskOccurrence {
  return {
    ...occurrence,
    completedAtUtc: occurrence.completedAtUtc ?? undefined,
    skippedAtUtc: occurrence.skippedAtUtc ?? undefined
  };
}

function normalizeScheduledNotification(notification: typeof scheduledNotifications.$inferSelect): ScheduledNotification {
  return {
    ...notification,
    occurrenceId: notification.occurrenceId ?? undefined,
    providerNotificationId: notification.providerNotificationId ?? undefined
  };
}
