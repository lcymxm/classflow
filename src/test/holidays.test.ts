import { describe, expect, it } from "vitest";
import {
  filterHolidaySessions,
  getCalendarInfo,
  getVisibleDays,
} from "../lib/holidays";
import { getWeekDates } from "../lib/date";
import type { Session } from "../types";

const session = (day: number): Session => ({
  id: `session-${day}`,
  course: {
    id: "course",
    name: "测试课",
    teacher: "",
    location: "",
    tone: "clay",
    note: "",
    slots: [],
    createdAt: "",
    updatedAt: "",
  },
  slot: {
    id: "slot",
    day,
    start: 1,
    end: 2,
    weekStart: 1,
    weekEnd: 20,
    pattern: "all",
  },
  day,
  start: 1,
  end: 2,
});

describe("Chinese holiday calendar", () => {
  it("recognises 2026 holidays and make-up workdays", () => {
    expect(getCalendarInfo("2026-10-01")).toMatchObject({ kind: "holiday", name: "国庆节" });
    expect(getCalendarInfo("2026-09-20")).toMatchObject({ kind: "workday", short: "班" });
    expect(getCalendarInfo("2026-11-12")).toBeNull();
  });

  it("recognises the 2027 Spring Festival and May Day", () => {
    expect(getCalendarInfo("2027-02-06")).toMatchObject({ kind: "holiday", name: "春节" });
    expect(getCalendarInfo("2027-05-08")).toMatchObject({ kind: "workday" });
  });

  it("hides classes on holidays and keeps make-up weekends visible", () => {
    const dates = getWeekDates("2026-09-07", 4);
    const sessions = [session(1), session(4), session(5)];
    expect(filterHolidaySessions(sessions, dates, true).map((item) => item.day)).toEqual([1]);
    expect(filterHolidaySessions(sessions, dates, false)).toHaveLength(3);

    const workdayWeek = getWeekDates("2026-09-07", 2);
    expect(getVisibleDays(false, workdayWeek, true)).toEqual([1, 2, 3, 4, 5, 7]);
    expect(getVisibleDays(false, workdayWeek, false)).toEqual([1, 2, 3, 4, 5]);
  });
});
