import { DateTime } from "luxon";
import uuid from "react-native-uuid";

import type {
  ReminderRule,
  ScheduledNotification,
  Task,
  TaskOccurrence,
  TaskType,
  TaskWithRule,
  TimeMode
} from "@/app/types";
import type { TaskRepository } from "@/repositories/TaskRepository";
import { getDeviceTimezone } from "@/domain/timezone/timezone";
import { buildMonthlyWindow } from "@/domain/recurrence/monthly";
import { buildScheduledTime } from "@/domain/scheduling/notificationTime";
import { NotificationScheduler } from "@/services/NotificationScheduler";

export type CreateTaskInput = {
  title: string;
  description?: string;
  type: TaskType;
  localDate: string;
  localTime: string;
  timeMode?: TimeMode;
  dueDay?: number;
  reminderStartDay?: number;
  reminderEndDay?: number;
};

export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly notificationScheduler = new NotificationScheduler()
  ) {}

  async create(input: CreateTaskInput) {
    const timestamp = DateTime.utc().toISO() ?? new Date().toISOString();
    const taskId = String(uuid.v4());

    const task: Task = {
      id: taskId,
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      type: input.type,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const timezone = getDeviceTimezone();

    const reminderRule: ReminderRule = {
      id: String(uuid.v4()),
      taskId,
      kind: input.type,
      timeMode: input.timeMode ?? "recipient_local",
      timezone,
      localDate: input.type === "one_time" ? input.localDate : undefined,
      localTime: input.localTime,
      recurrenceFrequency: input.type === "recurring" ? "monthly" : undefined,
      dueDay: input.dueDay,
      reminderStartDay: input.reminderStartDay,
      reminderEndDay: input.reminderEndDay,
      defaultSnoozeMinutes: 15,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    let scheduledNotification: ScheduledNotification | undefined;
    let providerNotificationId: string | undefined;

    if (input.type === "one_time") {
      const scheduledTime = buildScheduledTime({
        localDate: input.localDate,
        localTime: input.localTime,
        timezone
      });

      const scheduledFor = DateTime.fromISO(scheduledTime.scheduledForUtc);

      if (!scheduledFor.isValid || scheduledFor.toMillis() <= DateTime.utc().toMillis()) {
        throw new Error("Escolha um horario futuro para agendar a notificacao.");
      }

      const hasPermission = await this.notificationScheduler.requestPermissions();

      if (!hasPermission) {
        throw new Error("Ative as notificacoes do app nas configuracoes do celular para receber lembretes.");
      }

      providerNotificationId = await this.notificationScheduler.scheduleLocalNotification({
        title: task.title,
        body: task.description,
        scheduledForUtc: scheduledTime.scheduledForUtc
      });

      scheduledNotification = {
        id: String(uuid.v4()),
        taskId,
        ...scheduledTime,
        status: "scheduled",
        providerNotificationId,
        createdAt: timestamp,
        updatedAt: timestamp
      };
    }

    try {
      return await this.taskRepository.create({ task, reminderRule, scheduledNotification });
    } catch (caughtError) {
      if (providerNotificationId) {
        await this.notificationScheduler.cancel(providerNotificationId).catch(console.error);
      }

      throw caughtError;
    }
  }

  async listToday(referenceDate = DateTime.local()): Promise<TaskWithRule[]> {
    const activeTasks = await this.taskRepository.listActive();
    const todayTasks = activeTasks
      .map((item) => getTodayTask(item, referenceDate))
      .filter((item): item is TodayTaskDescriptor => Boolean(item));

    const dueDates = Array.from(new Set(todayTasks.map(({ dueLocalDate }) => dueLocalDate)));
    const occurrences = (
      await Promise.all(dueDates.map((dueLocalDate) => this.taskRepository.listOccurrencesByDueDate(dueLocalDate)))
    ).flat();

    return todayTasks.map(({ item, dueLocalDate }) => ({
      ...item,
      occurrence: occurrences.find(
        (occurrence) =>
          occurrence.taskId === item.task.id &&
          occurrence.reminderRuleId === item.reminderRule.id &&
          occurrence.dueLocalDate === dueLocalDate
      )
    }));
  }

  async completeTodayOccurrence(taskId: string, referenceDate = DateTime.local()): Promise<TaskOccurrence> {
    const descriptor = await this.findTodayTaskDescriptor(taskId, referenceDate);
    const timestamp = DateTime.utc().toISO() ?? new Date().toISOString();
    const occurrence = descriptor.occurrence ?? createOccurrence(descriptor, timestamp);

    const completedOccurrence = await this.taskRepository.completeOccurrence({
      ...occurrence,
      completedAtUtc: timestamp,
      skippedAtUtc: undefined,
      updatedAt: timestamp
    });

    await this.cancelScheduledNotificationsForOccurrence(completedOccurrence, timestamp);
    return completedOccurrence;
  }

  async reopenTodayOccurrence(taskId: string, referenceDate = DateTime.local()): Promise<TaskOccurrence> {
    const descriptor = await this.findTodayTaskDescriptor(taskId, referenceDate);
    const timestamp = DateTime.utc().toISO() ?? new Date().toISOString();
    const occurrence = descriptor.occurrence ?? createOccurrence(descriptor, timestamp);

    const reopenedOccurrence = await this.taskRepository.reopenOccurrence({
      ...occurrence,
      completedAtUtc: undefined,
      updatedAt: timestamp
    });

    await this.rescheduleNotificationsForOccurrence(descriptor.item, reopenedOccurrence, timestamp);
    return reopenedOccurrence;
  }

  private async findTodayTaskDescriptor(taskId: string, referenceDate: DateTime): Promise<TodayTaskDescriptor> {
    const todayTasks = await this.listToday(referenceDate);
    const item = todayTasks.find(({ task }) => task.id === taskId);

    if (!item) {
      throw new Error("Este lembrete nao faz parte da lista de hoje.");
    }

    const descriptor = getTodayTask(item, referenceDate);

    if (!descriptor) {
      throw new Error("Este lembrete nao faz parte da lista de hoje.");
    }

    return {
      ...descriptor,
      occurrence: item.occurrence
    };
  }

  private async cancelScheduledNotificationsForOccurrence(occurrence: TaskOccurrence, timestamp: string) {
    const notifications = await this.taskRepository.listScheduledNotificationsByTask(occurrence.taskId);
    const matchingNotifications = notifications.filter(
      (notification) => notification.status === "scheduled" && notificationMatchesOccurrence(notification, occurrence)
    );

    await Promise.all(
      matchingNotifications.map(async (notification) => {
        if (notification.providerNotificationId) {
          await this.notificationScheduler.cancel(notification.providerNotificationId).catch(console.error);
        }

        await this.taskRepository.updateScheduledNotification({
          ...notification,
          status: "canceled",
          updatedAt: timestamp
        });
      })
    );
  }

  private async rescheduleNotificationsForOccurrence(
    item: TaskWithRule,
    occurrence: TaskOccurrence,
    timestamp: string
  ) {
    const notifications = await this.taskRepository.listScheduledNotificationsByTask(occurrence.taskId);
    const now = DateTime.utc().toMillis();
    const matchingNotifications = notifications.filter(
      (notification) =>
        notification.status === "canceled" &&
        notificationMatchesOccurrence(notification, occurrence) &&
        DateTime.fromISO(notification.scheduledForUtc).toMillis() > now
    );

    await Promise.all(
      matchingNotifications.map(async (notification) => {
        const providerNotificationId = await this.notificationScheduler
          .scheduleLocalNotification({
            title: item.task.title,
            body: item.task.description,
            scheduledForUtc: notification.scheduledForUtc
          })
          .catch((caughtError) => {
            console.error(caughtError);
            return undefined;
          });

        if (!providerNotificationId) {
          return;
        }

        await this.taskRepository.updateScheduledNotification({
          ...notification,
          status: "scheduled",
          providerNotificationId,
          updatedAt: timestamp
        });
      })
    );
  }
}

type TodayTaskDescriptor = {
  item: TaskWithRule;
  dueLocalDate: string;
  windowStartLocalDate: string;
  windowEndLocalDate: string;
  occurrence?: TaskOccurrence;
};

function getTodayTask(item: TaskWithRule, referenceDate: DateTime): TodayTaskDescriptor | null {
  const { reminderRule, task } = item;
  const today = referenceDate.setZone(reminderRule.timezone).toISODate();

  if (!today) {
    return null;
  }

  if (task.type === "one_time") {
    if (reminderRule.localDate !== today) {
      return null;
    }

    return {
      item,
      dueLocalDate: today,
      windowStartLocalDate: today,
      windowEndLocalDate: today,
      occurrence: item.occurrence
    };
  }

  if (!reminderRule.dueDay || !reminderRule.reminderStartDay) {
    return null;
  }

  const window = buildMonthlyWindow({
    year: referenceDate.setZone(reminderRule.timezone).year,
    month: referenceDate.setZone(reminderRule.timezone).month,
    dueDay: reminderRule.dueDay,
    reminderStartDay: reminderRule.reminderStartDay,
    timezone: reminderRule.timezone
  });

  if (!isWithinLocalDateWindow(today, window.windowStartLocalDate, window.windowEndLocalDate)) {
    return null;
  }

  return {
    item,
    ...window,
    occurrence: item.occurrence
  };
}

function createOccurrence(descriptor: TodayTaskDescriptor, timestamp: string): TaskOccurrence {
  return {
    id: String(uuid.v4()),
    taskId: descriptor.item.task.id,
    reminderRuleId: descriptor.item.reminderRule.id,
    dueLocalDate: descriptor.dueLocalDate,
    windowStartLocalDate: descriptor.windowStartLocalDate,
    windowEndLocalDate: descriptor.windowEndLocalDate,
    timezone: descriptor.item.reminderRule.timezone,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function isWithinLocalDateWindow(localDate: string, windowStart: string, windowEnd: string) {
  return localDate >= windowStart && localDate <= windowEnd;
}

function notificationMatchesOccurrence(notification: ScheduledNotification, occurrence: TaskOccurrence) {
  return (
    notification.occurrenceId === occurrence.id ||
    (!notification.occurrenceId && notification.scheduledLocalDate === occurrence.dueLocalDate)
  );
}
