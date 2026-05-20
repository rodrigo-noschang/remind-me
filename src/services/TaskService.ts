import { DateTime } from "luxon";
import uuid from "react-native-uuid";

import type { ReminderRule, Task, TaskType, TimeMode } from "@/app/types";
import type { TaskRepository } from "@/repositories/TaskRepository";
import { getDeviceTimezone } from "@/domain/timezone/timezone";

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
  constructor(private readonly taskRepository: TaskRepository) {}

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

    const reminderRule: ReminderRule = {
      id: String(uuid.v4()),
      taskId,
      kind: input.type,
      timeMode: input.timeMode ?? "recipient_local",
      timezone: getDeviceTimezone(),
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

    return this.taskRepository.create({ task, reminderRule });
  }
}
