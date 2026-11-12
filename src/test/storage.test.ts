import { describe, expect, it } from "vitest";
import { normalizeSchedule } from "../lib/storage";
import { createDemoSchedule, createInitialData } from "../lib/factory";

describe("v2 schedule normalization", () => {
  it("keeps every timetable, profile and event", () => {
    const data = createDemoSchedule(new Date(2026, 10, 12));
    data.timetables[0].events.push({
      id: "event-1",
      title: "交作业",
      date: "2026-11-13",
      allDay: true,
      start: "09:00",
      end: "10:00",
      note: "",
      tone: "teal",
      createdAt: "",
      updatedAt: "",
    });
    data.timetables[0].wallpaper = { preset: "custom", dataUrl: "data:image/jpeg;base64,abc", dim: 30 };
    const normalized = normalizeSchedule({ data });
    expect(normalized?.timetables).toHaveLength(1);
    expect(normalized?.timetables[0].events[0].title).toBe("交作业");
    expect(normalized?.timetables[0].wallpaper.preset).toBe("custom");
    expect(normalized?.periodProfiles).toHaveLength(2);
  });

  it("migrates a real v1 schedule and discards the old demo", () => {
    const data = createDemoSchedule(new Date(2026, 10, 12));
    const timetable = data.timetables[0];
    const legacyReal = {
      semester: timetable.semester,
      courses: timetable.courses,
      isDemo: false,
      updatedAt: timetable.updatedAt,
    };
    const migrated = normalizeSchedule(legacyReal);
    expect(migrated?.timetables[0].courses).toHaveLength(8);
    expect(migrated?.periodProfiles).toHaveLength(2);
    expect(migrated?.timetables[0].semester.startDate).toBe(timetable.semester.startDate);

    const demo = normalizeSchedule({ ...legacyReal, isDemo: true });
    expect(demo?.timetables[0].courses).toHaveLength(0);
  });

  it("normalizes explicit week selections", () => {
    const data = createDemoSchedule(new Date(2026, 10, 12));
    data.timetables[0].courses[0].slots[0].weeks = [1, 2, 3, 7];
    data.timetables[0].courses[0].slots[0].weekStart = 1;
    data.timetables[0].courses[0].slots[0].weekEnd = 7;
    const normalized = normalizeSchedule({ data });
    expect(normalized?.timetables[0].courses[0].slots[0].weeks).toEqual([1, 2, 3, 7]);
    expect(normalized?.timetables[0].courses[0].slots[0].weekEnd).toBe(7);
  });

  it("keeps at least two period profiles and one timetable", () => {
    const normalized = normalizeSchedule({
      version: 2,
      activeTimetableId: "missing",
      periodProfiles: [{ id: "only", name: "唯一方案", periods: [] }],
      timetables: [],
    });
    expect(normalized?.periodProfiles.length).toBeGreaterThanOrEqual(2);
    expect(normalized?.timetables).toHaveLength(1);
    expect(normalized?.activeTimetableId).toBe(normalized?.timetables[0].id);
    expect(createInitialData().periodProfiles).toHaveLength(2);
  });
});
