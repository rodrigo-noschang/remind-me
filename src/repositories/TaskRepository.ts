import type { ReminderRule, Task, TaskWithRule } from "@/app/types";

export type CreateTaskRecordInput = {
  task: Task;
  reminderRule: ReminderRule;
};

export interface TaskRepository {
  create(input: CreateTaskRecordInput): Promise<TaskWithRule>;
  listActive(): Promise<TaskWithRule[]>;
}
