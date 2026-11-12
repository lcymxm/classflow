import type {
  Course,
  CourseSlot,
  Period,
  PeriodProfile,
  Preferences,
  ScheduleData,
  ScheduleEvent,
  Semester,
  Timetable,
  ToneId,
  Wallpaper,
  WallpaperPreset,
  WeekPattern,
} from "../types";
import { COURSE_TONES } from "../types";
import {
  dateKey,
  getDefaultStartDate,
  getTermName,
  parseDateKey,
  startOfWeekMonday,
  timeToMinutes,
} from "./date";
import {
  DEFAULT_TOTAL_WEEKS,
  STANDARD_PROFILE_ID,
  createDefaultPeriodProfiles,
  createDefaultWallpaper,
  createInitialData,
  createPeriods,
  uid,
} from "./factory";

export const DATA_KEY = "kexu:data:v2";
export const LEGACY_DATA_KEY = "kexu:data:v1";
export const PREFS_KEY = "kexu:prefs:v1";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PATTERNS: WeekPattern[] = ["all", "odd", "even"];
const TONE_IDS = new Set<ToneId>(COURSE_TONES.map((tone) => tone.id));
const PRESETS = new Set<WallpaperPreset>(["paper", "sage", "dawn", "dusk"]);

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
    const start =
      typeof object.start === "string" && TIME_RE.test(object.start)
        ? object.start
        : createPeriods(index + 1)[index]?.start ?? "08:00";
    let end =
      typeof object.end === "string" && TIME_RE.test(object.end)
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

function normalizeSemester(value: unknown, fallbackPeriods = createPeriods(12)): Semester {
  const object = isRecord(value) ? value : {};
  const rawDate = text(object.startDate, 20);
  const parsed = rawDate ? parseDateKey(rawDate) : parseDateKey(getDefaultStartDate());
  const monday = startOfWeekMonday(parsed);
  return {
    name: text(object.name, 60, getTermName()) || getTermName(),
    startDate: dateKey(monday),
    totalWeeks: int(object.totalWeeks, 1, 30, DEFAULT_TOTAL_WEEKS),
    showWeekends: bool(object.showWeekends, true),
    periods: object.periods ? normalizePeriods(object.periods) : fallbackPeriods.map((period) => ({ ...period })),
  };
}

function normalizeWallpaper(value: unknown): Wallpaper {
  const object = isRecord(value) ? value : {};
  const rawPreset = object.preset;
  const preset = PRESETS.has(rawPreset as WallpaperPreset)
    ? (rawPreset as WallpaperPreset)
    : "paper";
  const dataUrl = typeof object.dataUrl === "string" && object.dataUrl.startsWith("data:image/")
    ? object.dataUrl.slice(0, 2_500_000)
    : "";
  const dim = int(object.dim, 0, 80, 16);
  const resolved = dataUrl ? (rawPreset === "custom" || preset === "paper" ? "custom" : preset) : preset;
  return {
    preset: resolved,
    dataUrl: resolved === "custom" ? dataUrl : "",
    dim,
  };
}

function normalizeSlot(value: unknown, semester: Semester): CourseSlot | null {
  if (!isRecord(value)) return null;
  const day = int(value.day, 1, 7, 1);
  const start = int(value.start, 1, semester.periods.length, 1);
  const end = int(value.end, start, semester.periods.length, start);
  let weekStart = int(value.weekStart, 1, semester.totalWeeks, 1);
  let weekEnd = int(value.weekEnd, weekStart, semester.totalWeeks, semester.totalWeeks);
  const explicitWeeks = Array.isArray(value.weeks)
    ? [...new Set(value.weeks.map((week) => int(week, 1, semester.totalWeeks, 0)).filter((week) => week > 0))].sort(
        (a, b) => a - b,
      )
    : [];
  if (explicitWeeks.length > 0) {
    weekStart = explicitWeeks[0];
    weekEnd = explicitWeeks[explicitWeeks.length - 1];
  }
  return {
    id: text(value.id, 80) || uid("slot"),
    day,
    start,
    end,
    weekStart,
    weekEnd,
    pattern: explicitWeeks.length > 0 ? "all" : normalizePattern(value.pattern),
    ...(explicitWeeks.length > 0 ? { weeks: explicitWeeks } : {}),
  };
}

