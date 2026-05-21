import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  UIManager,
  View
} from "react-native";

import { EmptyState } from "@/app/components/EmptyState";
import { Header } from "@/app/components/Header";
import { Screen } from "@/app/components/Screen";
import { TaskListItem } from "@/app/components/TaskListItem";
import { useTasks } from "@/app/providers/AppProviders";
import { colors, spacing } from "@/app/theme";
import type { TaskWithRule } from "@/app/types";

export function TodayScreen() {
  const { completeTodayTask, error, isLoading, reopenTodayTask, todayTasks } = useTasks();
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [flyingTask, setFlyingTask] = useState<FlyingTask | null>(null);
  const rootRef = useRef<View | null>(null);
  const completedSectionRef = useRef<View | null>(null);
  const taskRefs = useRef<Record<string, View | null>>({});
  const { completedTasks, pendingTasks } = useMemo(
    () => ({
      completedTasks: sortByCompletionTime(todayTasks.filter((item) => Boolean(item.occurrence?.completedAtUtc))),
      pendingTasks: sortByReminderTime(todayTasks.filter((item) => !item.occurrence?.completedAtUtc))
    }),
    [todayTasks]
  );
  const rows = useMemo<TodayRow[]>(
    () => [
      ...pendingTasks.map((item) => ({ item, type: "task" as const })),
      { count: completedTasks.length, type: "completed-section" as const },
      ...(flyingTask ? [{ flyingTask, type: "completion-placeholder" as const }] : []),
      ...(completedTasks.length > 0
        ? completedTasks.map((item) => ({ item, type: "task" as const }))
        : flyingTask
          ? []
          : [{ type: "completed-empty" as const }])
    ],
    [completedTasks, flyingTask, pendingTasks]
  );

  useEffect(() => {
    if (Platform.OS === "android") {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  async function handleToggleComplete(item: TaskWithRule) {
    const isCompleted = Boolean(item.occurrence?.completedAtUtc);

    setUpdatingTaskId(item.task.id);

    if (!isCompleted) {
      await animateTaskTransition(item);
    }

    animateNextLayout();

    try {
      if (isCompleted) {
        await reopenTodayTask(item.task.id);
      } else {
        await completeTodayTask(item.task.id);
      }
    } finally {
      setFlyingTask(null);
      setUpdatingTaskId(null);
    }
  }

  return (
    <Screen scroll={false}>
      <View ref={rootRef} style={styles.root}>
        <Header
          title="Hoje"
          subtitle={`${pendingTasks.length} pendentes - ${completedTasks.length} concluidos hoje`}
        />
        {isLoading ? (
          <EmptyState
            title="Carregando lembretes"
            description="Buscando os lembretes salvos neste dispositivo."
          />
        ) : error ? (
          <EmptyState
            title="Nao foi possivel carregar"
            description={error}
          />
        ) : todayTasks.length === 0 ? (
          <EmptyState
            title="Nada para hoje"
            description="Os lembretes de hoje aparecem aqui quando chegarem na data ou janela de aviso."
          />
        ) : (
          <FlatList
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            data={rows}
            keyExtractor={(item) => {
              if (item.type === "task") {
                return item.item.task.id;
              }

              return item.type;
            }}
            ListHeaderComponent={
              <TodaySummary completedCount={completedTasks.length} pendingCount={pendingTasks.length} />
            }
            renderItem={({ item }) => {
              if (item.type === "completed-section") {
                return <SectionTitle count={item.count} ref={completedSectionRef} title="Concluidos" />;
              }

              if (item.type === "completed-empty") {
                return <CompletedEmptyState />;
              }

              if (item.type === "completion-placeholder") {
                return <CompletionPlaceholder flyingTask={item.flyingTask} />;
              }

              const isCompleted = Boolean(item.item.occurrence?.completedAtUtc);
              return (
                <TaskListItem
                  ref={(ref) => {
                    taskRefs.current[item.item.task.id] = ref;
                  }}
                  isCompleted={isCompleted}
                  isHidden={flyingTask?.item.task.id === item.item.task.id}
                  isUpdating={updatingTaskId === item.item.task.id}
                  item={item.item}
                  onToggleComplete={() => void handleToggleComplete(item.item)}
                />
              );
            }}
          />
        )}
        {flyingTask ? <FlyingTaskCard flyingTask={flyingTask} /> : null}
      </View>
    </Screen>
  );

  async function animateTaskTransition(item: TaskWithRule) {
    const taskRef = taskRefs.current[item.task.id];
    const sectionRef = completedSectionRef.current;
    const root = rootRef.current;

    if (!taskRef || !sectionRef || !root) {
      return;
    }

    const [rootLayout, taskLayout, sectionLayout] = await Promise.all([
      measureInWindow(root),
      measureInWindow(taskRef),
      measureInWindow(sectionRef)
    ]);

    if (!rootLayout || !taskLayout || !sectionLayout) {
      return;
    }

    const animatedValue = new Animated.Value(0);
    const targetY = sectionLayout.y - rootLayout.y + sectionLayout.height + 12;
    const translateY = targetY - (taskLayout.y - rootLayout.y);
    const translateX = 8;

    setFlyingTask({
      animatedValue,
      height: taskLayout.height,
      item,
      left: taskLayout.x - rootLayout.x,
      top: taskLayout.y - rootLayout.y,
      translateX,
      translateY,
      width: taskLayout.width
    });

    await runFlyingAnimation(animatedValue);
  }
}

type TodayRow =
  | {
      item: TaskWithRule;
      type: "task";
    }
  | {
      count: number;
      type: "completed-section";
    }
  | {
      flyingTask: FlyingTask;
      type: "completion-placeholder";
    }
  | {
      type: "completed-empty";
    };

type TodaySummaryProps = {
  completedCount: number;
  pendingCount: number;
};

type FlyingTask = {
  animatedValue: Animated.Value;
  height: number;
  item: TaskWithRule;
  left: number;
  top: number;
  translateX: number;
  translateY: number;
  width: number;
};

function TodaySummary({ completedCount, pendingCount }: TodaySummaryProps) {
  return (
    <View style={styles.summary}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{pendingCount}</Text>
        <Text style={styles.summaryLabel}>pendentes</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{completedCount}</Text>
        <Text style={styles.summaryLabel}>concluidos</Text>
      </View>
    </View>
  );
}

const SectionTitle = forwardRef<View, { count: number; title: string }>(function SectionTitle(
  { count, title }: { count: number; title: string },
  ref
) {
  return (
    <View ref={ref} style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
});

function FlyingTaskCard({ flyingTask }: { flyingTask: FlyingTask }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.flyingTask,
        {
          height: flyingTask.height,
          left: flyingTask.left,
          top: flyingTask.top,
          transform: [
            {
              translateX: flyingTask.animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, flyingTask.translateX]
              })
            },
            {
              translateY: flyingTask.animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, flyingTask.translateY]
              })
            },
            {
              scale: flyingTask.animatedValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 1.025, 0.98]
              })
            }
          ],
          width: flyingTask.width
        }
      ]}
    >
      <TaskListItem
        isCompleted
        isUpdating
        item={flyingTask.item}
        onToggleComplete={() => undefined}
      />
    </Animated.View>
  );
}

