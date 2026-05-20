import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/app/theme";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  description: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 22
  }
});
