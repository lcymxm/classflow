import type { Session } from "../types";
import { dateKey, parseDateKey } from "./date";

export type CalendarDayKind = "holiday" | "workday";

export interface CalendarDayInfo {
  kind: CalendarDayKind;
  name: string;
  short: "休" | "班";
}

interface HolidayEntry {
  start: string;
  end?: string;
  name: string;
}

interface WorkdayEntry {
  date: string;
  name: string;
}

/*
 * Official State Council arrangements for 2026 and 2027 (published 2025-11-04
 * and 2026-11-05). Weekends that are ordinary days are still weekends; only
 * holiday and make-up-workday overrides are listed here.
 */
const HOLIDAYS: HolidayEntry[] = [
  // 2026
  { start: "2026-01-01", end: "2026-01-03", name: "元旦" },
  { start: "2026-02-15", end: "2026-02-23", name: "春节" },
  { start: "2026-04-04", end: "2026-04-06", name: "清明节" },
  { start: "2026-05-01", end: "2026-05-05", name: "劳动节" },
  { start: "2026-06-19", end: "2026-06-21", name: "端午节" },
  { start: "2026-09-25", end: "2026-09-27", name: "中秋节" },
  { start: "2026-10-01", end: "2026-10-07", name: "国庆节" },
  // 2027
  { start: "2027-01-01", end: "2027-01-03", name: "元旦" },
  { start: "2027-02-05", end: "2027-02-13", name: "春节" },
  { start: "2027-04-03", end: "2027-04-05", name: "清明节" },
  { start: "2027-05-01", end: "2027-05-05", name: "劳动节" },
  { start: "2027-06-09", name: "端午节" },
  { start: "2027-09-15", name: "中秋节" },
  { start: "2027-10-01", end: "2027-10-07", name: "国庆节" },
];

const WORKDAYS: WorkdayEntry[] = [
  // 2026
  { date: "2026-01-04", name: "元旦" },
  { date: "2026-02-14", name: "春节" },
  { date: "2026-02-28", name: "春节" },
  { date: "2026-05-09", name: "劳动节" },
  { date: "2026-09-20", name: "国庆节" },
  { date: "2026-10-10", name: "国庆节" },
  // 2027
  { date: "2027-01-31", name: "春节" },
  { date: "2027-02-14", name: "春节" },
  { date: "2027-05-08", name: "劳动节" },
  { date: "2027-09-26", name: "国庆节" },
  { date: "2027-10-09", name: "国庆节" },
];

function buildCalendar(): Map<string, CalendarDayInfo> {
  const calendar = new Map<string, CalendarDayInfo>();
  const addRange = (startKey: string, endKey: string, name: string) => {
    const start = parseDateKey(startKey);
    const end = parseDateKey(endKey);
    const cursor = new Date(start);
    while (cursor <= end) {
      calendar.set(dateKey(cursor), { kind: "holiday", name, short: "休" });
      cursor.setDate(cursor.getDate() + 1);
    }
  };

  for (const holiday of HOLIDAYS) {
    addRange(holiday.start, holiday.end ?? holiday.start, holiday.name);
  }
  for (const workday of WORKDAYS) {
    calendar.set(workday.date, { kind: "workday", name: workday.name, short: "班" });
  }
  return calendar;
}

const CALENDAR = buildCalendar();

export function getCalendarInfo(date: Date | string): CalendarDayInfo | null {
  const key = typeof date === "string" ? date : dateKey(date);
  return CALENDAR.get(key) ?? null;
}

export function isHolidayDate(date: Date | string): boolean {
  return getCalendarInfo(date)?.kind === "holiday";
}

export function isWorkdayDate(date: Date | string): boolean {
  return getCalendarInfo(date)?.kind === "workday";
}

/**
 * Hide classes on official holidays. Make-up workdays stay visible and keep
 * their badge; they do not automatically borrow another weekday's timetable,
 * because that mapping is set by each school and is not part of the national
 * holiday notice.
 */
export function filterHolidaySessions(
  sessions: Session[],
  weekDates: Date[],
  enabled: boolean,
): Session[] {
  if (!enabled) return sessions;
  return sessions.filter((session) => {
    const date = weekDates[session.day - 1];
    return !date || !isHolidayDate(date);
  });
}

/**
 * Keep weekends visible when a make-up workday falls on a weekend, even if the
 * semester normally hides weekends.
 */
export function getVisibleDays(
  showWeekends: boolean,
  weekDates: Date[],
  autoHolidays: boolean,
): number[] {
  const days = showWeekends ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];
  if (!autoHolidays) return days;
  for (const day of [6, 7]) {
    const date = weekDates[day - 1];
    if (date && isWorkdayDate(date) && !days.includes(day)) days.push(day);
  }
  return days.sort((a, b) => a - b);
}

export function getDayStatusMap(
  weekDates: Date[],
  autoHolidays: boolean,
): Record<number, CalendarDayInfo | null> {
  const map: Record<number, CalendarDayInfo | null> = {};
  for (let day = 1; day <= 7; day += 1) {
    const date = weekDates[day - 1];
    map[day] = autoHolidays && date ? getCalendarInfo(date) : null;
  }
  return map;
}

export function getCalendarSummary(weekDates: Date[], autoHolidays: boolean): {
  holidays: string[];
  workdays: string[];
} {
  if (!autoHolidays) return { holidays: [], workdays: [] };
  const holidays = new Set<string>();
  const workdays = new Set<string>();
  for (const date of weekDates) {
    const info = getCalendarInfo(date);
    if (info?.kind === "holiday") holidays.add(info.name);
    if (info?.kind === "workday") workdays.add(info.name);
  }
  return { holidays: [...holidays], workdays: [...workdays] };
}
