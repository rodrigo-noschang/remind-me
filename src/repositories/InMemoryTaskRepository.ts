import type { TaskWithRule } from "@/app/types";
import type { CreateTaskRecordInput, TaskRepository } from "@/repositories/TaskRepository";

export class InMemoryTaskRepository implements TaskRepository {
  private records: TaskWithRule[] = [];

  async create(input: CreateTaskRecordInput): Promise<TaskWithRule> {
    const record = {
      task: input.task,
      reminderRule: input.reminderRule
    };

    this.records = [record, ...this.records];
    return record;
  }

  async listActive(): Promise<TaskWithRule[]> {
    return this.records.filter(({ task }) => task.status === "active");
  }
}
