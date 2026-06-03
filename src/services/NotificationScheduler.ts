import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type ScheduleLocalNotificationInput = {
  title: string;
  body?: string;
  scheduledForUtc: string;
};

const REMINDERS_CHANNEL_ID = "reminders-alerts-v2";

export class NotificationScheduler {
  static addReceivedListener(listener: Parameters<typeof Notifications.addNotificationReceivedListener>[0]) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  static addResponseListener(listener: Parameters<typeof Notifications.addNotificationResponseReceivedListener>[0]) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  async configureNotificationChannels() {
    if (Platform.OS !== "android") {
      return;
    }

    await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL_ID, {
      name: "Lembretes",
      importance: Notifications.AndroidImportance.MAX,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      showBadge: true
    });
  }

  async requestPermissions() {
    await this.configureNotificationChannels();

    const currentPermissions = await Notifications.getPermissionsAsync();

    if (currentPermissions.granted) {
      return true;
    }

    if (!currentPermissions.canAskAgain) {
      return false;
    }

    const requestedPermissions = await Notifications.requestPermissionsAsync();
    return requestedPermissions.granted;
  }

  async preparePermissionsOnStartup() {
    return this.requestPermissions();
  }

  async scheduleLocalNotification(input: ScheduleLocalNotificationInput) {
    await this.configureNotificationChannels();

    const providerNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: {
          scheduledForUtc: input.scheduledForUtc
        }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(input.scheduledForUtc),
        channelId: REMINDERS_CHANNEL_ID
      }
    });

    console.log("[notifications] scheduled", {
      providerNotificationId,
      channelId: REMINDERS_CHANNEL_ID,
      scheduledForUtc: input.scheduledForUtc,
      scheduledForLocal: new Date(input.scheduledForUtc).toLocaleString()
    });

    return providerNotificationId;
  }

  async logDiagnostics() {
    const [permissions, scheduledNotifications] = await Promise.all([
      Notifications.getPermissionsAsync(),
      Notifications.getAllScheduledNotificationsAsync()
    ]);
    const channel =
      Platform.OS === "android"
        ? await Notifications.getNotificationChannelAsync(REMINDERS_CHANNEL_ID)
        : null;

    console.log("[notifications] diagnostics", {
      permissions,
      channel,
      scheduledNotifications: scheduledNotifications.map((notification) => ({
        identifier: notification.identifier,
        title: notification.content.title,
        trigger: notification.trigger,
        data: notification.content.data
      }))
    });
  }

  async cancel(providerNotificationId: string) {
    await Notifications.cancelScheduledNotificationAsync(providerNotificationId);
  }
}
