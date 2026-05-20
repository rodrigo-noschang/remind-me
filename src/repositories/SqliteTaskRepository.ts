import { desc, eq } from "drizzle-orm";

import type { TaskWithRule } from "@/app/types";
import { db } from "@/db/client";
import { reminderRules } from "@/db/schema/reminderRules";
import { tasks } from "@/db/schema/tasks";
import type { CreateTaskRecordInput, TaskRepository } from "@/repositories/TaskRepository";

export class SqliteTaskRepository implements TaskRepository {
  async create(input: CreateTaskRecordInput): Promise<TaskWithRule> {
    db.transaction((tx) => {
      tx.insert(tasks).values(input.task).run();
      tx.insert(reminderRules).values(input.reminderRule).run();
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
}
