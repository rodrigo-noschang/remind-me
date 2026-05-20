import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { TaskWithRule } from "@/app/types";
import { bootstrapDatabase } from "@/db/bootstrap";
import { SqliteTaskRepository } from "@/repositories/SqliteTaskRepository";
import { TaskService, type CreateTaskInput } from "@/services/TaskService";

const taskRepository = new SqliteTaskRepository();
const taskService = new TaskService(taskRepository);

type TaskContextValue = {
  tasks: TaskWithRule[];
  isLoading: boolean;
  error: string | null;
  createTask: (input: CreateTaskInput) => Promise<TaskWithRule>;
  reloadTasks: () => Promise<void>;
};

const TaskContext = createContext<TaskContextValue | null>(null);

export function AppProviders({ children }: PropsWithChildren) {
  const [tasks, setTasks] = useState<TaskWithRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await bootstrapDatabase();
      setTasks(await taskRepository.listActive());
    } catch (caughtError) {
      console.error(caughtError);
      setError("Nao foi possivel carregar os lembretes salvos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadTasks();
  }, [reloadTasks]);

  const createTask = useCallback(async (input: CreateTaskInput) => {
    setError(null);

    try {
      await bootstrapDatabase();
      const createdTask = await taskService.create(input);
      setTasks((current) => [createdTask, ...current]);
      return createdTask;
    } catch (caughtError) {
      console.error(caughtError);
      setError("Nao foi possivel salvar o lembrete.");
      throw caughtError;
    }
  }, []);

  const value = useMemo<TaskContextValue>(
    () => ({
      tasks,
      isLoading,
      error,
      createTask,
      reloadTasks
    }),
    [createTask, error, isLoading, reloadTasks, tasks]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const value = useContext(TaskContext);

  if (!value) {
    throw new Error("useTasks must be used inside AppProviders");
  }

  return value;
}
