import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  StyleSheet,
  Text,
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
      ...(completedTasks.length > 0
        ? completedTasks.map((item) => ({ item, type: "task" as const }))
        : [{ type: "completed-empty" as const }])
    ],
    [completedTasks, pendingTasks]
  );

  async function handleToggleComplete(item: TaskWithRule) {
    const isCompleted = Boolean(item.occurrence?.completedAtUtc);

    setUpdatingTaskId(item.task.id);

    try {
      if (isCompleted) {
        await reopenTodayTask(item.task.id);
      } else {
        await completeTodayTask(item.task.id);
      }
    } finally {
      setUpdatingTaskId(null);
    }
  }

  return (
    <Screen scroll={false}>
      <View style={styles.root}>
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
              <TodayProgress completedCount={completedTasks.length} pendingCount={pendingTasks.length} />
            }
            renderItem={({ item }) => {
              if (item.type === "completed-section") {
                return <SectionTitle count={item.count} title="Concluidos" />;
              }

              if (item.type === "completed-empty") {
                return <CompletedEmptyState />;
              }

              const isCompleted = Boolean(item.item.occurrence?.completedAtUtc);
              return (
                <TaskListItem
                  isCompleted={isCompleted}
                  isUpdating={updatingTaskId === item.item.task.id}
                  item={item.item}
                  onToggleComplete={() => void handleToggleComplete(item.item)}
                />
              );
            }}
          />
        )}
      </View>
    </Screen>
  );
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
      type: "completed-empty";
    };

type TodayProgressProps = {
  completedCount: number;
  pendingCount: number;
};

function TodayProgress({ completedCount, pendingCount }: TodayProgressProps) {
  const totalCount = completedCount + pendingCount;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const progressPercentage = Math.round(progress * 100);
  const animatedProgress = useRef(new Animated.Value(progress)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    Animated.timing(animatedProgress, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
      toValue: progress,
      useNativeDriver: false
    }).start();
  }, [animatedProgress, progress]);

  const fillWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, trackWidth]
  });

  return (
    <View style={styles.progressSummary}>
      <View style={styles.progressHeader}>
        <View>
          <Text style={styles.progressTitle}>Progresso do dia</Text>
          <Text style={styles.progressMeta}>
            {completedCount} de {totalCount} concluidos
          </Text>
        </View>
        <Text style={styles.progressPercent}>{progressPercentage}%</Text>
      </View>
      <View
        onLayout={(event) => {
          setTrackWidth(event.nativeEvent.layout.width);
        }}
        style={styles.progressTrack}
      >
        <Animated.View style={[styles.progressFill, { width: fillWidth }]} />
      </View>
    </View>
  );
}

function SectionTitle({ count, title }: { count: number; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
}

function CompletedEmptyState() {
  return (
    <View style={styles.completedEmpty}>
      <Text style={styles.completedEmptyText}>Nada concluido ainda</Text>
    </View>
  );
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: spacing.md
  },
  progressSummary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md
  },
  progressHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  progressTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  progressMeta: {
    color: colors.mutedText,
    fontSize: 13,
    marginTop: spacing.xs
  },
  progressPercent: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: "800"
  },
  progressTrack: {
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    height: 12,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    height: "100%"
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
  }
});
