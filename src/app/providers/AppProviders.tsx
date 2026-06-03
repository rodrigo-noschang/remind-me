import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { TaskWithRule } from "@/app/types";
import { bootstrapDatabase } from "@/db/bootstrap";
import { SqliteTaskRepository } from "@/repositories/SqliteTaskRepository";
import { NotificationScheduler } from "@/services/NotificationScheduler";
import { TaskService, type CreateTaskInput } from "@/services/TaskService";

const taskRepository = new SqliteTaskRepository();
const notificationScheduler = new NotificationScheduler();
const taskService = new TaskService(taskRepository, notificationScheduler);

type TaskContextValue = {
  tasks: TaskWithRule[];
  todayTasks: TaskWithRule[];
  isLoading: boolean;
  error: string | null;
  createTask: (input: CreateTaskInput) => Promise<TaskWithRule>;
  completeTodayTask: (taskId: string) => Promise<void>;
  reopenTodayTask: (taskId: string) => Promise<void>;
  reloadTasks: () => Promise<void>;
};

const TaskContext = createContext<TaskContextValue | null>(null);

export function AppProviders({ children }: PropsWithChildren) {
  const [tasks, setTasks] = useState<TaskWithRule[]>([]);
  const [todayTasks, setTodayTasks] = useState<TaskWithRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await bootstrapDatabase();
      const [activeTasks, activeTodayTasks] = await Promise.all([
        taskRepository.listActive(),
        taskService.listToday()
      ]);

      setTasks(activeTasks);
      setTodayTasks(activeTodayTasks);
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

  useEffect(() => {
    void notificationScheduler.preparePermissionsOnStartup().catch(console.error);
    void notificationScheduler.logDiagnostics().catch(console.error);
  }, []);

  useEffect(() => {
    const receivedSubscription = NotificationScheduler.addReceivedListener((notification) => {
      console.log("[notifications] received", {
        identifier: notification.request.identifier,
        title: notification.request.content.title,
        trigger: notification.request.trigger,
        data: notification.request.content.data
      });
    });
    const responseSubscription = NotificationScheduler.addResponseListener((response) => {
      console.log("[notifications] response", {
        identifier: response.notification.request.identifier,
        actionIdentifier: response.actionIdentifier,
        title: response.notification.request.content.title,
        data: response.notification.request.content.data
      });
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  const createTask = useCallback(async (input: CreateTaskInput) => {
    setError(null);

    try {
      await bootstrapDatabase();
      const createdTask = await taskService.create(input);
      setTasks((current) => [createdTask, ...current]);
      setTodayTasks(await taskService.listToday());
      return createdTask;
    } catch (caughtError) {
      console.error(caughtError);
      setError("Nao foi possivel salvar o lembrete.");
      throw caughtError;
    }
  }, []);

  const completeTodayTask = useCallback(async (taskId: string) => {
    setError(null);

    try {
      await bootstrapDatabase();
      await taskService.completeTodayOccurrence(taskId);
      setTodayTasks(await taskService.listToday());
    } catch (caughtError) {
      console.error(caughtError);
      setError("Nao foi possivel concluir o lembrete.");
      throw caughtError;
    }
  }, []);

  const reopenTodayTask = useCallback(async (taskId: string) => {
    setError(null);

    try {
      await bootstrapDatabase();
      await taskService.reopenTodayOccurrence(taskId);
      setTodayTasks(await taskService.listToday());
    } catch (caughtError) {
      console.error(caughtError);
      setError("Nao foi possivel reabrir o lembrete.");
      throw caughtError;
    }
  }, []);

  const value = useMemo<TaskContextValue>(
    () => ({
      tasks,
      todayTasks,
      isLoading,
      error,
      createTask,
      completeTodayTask,
      reopenTodayTask,
      reloadTasks
    }),
    [completeTodayTask, createTask, error, isLoading, reloadTasks, reopenTodayTask, tasks, todayTasks]
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
