import { describe, expect, it } from "vitest";
import { createTemplateCourses, TIMETABLE_TEMPLATES } from "../lib/templates";

describe("timetable templates", () => {
  it("offers blank and several preset timetables", () => {
    expect(TIMETABLE_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    expect(TIMETABLE_TEMPLATES[0].id).toBe("blank");
    expect(createTemplateCourses("blank", 20)).toHaveLength(0);
  });

  it("creates usable courses for each preset", () => {
    for (const template of TIMETABLE_TEMPLATES.filter((item) => item.id !== "blank")) {
      const courses = createTemplateCourses(template.id, 16);
      expect(courses.length).toBeGreaterThan(3);
      expect(courses.every((course) => course.slots.length > 0)).toBe(true);
      expect(courses.every((course) => course.slots.every((slot) => slot.weekEnd <= 16))).toBe(true);
    }
  });
});
