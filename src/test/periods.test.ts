import { describe, expect, it } from "vitest";
import { createDemoSchedule } from "../lib/factory";
import { normalizePeriodRules, periodsForDate } from "../lib/periods";

describe("annual period rules", () => {
  it("uses the profile effective for the selected date", () => {
    const data = createDemoSchedule(new Date(2026, 8, 7));
    const timetable = data.timetables[0];
    const [first, second] = data.periodProfiles;
    timetable.periodProfileId = first.id;
    timetable.periodRules = [
      { id: "rule-a", from: "09-07", profileId: first.id },
      { id: "rule-b", from: "11-01", profileId: second.id },
    ];

    expect(periodsForDate(timetable, data.periodProfiles, new Date(2026, 8, 8))[0].start).toBe(
      first.periods[0].start,
    );
    expect(periodsForDate(timetable, data.periodProfiles, new Date(2026, 10, 15))[0].start).toBe(
      second.periods[0].start,
    );
  });

  it("wraps a rule list across the new year", () => {
    const data = createDemoSchedule(new Date(2026, 8, 7));
    const timetable = data.timetables[0];
    const [first, second] = data.periodProfiles;
    timetable.periodProfileId = first.id;
    timetable.periodRules = [
      { id: "rule-spring", from: "03-01", profileId: first.id },
      { id: "rule-winter", from: "11-01", profileId: second.id },
    ];

    // January is still in the previous year's winter rule.
    expect(periodsForDate(timetable, data.periodProfiles, new Date(2027, 0, 15))[0].start).toBe(
      second.periods[0].start,
    );
    expect(periodsForDate(timetable, data.periodProfiles, new Date(2027, 3, 1))[0].start).toBe(
      first.periods[0].start,
    );
  });

  it("migrates full dates to month-day rules", () => {
    const data = createDemoSchedule(new Date(2026, 8, 7));
    const [first] = data.periodProfiles;
    const rules = normalizePeriodRules(
      [{ id: "old", from: "2026-09-07", profileId: first.id }],
      data.periodProfiles,
      "2026-09-07",
      first.id,
    );
    expect(rules).toEqual([{ id: "old", from: "09-07", profileId: first.id }]);
  });
});
