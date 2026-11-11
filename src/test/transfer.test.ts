import { describe, expect, it } from "vitest";
import { buildIcs } from "../lib/transfer";
import { createDemoSchedule } from "../lib/factory";
import { normalizeSchedule } from "../lib/storage";

describe("calendar export", () => {
  it("creates one calendar event per active session and escapes fields", () => {
    const data = createDemoSchedule(new Date(2026, 10, 12));
    data.courses[0].location = "教一 401, 东侧";
    const { content, count } = buildIcs(data);
    expect(count).toBeGreaterThan(20);
    expect(content).toContain("BEGIN:VCALENDAR\r\n");
    expect(content).toContain("SUMMARY:高等数学 A（上）");
    expect(content).toContain("LOCATION:教一 401\\, 东侧");
    expect(content).toContain("DTSTART:20260907T080000");
    expect(content).not.toContain("\n\n");
  });
});

describe("import normalization", () => {
  it("accepts an exported envelope and strips demo flag", () => {
    const data = createDemoSchedule(new Date(2026, 10, 12));
    const normalized = normalizeSchedule({ data }, false);
    expect(normalized?.courses).toHaveLength(8);
    expect(normalized?.isDemo).toBe(false);
    expect(normalized?.semester.startDate).toBe(data.semester.startDate);
  });

  it("drops invalid slots and invalid courses", () => {
    const normalized = normalizeSchedule(
      {
        semester: { name: "测试", startDate: "2026-09-07", totalWeeks: 16 },
        courses: [
          { id: "ok", name: "好课", slots: [{ day: 1, start: 1, end: 2 }] },
          { id: "bad", name: "", slots: [{ day: 1, start: 1, end: 2 }] },
          { id: "no-slots", name: "空课", slots: [] },
        ],
      },
      false,
    );
    expect(normalized?.courses.map((course) => course.id)).toEqual(["ok"]);
  });
});
