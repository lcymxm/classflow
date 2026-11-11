import type {
  Course,
  CourseSlot,
  LaidOutSession,
  NextSession,
  Period,
  Session,
  WeekPattern,
  WeekStats,
} from "../types";
import {
  getDateForSlot,
  timeToMinutes,
  WEEKDAYS,
  weekdayLabel,
} from "./date";

export const PATTERN_LABELS: Record<WeekPattern, string> = {
  all: "每周",
  odd: "单周",
  even: "双周",
};

export function isSlotActiveInWeek(slot: CourseSlot, week: number): boolean {
  if (week < slot.weekStart || week > slot.weekEnd) return false;
  if (slot.pattern === "odd") return week % 2 === 1;
  if (slot.pattern === "even") return week % 2 === 0;
  return true;
}

export function buildSessions(courses: Course[], week: number): Session[] {
  const sessions: Session[] = [];
  for (const course of courses) {
    for (const slot of course.slots) {
      if (!isSlotActiveInWeek(slot, week)) continue;
      sessions.push({
        id: `${course.id}:${slot.id}:${week}`,
        course,
        slot,
        day: slot.day,
        start: slot.start,
        end: slot.end,
      });
    }
  }
  return sessions.sort((a, b) => a.day - b.day || a.start - b.start || a.end - b.end);
}

export function sessionsForDay(sessions: Session[], day: number): Session[] {
  return sessions.filter((session) => session.day === day);
}

/**
 * Greedy interval partitioning for overlapping courses.
 * Back-to-back classes do not count as overlap.
 */
export function layoutSessionsForDay(sessions: Session[]): LaidOutSession[] {
  const sorted = [...sessions].sort(
    (a, b) => a.start - b.start || a.end - b.end || a.course.name.localeCompare(b.course.name, "zh-CN"),
  );

  const clusters: Session[][] = [];
  let current: Session[] = [];
  let clusterEnd = -Infinity;

  for (const session of sorted) {
    if (current.length > 0 && session.start > clusterEnd) {
      clusters.push(current);
      current = [];
      clusterEnd = -Infinity;
    }
    current.push(session);
    clusterEnd = Math.max(clusterEnd, session.end);
  }
  if (current.length > 0) clusters.push(current);

  return clusters.flatMap((cluster) => {
    const columnEnds: number[] = [];
    const assigned = cluster.map((session) => {
      let column = columnEnds.findIndex((end) => end < session.start);
      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(session.end);
      } else {
        columnEnds[column] = session.end;
      }
      return { ...session, column, columns: 0 };
    });
    return assigned.map((session) => ({ ...session, columns: columnEnds.length }));
  });
}

export function groupSessionsByDay(sessions: Session[]): Record<number, LaidOutSession[]> {
  const result: Record<number, LaidOutSession[]> = {};
  for (let day = 1; day <= 7; day += 1) {
    result[day] = layoutSessionsForDay(sessionsForDay(sessions, day));
  }
  return result;
}

export function weeklyCourseCount(sessions: Session[]): number {
  return new Set(sessions.map((session) => session.course.id)).size;
}

export function periodDuration(periods: Period[], start: number, end: number): number {
  let total = 0;
  for (let index = start; index <= end; index += 1) {
    const period = periods[index - 1];
    if (!period) continue;
    total += Math.max(0, timeToMinutes(period.end) - timeToMinutes(period.start));
  }
  return total;
}

export function sessionMinutes(periods: Period[], session: Session): number {
  return periodDuration(periods, session.start, session.end);
}

export function getWeekStats(sessions: Session[], periods: Period[]): WeekStats {
  const counts = new Map<number, number>();
  for (const session of sessions) {
    counts.set(session.day, (counts.get(session.day) ?? 0) + 1);
  }
  let busiestDay: number | null = null;
  let busiestCount = 0;
  for (const [day, count] of counts.entries()) {
    if (count > busiestCount) {
      busiestCount = count;
      busiestDay = day;
    }
  }
  return {
    courseCount: weeklyCourseCount(sessions),
    sessionCount: sessions.length,
    minutes: sessions.reduce((total, session) => total + sessionMinutes(periods, session), 0),
    busiestDay,
    busiestCount,
  };
}

