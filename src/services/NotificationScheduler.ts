import * as Notifications from "expo-notifications";

export type ScheduleLocalNotificationInput = {
  title: string;
  body?: string;
  scheduledForUtc: string;
};

export class NotificationScheduler {
  async requestPermissions() {
    const result = await Notifications.requestPermissionsAsync();
    return result.granted;
  }

  async scheduleLocalNotification(input: ScheduleLocalNotificationInput) {
    return Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(input.scheduledForUtc)
      }
    });
  }

  async cancel(providerNotificationId: string) {
    await Notifications.cancelScheduledNotificationAsync(providerNotificationId);
  }
}
