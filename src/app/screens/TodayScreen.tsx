import { FlatList } from "react-native";

import { EmptyState } from "@/app/components/EmptyState";
import { Header } from "@/app/components/Header";
import { Screen } from "@/app/components/Screen";
import { TaskListItem } from "@/app/components/TaskListItem";
import { useTasks } from "@/app/providers/AppProviders";

export function TodayScreen() {
  const { error, isLoading, tasks } = useTasks();

  return (
    <Screen scroll={false}>
      <Header
        title="Hoje"
        subtitle="Lembretes ativos, atrasados e tarefas dentro da janela de aviso."
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
      ) : tasks.length === 0 ? (
        <EmptyState
          title="Nenhum lembrete ainda"
          description="Crie o primeiro lembrete na aba Novo. Ele ficara salvo neste dispositivo."
        />
      ) : (
        <FlatList
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          data={tasks}
          keyExtractor={(item) => item.task.id}
          renderItem={({ item }) => <TaskListItem item={item} />}
        />
      )}
    </Screen>
  );
}
