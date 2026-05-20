import { DateTime } from "luxon";

type MonthlyWindowInput = {
  year: number;
  month: number;
  dueDay: number;
  reminderStartDay: number;
  timezone: string;
};

export function buildMonthlyWindow(input: MonthlyWindowInput) {
  const base = DateTime.fromObject(
    { year: input.year, month: input.month, day: 1 },
    { zone: input.timezone }
  );

  const dueDate = clampDay(base, input.dueDay);
  const windowStart = clampDay(base, input.reminderStartDay);

  return {
    dueLocalDate: dueDate.toISODate(),
    windowStartLocalDate: windowStart.toISODate(),
    windowEndLocalDate: dueDate.toISODate()
  };
}

function clampDay(base: DateTime, day: number) {
  const daysInMonth = base.daysInMonth ?? 31;
  return base.set({ day: Math.min(Math.max(day, 1), daysInMonth) });
}