function normalizeCourse(value: unknown, semester: Semester, index: number): Course | null {
  if (!isRecord(value)) return null;
  const name = text(value.name, 80);
  if (!name) return null;
  const rawSlots = Array.isArray(value.slots) ? value.slots.slice(0, 20) : [];
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

function normalizeEvent(value: unknown, index: number): ScheduleEvent | null {
  if (!isRecord(value)) return null;
  const title = text(value.title, 80);
  if (!title) return null;
  const rawDate = text(value.date, 20);
  if (!DATE_RE.test(rawDate) || Number.isNaN(parseDateKey(rawDate).getTime())) return null;
  const now = new Date().toISOString();
  const toneValue = text(value.tone, 20) as ToneId;
  let start = typeof value.start === "string" && TIME_RE.test(value.start) ? value.start : "09:00";
  let end = typeof value.end === "string" && TIME_RE.test(value.end) ? value.end : "10:00";
  if (timeToMinutes(end) <= timeToMinutes(start)) {
    const total = timeToMinutes(start) + 60;
    end = `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    start = value.allDay === true ? start : start;
  }
  return {
    id: text(value.id, 80) || uid(`event-${index + 1}`),
    title,
    date: rawDate,
    allDay: bool(value.allDay, false),
    start,
    end,
    note: text(value.note, 500),
    tone: TONE_IDS.has(toneValue) ? toneValue : COURSE_TONES[index % COURSE_TONES.length].id,
    createdAt: text(value.createdAt, 40) || now,
    updatedAt: text(value.updatedAt, 40) || now,
  };
}

function normalizeProfile(value: unknown, index: number): PeriodProfile {
  const object = isRecord(value) ? value : {};
  return {
    id: text(object.id, 80) || uid(`profile-${index + 1}`),
    name: text(object.name, 40) || `作息方案 ${index + 1}`,
    periods: normalizePeriods(object.periods),
  };
}

function normalizeProfiles(value: unknown): PeriodProfile[] {
  const raw = Array.isArray(value) ? value.slice(0, 10) : [];
  const profiles: PeriodProfile[] = [];
  const ids = new Set<string>();
  raw.forEach((item, index) => {
    const profile = normalizeProfile(item, index);
    if (ids.has(profile.id)) return;
    ids.add(profile.id);
    profiles.push(profile);
  });

  const defaults = createDefaultPeriodProfiles();
  for (const fallback of defaults) {
    if (profiles.length >= 2) break;
    if (profiles.some((profile) => profile.id === fallback.id)) continue;
    profiles.push({
      ...fallback,
      id: ids.has(fallback.id) ? uid("profile") : fallback.id,
      periods: fallback.periods.map((period) => ({ ...period })),
    });
    ids.add(profiles[profiles.length - 1].id);
  }
  if (profiles.length === 0) {
    return createDefaultPeriodProfiles();
  }
  return profiles;
}

function normalizeTimetable(
  value: unknown,
  profiles: PeriodProfile[],
  index: number,
): Timetable | null {
  if (!isRecord(value)) return null;
  const profileId = text(value.periodProfileId, 80);
  const profile = profiles.find((item) => item.id === profileId);
  const semester = normalizeSemester(value.semester, profile?.periods ?? profiles[0].periods);
  const courses: Course[] = [];
  const courseIds = new Set<string>();
  if (Array.isArray(value.courses)) {
    value.courses.slice(0, 500).forEach((item, courseIndex) => {
      const course = normalizeCourse(item, semester, courseIndex);
      if (!course || courseIds.has(course.id)) return;
      courseIds.add(course.id);
      courses.push(course);
    });
  }

  const events: ScheduleEvent[] = [];
  const eventIds = new Set<string>();
  if (Array.isArray(value.events)) {
    value.events.slice(0, 500).forEach((item, eventIndex) => {
      const event = normalizeEvent(item, eventIndex);
      if (!event || eventIds.has(event.id)) return;
      eventIds.add(event.id);
      events.push(event);
    });
  }

  const now = new Date().toISOString();
  return {
    id: text(value.id, 80) || uid(`timetable-${index + 1}`),
    name: text(value.name, 60) || (index === 0 ? "我的课表" : `课表 ${index + 1}`),
    semester,
    periodProfileId: profile?.id ?? null,
    courses,
    events,
    wallpaper: normalizeWallpaper(value.wallpaper),
    createdAt: text(value.createdAt, 40) || now,
    updatedAt: text(value.updatedAt, 40) || now,
  };
}

function normalizeActiveId(value: unknown, timetables: Timetable[]): string {
  const id = text(value, 80);
  return timetables.some((timetable) => timetable.id === id) ? id : timetables[0].id;
}

function normalizeLegacyTimetable(candidate: Record<string, unknown>): Timetable | null {
  if (!isRecord(candidate.semester) || !Array.isArray(candidate.courses)) return null;
  const profiles = createDefaultPeriodProfiles();
  const oldPeriods = normalizePeriods(candidate.semester.periods);
  const standard = profiles.find((profile) => profile.id === STANDARD_PROFILE_ID);
  if (standard) {
    standard.periods = oldPeriods;
  }
  const semester = normalizeSemester(candidate.semester, oldPeriods);
  const courses: Course[] = [];
  const ids = new Set<string>();
  candidate.courses.slice(0, 500).forEach((item, index) => {
    const course = normalizeCourse(item, semester, index);
    if (!course || ids.has(course.id)) return;
    ids.add(course.id);
    courses.push(course);
  });
  const now = new Date().toISOString();
  return {
    id: uid("timetable"),
    name: "我的课表",
    semester,
    periodProfileId: standard?.id ?? profiles[0].id,
    courses,
    events: [],
    wallpaper: createDefaultWallpaper(),
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeSchedule(raw: unknown): ScheduleData | null {
  let candidate = raw;
  if (isRecord(raw) && "data" in raw) candidate = raw.data;
  if (!isRecord(candidate)) return null;

  if (Array.isArray(candidate.timetables)) {
    const profiles = normalizeProfiles(candidate.periodProfiles);
    const timetables: Timetable[] = [];
    const ids = new Set<string>();
    candidate.timetables.slice(0, 20).forEach((item, index) => {
      const timetable = normalizeTimetable(item, profiles, index);
      if (!timetable || ids.has(timetable.id)) return;
      ids.add(timetable.id);
      timetables.push(timetable);
    });
    if (timetables.length === 0) return createInitialData();
    return {
      version: 2,
      activeTimetableId: normalizeActiveId(candidate.activeTimetableId, timetables),
      timetables,
      periodProfiles: profiles,
      updatedAt: text(candidate.updatedAt, 40) || new Date().toISOString(),
    };
  }

  // Legacy v1 shape: { semester, courses, isDemo }. The old demo is dropped so
  // updating the app does not resurrect a sample timetable.
  if (candidate.isDemo === true) return createInitialData();
  const timetable = normalizeLegacyTimetable(candidate);
  if (!timetable) return null;
  const profiles = createDefaultPeriodProfiles();
  const standard = profiles.find((profile) => profile.id === STANDARD_PROFILE_ID);
  if (standard) standard.periods = timetable.semester.periods.map((period) => ({ ...period }));
  return {
    version: 2,
    activeTimetableId: timetable.id,
    timetables: [timetable],
    periodProfiles: profiles,
    updatedAt: text(candidate.updatedAt, 40) || new Date().toISOString(),
  };
}

function loadLegacy(): ScheduleData | null {
  try {
    const raw = localStorage.getItem(LEGACY_DATA_KEY);
    if (!raw) return null;
    return normalizeSchedule(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function loadSchedule(): ScheduleData {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) {
      const parsed = normalizeSchedule(JSON.parse(raw));
      if (parsed) return parsed;
    }
  } catch {
    // Fall through to legacy or a fresh workspace.
  }
  return loadLegacy() ?? createInitialData();
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
    autoHolidays: true,
  };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      theme: parsed.theme === "dark" ? "dark" : parsed.theme === "light" ? "light" : fallback.theme,
      view: parsed.view === "day" ? "day" : parsed.view === "week" ? "week" : fallback.view,
      autoHolidays: bool(parsed.autoHolidays, true),
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
    localStorage.removeItem(LEGACY_DATA_KEY);
    localStorage.removeItem(PREFS_KEY);
  } catch {
    // Ignore storage access failures.
  }
}

export function makeBlankData(): ScheduleData {
  return createInitialData();
}
