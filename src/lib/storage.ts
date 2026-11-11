import type {
  Course,
  CourseSlot,
  Period,
  Preferences,
  ScheduleData,
  Semester,
  ToneId,
  WeekPattern,
} from "../types";
import { COURSE_TONES } from "../types";
import {
  dateKey,
  timeToMinutes,
  getDefaultStartDate,
  getTermName,
  parseDateKey,
  startOfWeekMonday,
} from "./date";
import {
  DEFAULT_TOTAL_WEEKS,
  createBlankSchedule,
  createDemoSchedule,
  createPeriods,
  uid,
} from "./factory";

export const DATA_KEY = "kexu:data:v1";
export const PREFS_KEY = "kexu:prefs:v1";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const PATTERNS: WeekPattern[] = ["all", "odd", "even"];
const TONE_IDS = new Set<ToneId>(COURSE_TONES.map((tone) => tone.id));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max = 200, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max);
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function int(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizePattern(value: unknown): WeekPattern {
  return PATTERNS.includes(value as WeekPattern) ? (value as WeekPattern) : "all";
}

function normalizePeriods(value: unknown): Period[] {
  if (!Array.isArray(value) || value.length < 6) return createPeriods(12);
  const periods = value.slice(0, 14).map((item, index): Period => {
    const object = isRecord(item) ? item : {};
    const start = typeof object.start === "string" && TIME_RE.test(object.start)
      ? object.start
      : createPeriods(index + 1)[index]?.start ?? "08:00";
    let end = typeof object.end === "string" && TIME_RE.test(object.end)
      ? object.end
      : createPeriods(index + 1)[index]?.end ?? "08:45";
    if (timeToMinutes(end) <= timeToMinutes(start)) {
      const total = timeToMinutes(start) + 45;
      end = `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    }
    return { index: index + 1, start, end };
  });
  while (periods.length < 6) {
    const previous = periods[periods.length - 1];
    const start = previous?.end ?? "08:00";
    periods.push({ index: periods.length + 1, start, end: start });
  }
  return periods;
}

function normalizeSemester(value: unknown): Semester {
  const object = isRecord(value) ? value : {};
  const rawDate = text(object.startDate, 20);
  const parsed = rawDate ? parseDateKey(rawDate) : parseDateKey(getDefaultStartDate());
  const monday = startOfWeekMonday(parsed);
  const periods = normalizePeriods(object.periods);
  return {
    name: text(object.name, 60, getTermName()) || getTermName(),
    startDate: dateKey(monday),
    totalWeeks: int(object.totalWeeks, 1, 30, DEFAULT_TOTAL_WEEKS),
    showWeekends: bool(object.showWeekends, true),
    periods,
  };
}

function normalizeSlot(value: unknown, semester: Semester): CourseSlot | null {
  if (!isRecord(value)) return null;
  const day = int(value.day, 1, 7, 1);
  const start = int(value.start, 1, semester.periods.length, 1);
  const end = int(value.end, start, semester.periods.length, start);
  const weekStart = int(value.weekStart, 1, semester.totalWeeks, 1);
  const weekEnd = int(value.weekEnd, weekStart, semester.totalWeeks, semester.totalWeeks);
  return {
    id: text(value.id, 80) || uid("slot"),
    day,
    start,
    end,
    weekStart,
    weekEnd,
    pattern: normalizePattern(value.pattern),
  };
}

function normalizeCourse(value: unknown, semester: Semester, index: number): Course | null {
  if (!isRecord(value)) return null;
  const name = text(value.name, 80);
  if (!name) return null;
  const rawSlots = Array.isArray(value.slots) ? value.slots.slice(0, 10) : [];
  const seenSlotIds = new Set<string>();
  const slots: CourseSlot[] = [];
  for (const rawSlot of rawSlots) {
    const slot = normalizeSlot(rawSlot, semester);
    if (!slot || seenSlotIds.has(slot.id)) continue;
    seenSlotIds.add(slot.id);
    slots.push(slot);
  }
  if (slots.length === 0) return null;
  const toneValue = text(value.tone, 20) as ToneId;
  const now = new Date().toISOString();
  return {
    id: text(value.id, 80) || uid(`course-${index + 1}`),
    name,
    teacher: text(value.teacher, 40),
    location: text(value.location, 60),
    tone: TONE_IDS.has(toneValue) ? toneValue : COURSE_TONES[index % COURSE_TONES.length].id,
    note: text(value.note, 500),
    slots,
    createdAt: text(value.createdAt, 40) || now,
    updatedAt: text(value.updatedAt, 40) || now,
  };
}

export function normalizeSchedule(raw: unknown, preserveDemo = true): ScheduleData | null {
  let candidate = raw;
  if (isRecord(raw) && "data" in raw) candidate = raw.data;
  if (!isRecord(candidate)) return null;
  const semester = normalizeSemester(candidate.semester);
  if (!Array.isArray(candidate.courses)) return null;

  const courses: Course[] = [];
  const courseIds = new Set<string>();
  candidate.courses.slice(0, 500).forEach((item, index) => {
    const course = normalizeCourse(item, semester, index);
    if (!course || courseIds.has(course.id)) return;
    courseIds.add(course.id);
    courses.push(course);
  });

  return {
    version: 1,
    semester,
    courses,
    isDemo: preserveDemo ? bool(candidate.isDemo, false) : false,
    updatedAt: text(candidate.updatedAt, 40) || new Date().toISOString(),
  };
}

export function loadSchedule(): ScheduleData {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return createDemoSchedule();
    const parsed = normalizeSchedule(JSON.parse(raw), true);
    return parsed ?? createDemoSchedule();
  } catch {
    return createDemoSchedule();
  }
}

export function saveSchedule(data: ScheduleData): boolean {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadPreferences(): Preferences {
  const fallback: Preferences = {
    theme:
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light",
    view:
      typeof window !== "undefined" && window.innerWidth < 820 ? "day" : "week",
  };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      theme: parsed.theme === "dark" ? "dark" : parsed.theme === "light" ? "light" : fallback.theme,
      view: parsed.view === "day" ? "day" : parsed.view === "week" ? "week" : fallback.view,
    };
  } catch {
    return fallback;
  }
}

export function savePreferences(prefs: Preferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Preferences are non-critical.
  }
}

export function resetAllStorage(): void {
  try {
    localStorage.removeItem(DATA_KEY);
    localStorage.removeItem(PREFS_KEY);
  } catch {
    // Ignore storage access failures.
  }
}

export function makeBlankData(): ScheduleData {
  return createBlankSchedule();
}
