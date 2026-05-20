import { StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/app/components/EmptyState";
import { Header } from "@/app/components/Header";
import { Screen } from "@/app/components/Screen";
import { useTasks } from "@/app/providers/AppProviders";
import { colors, spacing } from "@/app/theme";

export function CalendarScreen() {
  const { error, isLoading, tasks } = useTasks();

  return (
    <Screen>
      <Header title="Calendario" subtitle="Visao mensal simples preparada para a Fase 5." />
      {isLoading ? (
        <EmptyState
          title="Carregando calendario"
          description="Buscando os lembretes salvos neste dispositivo."
        />
      ) : error ? (
        <EmptyState
          title="Nao foi possivel carregar"
          description={error}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="Calendario vazio"
          description="Os marcadores de dias com tarefas entram quando as ocorrencias forem conectadas."
        />
      ) : (
        <View style={styles.summary}>
          <Text style={styles.value}>{tasks.length}</Text>
          <Text style={styles.label}>lembretes salvos neste dispositivo</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl
  },
  value: {
    color: colors.accent,
    fontSize: 44,
    fontWeight: "800"
  },
  label: {
    color: colors.mutedText,
    fontSize: 15,
    textAlign: "center"
  }
});
