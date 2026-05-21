import type { ReminderRule, ScheduledNotification, Task, TaskOccurrence, TaskWithRule } from "@/app/types";

export type CreateTaskRecordInput = {
  task: Task;
  reminderRule: ReminderRule;
  scheduledNotification?: ScheduledNotification;
};

export interface TaskRepository {
  create(input: CreateTaskRecordInput): Promise<TaskWithRule>;
  listActive(): Promise<TaskWithRule[]>;
  listOccurrencesByDueDate(dueLocalDate: string): Promise<TaskOccurrence[]>;
  listScheduledNotificationsByTask(taskId: string): Promise<ScheduledNotification[]>;
  completeOccurrence(occurrence: TaskOccurrence): Promise<TaskOccurrence>;
  reopenOccurrence(occurrence: TaskOccurrence): Promise<TaskOccurrence>;
  updateScheduledNotification(notification: ScheduledNotification): Promise<ScheduledNotification>;
}
