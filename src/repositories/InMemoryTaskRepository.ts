import type { ScheduledNotification, TaskOccurrence, TaskWithRule } from "@/app/types";
import type { CreateTaskRecordInput, TaskRepository } from "@/repositories/TaskRepository";

export class InMemoryTaskRepository implements TaskRepository {
  private records: TaskWithRule[] = [];
  private occurrences: TaskOccurrence[] = [];
  private scheduledNotifications: ScheduledNotification[] = [];

  async create(input: CreateTaskRecordInput): Promise<TaskWithRule> {
    const record = {
      task: input.task,
      reminderRule: input.reminderRule
    };

    this.records = [record, ...this.records];

    if (input.scheduledNotification) {
      this.scheduledNotifications = [input.scheduledNotification, ...this.scheduledNotifications];
    }

    return record;
  }

  async listActive(): Promise<TaskWithRule[]> {
    return this.records.filter(({ task }) => task.status === "active");
  }

  async listOccurrencesByDueDate(dueLocalDate: string): Promise<TaskOccurrence[]> {
    return this.occurrences.filter((occurrence) => occurrence.dueLocalDate === dueLocalDate);
  }

  async completeOccurrence(occurrence: TaskOccurrence): Promise<TaskOccurrence> {
    const index = this.occurrences.findIndex((item) => item.id === occurrence.id);

    if (index >= 0) {
      this.occurrences[index] = occurrence;
    } else {
      this.occurrences = [occurrence, ...this.occurrences];
    }

    return occurrence;
  }

  async reopenOccurrence(occurrence: TaskOccurrence): Promise<TaskOccurrence> {
    const reopened = {
      ...occurrence,
      completedAtUtc: undefined
    };

    this.occurrences = this.occurrences.map((item) => (item.id === occurrence.id ? reopened : item));
    return reopened;
  }

  async listScheduledNotificationsByTask(taskId: string): Promise<ScheduledNotification[]> {
    return this.scheduledNotifications.filter((notification) => notification.taskId === taskId);
  }

  async updateScheduledNotification(notification: ScheduledNotification): Promise<ScheduledNotification> {
    this.scheduledNotifications = this.scheduledNotifications.map((item) =>
      item.id === notification.id ? notification : item
    );
    return notification;
  }
}
