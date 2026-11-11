export const WEEKDAYS = [
  { index: 1, label: "周一", short: "一", en: "MON" },
  { index: 2, label: "周二", short: "二", en: "TUE" },
  { index: 3, label: "周三", short: "三", en: "WED" },
  { index: 4, label: "周四", short: "四", en: "THU" },
  { index: 5, label: "周五", short: "五", en: "FRI" },
  { index: 6, label: "周六", short: "六", en: "SAT" },
  { index: 7, label: "周日", short: "日", en: "SUN" },
] as const;

const DAY_MS = 86_400_000;

export function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfWeekMonday(date: Date): Date {
  const d = atMidnight(date);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = atMidnight(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return atMidnight(new Date());
  return new Date(year, month - 1, day);
}

export function dayDiff(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / DAY_MS);
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

export function getWeekdayNumber(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1;
}

export function getWeekNumber(startDate: string, date: Date, totalWeeks: number): number {
  const start = startOfWeekMonday(parseDateKey(startDate));
  const week = Math.floor(dayDiff(start, atMidnight(date)) / 7) + 1;
  return Math.min(Math.max(week, 1), Math.max(totalWeeks, 1));
}

export interface TermPosition {
  week: number;
  state: "before" | "during" | "after";
}

export function getTermPosition(
  startDate: string,
  totalWeeks: number,
  date = new Date(),
): TermPosition {
  const start = startOfWeekMonday(parseDateKey(startDate));
  const diff = dayDiff(start, atMidnight(date));
  if (diff < 0) return { week: 1, state: "before" };
  const week = Math.floor(diff / 7) + 1;
  if (week > totalWeeks) return { week: totalWeeks, state: "after" };
  return { week, state: "during" };
}

export function getWeekStart(startDate: string, week: number): Date {
  const start = startOfWeekMonday(parseDateKey(startDate));
  return addDays(start, (week - 1) * 7);
}

export function getWeekDates(startDate: string, week: number): Date[] {
  const start = getWeekStart(startDate, week);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getDateForSlot(
  startDate: string,
  week: number,
  weekday: number,
): Date {
  return addDays(getWeekStart(startDate, week), weekday - 1);
}

export function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function formatShortDate(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export function formatWeekRange(dates: Date[]): string {
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (!first || !last) return "";
  if (first.getMonth() === last.getMonth()) {
    return `${first.getMonth() + 1}月${first.getDate()}日 — ${last.getDate()}日`;
  }
  return `${formatMonthDay(first)} — ${formatMonthDay(last)}`;
}

export function formatLongDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function weekdayLabel(weekday: number): string {
  return WEEKDAYS[weekday - 1]?.label ?? "";
}

export function formatDateWithWeekday(date: Date): string {
  return `${formatLongDate(date)} ${weekdayLabel(getWeekdayNumber(date))}`;
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

export function minutesToTime(total: number): string {
  const normalized = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${start} – ${end}`;
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0 分钟";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} 分钟`;
  if (!rest) return `${hours} 小时`;
  return `${hours} 小时 ${rest} 分钟`;
}

export function getTermName(date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 8) return `${year} 秋季学期`;
  if (month >= 2) return `${year} 春季学期`;
  return `${year - 1}–${year} 秋季学期`;
}

export function getDefaultStartDate(date = new Date()): string {
  return dateKey(startOfWeekMonday(date));
}
