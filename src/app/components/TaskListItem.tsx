import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DateTime } from "luxon";

import { colors, spacing } from "@/app/theme";
import type { TaskWithRule } from "@/app/types";

type TaskListItemProps = {
  item: TaskWithRule;
  isCompleted?: boolean;
  isUpdating?: boolean;
  onToggleComplete?: () => void;
};

export function TaskListItem({ isCompleted = false, isUpdating = false, item, onToggleComplete }: TaskListItemProps) {
  const { task, reminderRule } = item;
  const when =
    task.type === "one_time"
      ? `${formatDate(reminderRule.localDate)} as ${reminderRule.localTime}`
      : `Todo mes, do dia ${reminderRule.reminderStartDay} ao ${reminderRule.dueDay}, as ${reminderRule.localTime}`;

  return (
    <View style={[styles.container, isCompleted && styles.containerCompleted]}>
      <View style={styles.row}>
        <Text style={[styles.title, isCompleted && styles.titleCompleted]}>{task.title}</Text>
        <Text style={styles.badge}>{task.type === "one_time" ? "Unico" : "Mensal"}</Text>
      </View>
      {task.description ? <Text style={styles.description}>{task.description}</Text> : null}
      <Text style={styles.meta}>{when}</Text>
      <Text style={styles.timezone}>{reminderRule.timezone}</Text>
      {onToggleComplete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ checked: isCompleted, disabled: isUpdating }}
          disabled={isUpdating}
          onPress={onToggleComplete}
          style={({ pressed }) => [
            styles.completeButton,
            isCompleted && styles.completeButtonDone,
            pressed && styles.pressed,
            isUpdating && styles.disabled
          ]}
        >
          <MaterialCommunityIcons
            color={isCompleted ? colors.accent : colors.mutedText}
            name={isCompleted ? "checkbox-marked-circle-outline" : "checkbox-blank-circle-outline"}
            size={20}
          />
          <Text style={[styles.completeButtonText, isCompleted && styles.completeButtonTextDone]}>
            {isCompleted ? "Concluido" : "Concluir"}
          </Text>
        </Pressable>
      ) : null}
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
  containerCompleted: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent
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
  titleCompleted: {
    color: colors.mutedText,
    textDecorationLine: "line-through"
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
  },
  completeButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  completeButtonDone: {
    backgroundColor: colors.surface,
    borderColor: colors.accent
  },
  completeButtonText: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: "700"
  },
  completeButtonTextDone: {
    color: colors.accent
  },
  pressed: {
    opacity: 0.76
  },
  disabled: {
    opacity: 0.52
  }
});
