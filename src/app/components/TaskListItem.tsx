import { StyleSheet, Text, View } from "react-native";
import { DateTime } from "luxon";

import { colors, spacing } from "@/app/theme";
import type { TaskWithRule } from "@/app/types";

type TaskListItemProps = {
  item: TaskWithRule;
};

export function TaskListItem({ item }: TaskListItemProps) {
  const { task, reminderRule } = item;
  const when =
    task.type === "one_time"
      ? `${formatDate(reminderRule.localDate)} as ${reminderRule.localTime}`
      : `Todo mes, do dia ${reminderRule.reminderStartDay} ao ${reminderRule.dueDay}, as ${reminderRule.localTime}`;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title}>{task.title}</Text>
        <Text style={styles.badge}>{task.type === "one_time" ? "Unico" : "Mensal"}</Text>
      </View>
      {task.description ? <Text style={styles.description}>{task.description}</Text> : null}
      <Text style={styles.meta}>{when}</Text>
      <Text style={styles.timezone}>{reminderRule.timezone}</Text>
    </View>
  );
}

function formatDate(localDate?: string) {
  if (!localDate) {
    return "sem data";
  }

  return DateTime.fromISO(localDate).toFormat("dd/LL/yyyy");
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: "700"
  },
  badge: {
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  description: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20
  },
  meta: {
    color: colors.text,
    fontSize: 14
  },
  timezone: {
    color: colors.mutedText,
    fontSize: 12
  }
});
