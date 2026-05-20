import { DateTime } from "luxon";

export function getDeviceTimezone() {
  return DateTime.local().zoneName;
}

export function localDateTimeToUtcIso(localDate: string, localTime: string, timezone: string) {
  const [hour, minute] = localTime.split(":").map(Number);

  return DateTime.fromISO(localDate, { zone: timezone })
    .set({ hour, minute, second: 0, millisecond: 0 })
    .toUTC()
    .toISO();
}
