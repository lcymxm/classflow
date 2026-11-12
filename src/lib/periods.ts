import type { Period, PeriodProfile, PeriodRule, Timetable } from "../types";
import { dateKey } from "./date";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

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
      const from = typeof record.from === "string" ? record.from : "";
      const profileId = typeof record.profileId === "string" ? record.profileId : "";
      if (!DATE_KEY.test(from) || !profileIds.has(profileId) || seenDates.has(from)) continue;
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
    return [
      {
        id: `rule-${semesterStart}`,
        from: semesterStart,
        profileId: fallbackProfileId,
      },
    ];
  }

  return rules;
}

export function periodsForDate(
  timetable: Timetable,
  profiles: PeriodProfile[],
  date: Date,
): Period[] {
  const key = dateKey(date);
  const rules = [...(timetable.periodRules ?? [])].sort((a, b) => a.from.localeCompare(b.from));
  let selected: PeriodRule | null = null;
  for (const rule of rules) {
    if (rule.from <= key) selected = rule;
    else break;
  }
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
