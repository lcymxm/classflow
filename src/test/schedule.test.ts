import { describe, expect, it } from "vitest";
import { createDemoSchedule } from "../lib/factory";
import {
  buildSessions,
  getNextSession,
  getPeriodNowProgress,
  getUsedMaxPeriod,
  getWeekStats,
  isSlotActiveInWeek,
  layoutSessionsForDay,
  mergeCourseSlots,
  weeksForSlot,
  compressWeeks,
  formatWeeks,
} from "../lib/schedule";
import { dateKey, getWeekDates } from "../lib/date";
import type { Course, CourseSlot, Session } from "../types";

const slot = (overrides: Partial<CourseSlot> = {}): CourseSlot => ({
  id: "slot-a",
  day: 1,
  start: 1,
  end: 2,
  weekStart: 1,
  weekEnd: 16,
  pattern: "all",
  ...overrides,
});

const course = (name: string, slots: CourseSlot[]): Course => ({
  id: `course-${name}`,
  name,
  teacher: "",
  location: "",
  tone: "clay",
  note: "",
  slots,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
});

const session = (id: string, start: number, end: number): Session => ({
  id,
  course: course(id, []),
  slot: slot({ start, end }),
  day: 1,
  start,
  end,
});

describe("schedule rules", () => {
  it("handles week ranges and parity", () => {
    expect(isSlotActiveInWeek(slot({ pattern: "odd", weekStart: 3, weekEnd: 15 }), 3)).toBe(true);
    expect(isSlotActiveInWeek(slot({ pattern: "odd", weekStart: 3, weekEnd: 15 }), 4)).toBe(false);
    expect(isSlotActiveInWeek(slot({ pattern: "even" }), 8)).toBe(true);
    expect(isSlotActiveInWeek(slot({ weekEnd: 8 }), 9)).toBe(false);
  });

  it("lays overlapping courses side by side and leaves back-to-back classes full width", () => {
    const overlap = layoutSessionsForDay([
      session("a", 1, 2),
      session("b", 2, 3),
    ]);
    expect(overlap.every((item) => item.columns === 2)).toBe(true);
    expect(new Set(overlap.map((item) => item.column)).size).toBe(2);

    const separate = layoutSessionsForDay([
      session("c", 1, 2),
      session("d", 3, 4),
    ]);
    expect(separate.every((item) => item.columns === 1)).toBe(true);
  });

  it("builds only sessions active in a given week", () => {
    const data = createDemoSchedule(new Date(2026, 10, 12));
    const timetable = data.timetables[0];
    const weekNine = buildSessions(timetable.courses, 9);
    const weekTen = buildSessions(timetable.courses, 10);
    expect(weekTen.length).toBeGreaterThan(0);
    expect(weekTen.some((item) => item.course.id === "demo-physics-lab")).toBe(false);
    expect(weekTen.some((item) => item.course.id === "demo-policy")).toBe(true);
    expect(weekNine.some((item) => item.course.id === "demo-physics-lab")).toBe(true);
  });

  it("computes weekly stats", () => {
    const data = createDemoSchedule(new Date(2026, 10, 12));
    const timetable = data.timetables[0];
    const sessions = buildSessions(timetable.courses, 10);
    const stats = getWeekStats(sessions, timetable.semester.periods);
    expect(stats.courseCount).toBe(7);
    expect(stats.sessionCount).toBe(10);
    expect(stats.minutes).toBeGreaterThan(0);
    expect(stats.busiestDay).toBe(1);
  });

  it("supports explicit, non-contiguous course weeks", () => {
    const custom = slot({ weekStart: 1, weekEnd: 9, weeks: [1, 2, 3, 5, 7, 8, 9] });
    expect(weeksForSlot(custom)).toEqual([1, 2, 3, 5, 7, 8, 9]);
    expect(isSlotActiveInWeek(custom, 5)).toBe(true);
    expect(isSlotActiveInWeek(custom, 6)).toBe(false);
    expect(compressWeeks([1, 2, 3, 5, 7, 8, 9])).toBe("1–3、5、7–9");
    expect(formatWeeks(custom)).toBe("第 1–3、5、7–9 周");
  });

  it("merges repeated time slots for the same course", () => {
    const base = slot({ id: "base", weeks: [1, 2, 3] });
    const addition = slot({ id: "added", weeks: [3, 4, 5] });
    const merged = mergeCourseSlots([base], [addition]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("base");
    expect(weeksForSlot(merged[0])).toEqual([1, 2, 3, 4, 5]);
  });

  it("formats week descriptions and finds the next class", () => {
    expect(formatWeeks(slot({ weekStart: 1, weekEnd: 16, pattern: "odd" }))).toBe(
      "第 1–16 周 · 单周",
    );
    const data = createDemoSchedule(new Date(2026, 10, 12));
    const timetable = data.timetables[0];
    const sessions = buildSessions(timetable.courses, 10);
    const dates = getWeekDates(timetable.semester.startDate, 10);
    const now = new Date(2026, 10, 12, 12, 0);
    const next = getNextSession(sessions, dates, timetable.semester.periods, now);
    expect(next?.session.course.name).toBe("数据结构与算法");
    expect(next ? dateKey(next.date) : "").toBe("2026-11-12");
  });

  it("finds the current period and max used period", () => {
    const data = createDemoSchedule(new Date(2026, 10, 12));
    const timetable = data.timetables[0];
    expect(getPeriodNowProgress(timetable.semester.periods, new Date(2026, 10, 12, 8, 10))).toMatchObject({
      period: 1,
    });
    expect(getUsedMaxPeriod(timetable.courses)).toBe(10);
  });
});
