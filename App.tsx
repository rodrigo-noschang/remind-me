import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { CalendarScreen } from "@/app/screens/CalendarScreen";
import { CreateTaskScreen } from "@/app/screens/CreateTaskScreen";
import { TodayScreen } from "@/app/screens/TodayScreen";
import { UpcomingScreen } from "@/app/screens/UpcomingScreen";
import { AppProviders } from "@/app/providers/AppProviders";
import { colors } from "@/app/theme";
import type { RootStackParamList, TabsParamList } from "@/app/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabsParamList>();

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: true,
		shouldSetBadge: false,
	}),
});

function TabsNavigator() {
	return (
		<Tabs.Navigator
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: colors.accent,
				tabBarInactiveTintColor: colors.mutedText,
				tabBarStyle: {
					borderTopColor: colors.border,
					backgroundColor: colors.surface,
				},
			}}
		>
			<Tabs.Screen
				name="Today"
				component={TodayScreen}
				options={{
					title: "Hoje",
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons
							name="checkbox-marked-outline"
							color={color}
							size={size}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="Upcoming"
				component={UpcomingScreen}
				options={{
					title: "Proximos",
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons
							name="clock-outline"
							color={color}
							size={size}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="Calendar"
				component={CalendarScreen}
				options={{
					title: "Calendario",
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons
							name="calendar-month-outline"
							color={color}
							size={size}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="CreateTask"
				component={CreateTaskScreen}
				options={{
					title: "Novo",
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons
							name="plus-circle-outline"
							color={color}
							size={size}
						/>
					),
				}}
			/>
		</Tabs.Navigator>
	);
}

export default function App() {
	return (
		<SafeAreaProvider>
			<AppProviders>
				<NavigationContainer>
					<Stack.Navigator screenOptions={{ headerShown: false }}>
						<Stack.Screen name="Tabs" component={TabsNavigator} />
					</Stack.Navigator>
				</NavigationContainer>
			</AppProviders>
		</SafeAreaProvider>
	);
}
