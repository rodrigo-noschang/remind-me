import type { NavigatorScreenParams } from "@react-navigation/native";

export type TabsParamList = {
  Today: undefined;
  Upcoming: undefined;
  Calendar: undefined;
  CreateTask: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList>;
};
