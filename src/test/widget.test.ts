import { describe, expect, it } from "vitest";
import { createDemoSchedule } from "../lib/factory";
import { buildWidgetPayload } from "../lib/widget";

describe("Android widget payload", () => {
  it("provides two weeks of agenda starting today", () => {
    const data = createDemoSchedule(new Date(2026, 10, 12));
    const payload = buildWidgetPayload(data, true, new Date(2026, 10, 12, 9, 0));
    expect(payload.days).toHaveLength(14);
    expect(payload.today).toBe("2026-11-12");
    expect(payload.timetableName).toBe("示例课表");
    expect(payload.days[0].classes.length).toBeGreaterThan(0);
    expect(payload.days[0].classes[0].start).toMatch(/^\d{2}:\d{2}$/);
  });
});
