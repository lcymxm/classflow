import { describe, expect, it } from "vitest";
import { createDemoSchedule } from "../lib/factory";
import { periodsForDate } from "../lib/periods";

describe("date-based period rules", () => {
  it("uses the profile effective for the selected date", () => {
    const data = createDemoSchedule(new Date(2026, 8, 7));
    const timetable = data.timetables[0];
    const [first, second] = data.periodProfiles;
    timetable.periodProfileId = first.id;
    timetable.periodRules = [
      { id: "rule-a", from: "2026-09-07", profileId: first.id },
      { id: "rule-b", from: "2026-11-01", profileId: second.id },
    ];

    expect(periodsForDate(timetable, data.periodProfiles, new Date(2026, 8, 8))[0].start).toBe(
      first.periods[0].start,
    );
    expect(periodsForDate(timetable, data.periodProfiles, new Date(2026, 10, 15))[0].start).toBe(
      second.periods[0].start,
    );
  });

  it("falls back to the timetable periods before the first rule", () => {
    const data = createDemoSchedule(new Date(2026, 8, 7));
    const timetable = data.timetables[0];
    const [first, second] = data.periodProfiles;
    timetable.periodProfileId = first.id;
    timetable.periodRules = [
      { id: "rule-b", from: "2026-11-01", profileId: second.id },
    ];

    expect(periodsForDate(timetable, data.periodProfiles, new Date(2026, 8, 8))[0].start).toBe(
      first.periods[0].start,
    );
  });
});
