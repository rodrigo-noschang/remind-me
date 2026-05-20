import { FlatList } from "react-native";

import { EmptyState } from "@/app/components/EmptyState";
import { Header } from "@/app/components/Header";
import { Screen } from "@/app/components/Screen";
import { TaskListItem } from "@/app/components/TaskListItem";
import { useTasks } from "@/app/providers/AppProviders";

export function UpcomingScreen() {
  const { error, isLoading, tasks } = useTasks();

  return (
    <Screen scroll={false}>
      <Header title="Proximos" subtitle="Base para agrupar lembretes por amanha, semana e mes." />
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
          title="Nada planejado"
          description="Quando houver tarefas salvas, esta tela sera a visao de proximos compromissos."
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
