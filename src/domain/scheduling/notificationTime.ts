import { localDateTimeToUtcIso } from "@/domain/timezone/timezone";

type BuildScheduledTimeInput = {
  localDate: string;
  localTime: string;
  timezone: string;
};

export function buildScheduledTime(input: BuildScheduledTimeInput) {
  return {
    scheduledLocalDate: input.localDate,
    scheduledLocalTime: input.localTime,
    scheduledTimezone: input.timezone,
    scheduledForUtc: localDateTimeToUtcIso(input.localDate, input.localTime, input.timezone)
  };
}
