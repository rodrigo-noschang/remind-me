import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type ScheduleLocalNotificationInput = {
  title: string;
  body?: string;
  scheduledForUtc: string;
};

const REMINDERS_CHANNEL_ID = "reminders";

export class NotificationScheduler {
  async configureNotificationChannels() {
    if (Platform.OS !== "android") {
      return;
    }

    await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL_ID, {
      name: "Lembretes",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250]
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

    return Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        sound: true
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(input.scheduledForUtc),
        channelId: REMINDERS_CHANNEL_ID
      }
    });
  }

  async cancel(providerNotificationId: string) {
    await Notifications.cancelScheduledNotificationAsync(providerNotificationId);
  }
}