export function formatWeeks(slot: CourseSlot): string {
  const range =
    slot.weekStart === slot.weekEnd
      ? `第 ${slot.weekStart} 周`
      : `第 ${slot.weekStart}–${slot.weekEnd} 周`;
  return slot.pattern === "all" ? range : `${range} · ${PATTERN_LABELS[slot.pattern]}`;
}

export function formatSlotSchedule(slot: CourseSlot, periods: Period[]): string {
  const startTime = periods[slot.start - 1]?.start ?? "";
  const endTime = periods[slot.end - 1]?.end ?? "";
  return `${weekdayLabel(slot.day)} · 第 ${slot.start}${
    slot.end !== slot.start ? `–${slot.end}` : ""
  } 节${startTime ? ` · ${startTime}–${endTime}` : ""} · ${formatWeeks(slot)}`;
}

export function formatSlotShort(slot: CourseSlot): string {
  return `${weekdayLabel(slot.day)} ${slot.start}${
    slot.end !== slot.start ? `–${slot.end}` : ""
  } 节`;
}

export function formatPeriodLabel(start: number, end: number): string {
  return start === end ? `第 ${start} 节` : `第 ${start}–${end} 节`;
}

export function getUsedMaxPeriod(courses: Course[]): number {
  let max = 0;
  for (const course of courses) {
    for (const slot of course.slots) max = Math.max(max, slot.end);
  }
  return max;
}

export function courseWeeklyMinutes(course: Course, periods: Period[]): number {
  return course.slots.reduce(
    (total, slot) => total + periodDuration(periods, slot.start, slot.end),
    0,
  );
}

export function getNextSession(
  sessions: Session[],
  weekDates: Date[],
  periods: Period[],
  now: Date,
): NextSession | null {
  const candidates: NextSession[] = [];
  for (const session of sessions) {
    const date = weekDates[session.day - 1] ?? getDateForSlot("", 1, session.day);
    const startPeriod = periods[session.start - 1];
    const endPeriod = periods[session.end - 1];
    if (!startPeriod || !endPeriod) continue;
    const start = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      Math.floor(timeToMinutes(startPeriod.start) / 60),
      timeToMinutes(startPeriod.start) % 60,
    );
    const end = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      Math.floor(timeToMinutes(endPeriod.end) / 60),
      timeToMinutes(endPeriod.end) % 60,
    );
    if (now >= end) continue;
    candidates.push({
      session,
      date,
      state: now >= start ? "ongoing" : "upcoming",
    });
  }

  candidates.sort((a, b) => {
    if (a.state !== b.state) return a.state === "ongoing" ? -1 : 1;
    return a.date.getTime() - b.date.getTime() || a.session.start - b.session.start;
  });
  return candidates[0] ?? null;
}

export function isSessionNow(
  session: Session,
  periods: Period[],
  date: Date,
  now: Date,
): boolean {
  if (session.day !== ((date.getDay() + 6) % 7) + 1) return false;
  const startPeriod = periods[session.start - 1];
  const endPeriod = periods[session.end - 1];
  if (!startPeriod || !endPeriod) return false;
  const [startHour, startMinute] = startPeriod.start.split(":").map(Number);
  const [endHour, endMinute] = endPeriod.end.split(":").map(Number);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMinute);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHour, endMinute);
  return now >= start && now < end;
}

export function getPeriodNowProgress(
  periods: Period[],
  now: Date,
): { period: number; fraction: number } | null {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (const period of periods) {
    const start = timeToMinutes(period.start);
    const end = timeToMinutes(period.end);
    if (nowMinutes >= start && nowMinutes <= end) {
      return {
        period: period.index,
        fraction: end === start ? 0 : (nowMinutes - start) / (end - start),
      };
    }
  }
  return null;
}

export function daysForSemester(showWeekends: boolean): number[] {
  return showWeekends ? WEEKDAYS.map((day) => day.index) : [1, 2, 3, 4, 5];
}

export function sortCoursesByDay(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => {
    const aSlot = a.slots[0];
    const bSlot = b.slots[0];
    if (!aSlot || !bSlot) return a.name.localeCompare(b.name, "zh-CN");
    return aSlot.day - bSlot.day || aSlot.start - bSlot.start;
  });
}
