export type TaskType = "one_time" | "recurring";

export type TaskStatus = "active" | "archived";

export type TimeMode = "recipient_local" | "fixed_instant";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type NotificationStatus = "scheduled" | "sent" | "canceled";

export type Task = {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

export type ReminderRule = {
  id: string;
  taskId: string;
  kind: TaskType;
  timeMode: TimeMode;
  timezone: string;
  localDate?: string;
  localTime: string;
  recurrenceFrequency?: RecurrenceFrequency;
  dueDay?: number;
  reminderStartDay?: number;
  reminderEndDay?: number;
  defaultSnoozeMinutes: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskOccurrence = {
  id: string;
  taskId: string;
  reminderRuleId: string;
  dueLocalDate: string;
  windowStartLocalDate: string;
  windowEndLocalDate: string;
  timezone: string;
  completedAtUtc?: string;
  skippedAtUtc?: string;
  createdAt: string;
  updatedAt: string;
};

export type ScheduledNotification = {
  id: string;
  taskId: string;
  occurrenceId?: string;
  scheduledLocalDate: string;
  scheduledLocalTime: string;
  scheduledTimezone: string;
  scheduledForUtc: string;
  status: NotificationStatus;
  providerNotificationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskWithRule = {
  task: Task;
  reminderRule: ReminderRule;
};