function CompletedEmptyState() {
  return (
    <View style={styles.completedEmpty}>
      <Text style={styles.completedEmptyText}>Nada concluido ainda</Text>
    </View>
  );
}

function CompletionPlaceholder({ flyingTask }: { flyingTask: FlyingTask }) {
  return (
    <Animated.View
      style={{
        height: flyingTask.animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, flyingTask.height]
        }),
        opacity: flyingTask.animatedValue.interpolate({
          inputRange: [0, 0.35, 1],
          outputRange: [0, 0.2, 0]
        })
      }}
    />
  );
}

function animateNextLayout() {
  LayoutAnimation.configureNext({
    create: {
      property: LayoutAnimation.Properties.opacity,
      type: LayoutAnimation.Types.easeInEaseOut
    },
    delete: {
      property: LayoutAnimation.Properties.opacity,
      type: LayoutAnimation.Types.easeInEaseOut
    },
    duration: 260,
    update: {
      type: LayoutAnimation.Types.easeInEaseOut
    }
  });
}

function measureInWindow(ref: View) {
  return new Promise<MeasuredLayout | null>((resolve) => {
    ref.measureInWindow((x, y, width, height) => {
      if (width === 0 && height === 0) {
        resolve(null);
        return;
      }

      resolve({ height, width, x, y });
    });
  });
}

function runFlyingAnimation(animatedValue: Animated.Value) {
  return new Promise<void>((resolve) => {
    Animated.timing(animatedValue, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: false
    }).start(() => {
      resolve();
    });
  });
}

function sortByReminderTime(items: TaskWithRule[]) {
  return [...items].sort(compareByReminderTime);
}

function sortByCompletionTime(items: TaskWithRule[]) {
  return [...items].sort(compareByCompletionTime);
}

function compareByReminderTime(left: TaskWithRule, right: TaskWithRule) {
  const timeComparison = left.reminderRule.localTime.localeCompare(right.reminderRule.localTime);

  if (timeComparison !== 0) {
    return timeComparison;
  }

  return left.task.createdAt.localeCompare(right.task.createdAt);
}

function compareByCompletionTime(left: TaskWithRule, right: TaskWithRule) {
  const leftCompletedAt = left.occurrence?.completedAtUtc ?? "";
  const rightCompletedAt = right.occurrence?.completedAtUtc ?? "";
  const completionComparison = rightCompletedAt.localeCompare(leftCompletedAt);

  if (completionComparison !== 0) {
    return completionComparison;
  }

  return compareByReminderTime(left, right);
}

type MeasuredLayout = {
  height: number;
  width: number;
  x: number;
  y: number;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: spacing.md
  },
  summary: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: spacing.sm,
    padding: spacing.md
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xs
  },
  summaryDivider: {
    alignSelf: "stretch",
    backgroundColor: colors.border,
    width: 1
  },
  summaryValue: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: "800"
  },
  summaryLabel: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "700"
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm
  },
  sectionTitle: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  sectionCount: {
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    minWidth: 28,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: "center"
  },
  completedEmpty: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    minHeight: 56,
    justifyContent: "center",
    padding: spacing.md
  },
  completedEmptyText: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: "700"
  },
  flyingTask: {
    elevation: 8,
    position: "absolute",
    shadowColor: "#000000",
    shadowOffset: {
      height: 8,
      width: 0
    },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    zIndex: 20
  }
});
