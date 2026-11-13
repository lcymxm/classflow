import type { Period, PeriodProfile, PeriodRule, Timetable } from "../types";

const MONTH_DAY = /^\d{2}-\d{2}$/;
const LEGACY_DATE = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function isValidMonthDay(value: string): boolean {
  if (!MONTH_DAY.test(value)) return false;
  const [month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(2024, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day;
}

function toMonthDay(value: unknown): string {
  if (typeof value !== "string") return "";
  const candidate = LEGACY_DATE.test(value) ? value.slice(5) : value;
  return isValidMonthDay(candidate) ? candidate : "";
}

export function normalizePeriodRules(
  value: unknown,
  profiles: PeriodProfile[],
  semesterStart: string,
  fallbackProfileId: string | null,
): PeriodRule[] {
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const seenDates = new Set<string>();
  const rules: PeriodRule[] = [];

  if (Array.isArray(value)) {
    for (const item of value.slice(0, 30)) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const from = toMonthDay(record.from);
      const profileId = typeof record.profileId === "string" ? record.profileId : "";
      if (!from || !profileIds.has(profileId) || seenDates.has(from)) continue;
      seenDates.add(from);
      rules.push({
        id: typeof record.id === "string" && record.id ? record.id.slice(0, 80) : `rule-${from}`,
        from,
        profileId,
      });
    }
  }

  rules.sort((a, b) => a.from.localeCompare(b.from));

  if (rules.length === 0 && fallbackProfileId && profileIds.has(fallbackProfileId)) {
    const fallbackFrom = toMonthDay(semesterStart) || "01-01";
    return [
      {
        id: `rule-${fallbackFrom}`,
        from: fallbackFrom,
        profileId: fallbackProfileId,
      },
    ];
  }

  return rules;
}

/** Resolve the annual month-day rule that applies on a given date. */
export function periodsForDate(
  timetable: Timetable,
  profiles: PeriodProfile[],
  date: Date,
): Period[] {
  const key = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const rules = [...(timetable.periodRules ?? [])]
    .filter((rule) => isValidMonthDay(rule.from))
    .sort((a, b) => a.from.localeCompare(b.from));

  let selected: PeriodRule | null = null;
  for (const rule of rules) {
    if (rule.from <= key) selected = rule;
    else break;
  }

  // Rules repeat every year: before the first date of the year, the last
  // rule from the previous annual cycle is still in effect.
  if (!selected && rules.length > 0) selected = rules[rules.length - 1];

  const profile = selected
    ? profiles.find((item) => item.id === selected.profileId)
    : timetable.periodProfileId
      ? profiles.find((item) => item.id === timetable.periodProfileId)
      : undefined;
  return profile?.periods ?? timetable.semester.periods;
}

export function profileForDate(
  timetable: Timetable,
  profiles: PeriodProfile[],
  date: Date,
): PeriodProfile | null {
  const periods = periodsForDate(timetable, profiles, date);
  return (
    profiles.find(
      (profile) =>
        profile.periods.length === periods.length &&
        profile.periods.every(
          (period, index) => period.start === periods[index]?.start && period.end === periods[index]?.end,
        ),
    ) ?? null
  );
}
