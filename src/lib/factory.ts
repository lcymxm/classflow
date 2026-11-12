import type {
  Course,
  CourseSlot,
  Period,
  PeriodProfile,
  ScheduleData,
  ScheduleEvent,
  Semester,
  Timetable,
  ToneId,
  Wallpaper,
  WeekPattern,
} from "../types";
import { COURSE_TONES } from "../types";
import { dateKey, getDefaultStartDate, getTermName, startOfWeekMonday } from "./date";

const BASE_PERIOD_TIMES: Array<[string, string]> = [
  ["08:00", "08:45"],
  ["08:55", "09:40"],
  ["10:00", "10:45"],
  ["10:55", "11:40"],
  ["14:00", "14:45"],
  ["14:55", "15:40"],
  ["16:00", "16:45"],
  ["16:55", "17:40"],
  ["19:00", "19:45"],
  ["19:55", "20:40"],
  ["20:50", "21:35"],
  ["21:45", "22:30"],
];

const SUMMER_PERIOD_TIMES: Array<[string, string]> = [
  ["08:30", "09:15"],
  ["09:25", "10:10"],
  ["10:30", "11:15"],
  ["11:25", "12:10"],
  ["14:30", "15:15"],
  ["15:25", "16:10"],
  ["16:30", "17:15"],
  ["17:25", "18:10"],
  ["19:30", "20:15"],
  ["20:25", "21:10"],
  ["21:20", "22:05"],
  ["22:15", "23:00"],
];

export const MIN_PERIODS = 6;
export const MAX_PERIODS = 14;
export const MAX_TIMETABLES = 20;
export const DEFAULT_TOTAL_WEEKS = 20;
export const STANDARD_PROFILE_ID = "profile-standard";
export const SUMMER_PROFILE_ID = "profile-summer";

function addMinutes(time: string, delta: number): string {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + delta;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function periodsFromTimes(times: Array<[string, string]>): Period[] {
  return times.map(([start, end], index) => ({ index: index + 1, start, end }));
}

export function createPeriods(count = 12): Period[] {
  const periods: Period[] = BASE_PERIOD_TIMES.slice(0, Math.min(count, 12)).map(
    ([start, end], index) => ({
      index: index + 1,
      start,
      end,
    }),
  );
  while (periods.length < count) {
    const previous = periods[periods.length - 1];
    const start = previous ? addMinutes(previous.end, 10) : "08:00";
    periods.push({ index: periods.length + 1, start, end: addMinutes(start, 45) });
  }
  return periods.slice(0, MAX_PERIODS);
}

export function createSummerPeriods(): Period[] {
  return periodsFromTimes(SUMMER_PERIOD_TIMES);
}

export function createDefaultPeriodProfiles(): PeriodProfile[] {
  return [
    {
      id: STANDARD_PROFILE_ID,
      name: "作息方案 1",
      periods: createPeriods(12),
    },
    {
      id: SUMMER_PROFILE_ID,
      name: "作息方案 2",
      periods: createSummerPeriods(),
    },
  ];
}

export function resizePeriods(periods: Period[], count: number): Period[] {
  const target = Math.min(Math.max(count, MIN_PERIODS), MAX_PERIODS);
  const next = periods.slice(0, target).map((period, index) => ({
    ...period,
    index: index + 1,
  }));
  while (next.length < target) {
    const previous = next[next.length - 1];
    const start = previous ? addMinutes(previous.end, 10) : "08:00";
    next.push({ index: next.length + 1, start, end: addMinutes(start, 45) });
  }
  return next;
}

export function uid(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function nextTone(courses: Course[]): ToneId {
  return COURSE_TONES[courses.length % COURSE_TONES.length]?.id ?? "clay";
}

export function createDefaultWallpaper(): Wallpaper {
  return { preset: "paper", dataUrl: "", dim: 16 };
}

export function cloneWallpaper(wallpaper: Wallpaper): Wallpaper {
  return { ...wallpaper };
}

export interface SlotSeed {
  day: number;
  start: number;
  end: number;
  weekStart?: number;
  weekEnd?: number;
  pattern?: WeekPattern;
  weeks?: number[];
}

export function makeSlot(
  seed: SlotSeed,
  totalWeeks = DEFAULT_TOTAL_WEEKS,
): CourseSlot {
  return {
    id: uid("slot"),
    day: seed.day,
    start: seed.start,
    end: Math.max(seed.start, seed.end),
    weekStart: seed.weekStart ?? 1,
    weekEnd: seed.weekEnd ?? totalWeeks,
    pattern: seed.pattern ?? "all",
    ...(seed.weeks && seed.weeks.length > 0 ? { weeks: [...seed.weeks] } : {}),
  };
}

export function makeCourse(input: {
  name: string;
  teacher?: string;
  location?: string;
  tone?: ToneId;
  note?: string;
  slots: CourseSlot[];
  id?: string;
}): Course {
  const now = new Date().toISOString();
  return {
    id: input.id ?? uid("course"),
    name: input.name.trim(),
    teacher: input.teacher?.trim() ?? "",
    location: input.location?.trim() ?? "",
    tone: input.tone ?? "clay",
    note: input.note?.trim() ?? "",
    slots: input.slots,
    createdAt: now,
    updatedAt: now,
  };
}

export function makeEvent(input: {
  title: string;
  date: string;
  allDay?: boolean;
  start?: string;
  end?: string;
  note?: string;
  tone?: ToneId;
  id?: string;
}): ScheduleEvent {
  const now = new Date().toISOString();
  return {
    id: input.id ?? uid("event"),
    title: input.title.trim(),
    date: input.date,
    allDay: input.allDay ?? false,
    start: input.start ?? "09:00",
    end: input.end ?? "10:00",
    note: input.note?.trim() ?? "",
    tone: input.tone ?? "teal",
    createdAt: now,
    updatedAt: now,
  };
}

export function createBlankSemester(
  profile: PeriodProfile,
  now = new Date(),
  options: { name?: string; startDate?: string; totalWeeks?: number; showWeekends?: boolean } = {},
): Semester {
  return {
    name: options.name?.trim() || getTermName(now),
    startDate: options.startDate || getDefaultStartDate(now),
    totalWeeks: options.totalWeeks ?? DEFAULT_TOTAL_WEEKS,
    showWeekends: options.showWeekends ?? true,
    periods: profile.periods.map((period) => ({ ...period })),
  };
}

export function createBlankTimetable(
  profiles: PeriodProfile[],
  now = new Date(),
  name = "我的课表",
): Timetable {
  const profile =
    profiles.find((item) => item.id === STANDARD_PROFILE_ID) ?? profiles[0];
  if (!profile) throw new Error("At least one period profile is required.");
  const timestamp = new Date().toISOString();
  return {
    id: uid("timetable"),
    name,
    semester: createBlankSemester(profile, now),
    periodProfileId: profile.id,
    courses: [],
    events: [],
    wallpaper: createDefaultWallpaper(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createInitialData(now = new Date()): ScheduleData {
  const periodProfiles = createDefaultPeriodProfiles();
  const timetable = createBlankTimetable(periodProfiles, now);
  return {
    version: 2,
    activeTimetableId: timetable.id,
    timetables: [timetable],
    periodProfiles,
    updatedAt: new Date().toISOString(),
  };
}

export function createBlankSchedule(now = new Date()): ScheduleData {
  return createInitialData(now);
}

export function cloneTimetable(source: Timetable, name: string): Timetable {
  const timestamp = new Date().toISOString();
  return {
    ...source,
    id: uid("timetable"),
    name,
    periodProfileId: source.periodProfileId,
    semester: {
      ...source.semester,
      periods: source.semester.periods.map((period) => ({ ...period })),
    },
    courses: source.courses.map((course) => ({
      ...course,
      id: uid("course"),
      slots: course.slots.map((slot) => ({ ...slot, id: uid("slot") })),
      createdAt: course.createdAt,
      updatedAt: timestamp,
    })),
    events: source.events.map((event) => ({
      ...event,
      id: uid("event"),
      createdAt: event.createdAt,
      updatedAt: timestamp,
    })),
    wallpaper: cloneWallpaper(source.wallpaper),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * The demo data is intentionally not loaded by the app anymore. It remains
 * available to unit tests and for future "load an example" tooling.
 */
export function createDemoSchedule(now = new Date()): ScheduleData {
  const periodProfiles = createDefaultPeriodProfiles();
  const profile = periodProfiles[0];
  const currentMonday = startOfWeekMonday(now);
  const start = new Date(currentMonday);
  start.setDate(start.getDate() - 9 * 7);
  const totalWeeks = 20;
  const period = profile.periods;
  const totalWeeksForSlots = totalWeeks;

  const courses: Course[] = [
    makeCourse({
      id: "demo-calculus",
      name: "高等数学 A（上）",
      teacher: "张明远",
      location: "教一 401",
      tone: "clay",
      note: "带计算器与作业本。每周三课后交作业。",
      slots: [
        makeSlot({ day: 1, start: 1, end: 2, weekStart: 1, weekEnd: 16 }, totalWeeksForSlots),
        makeSlot({ day: 3, start: 3, end: 4, weekStart: 1, weekEnd: 16 }, totalWeeksForSlots),
      ],
    }),
    makeCourse({
      id: "demo-english",
      name: "大学英语 III",
      teacher: "李珂",
      location: "外语楼 302",
      tone: "sky",
      note: "每周一次课堂展示，分组进行。",
      slots: [
        makeSlot({ day: 2, start: 3, end: 4, weekStart: 1, weekEnd: 16 }, totalWeeksForSlots),
        makeSlot({ day: 4, start: 1, end: 2, weekStart: 1, weekEnd: 16 }, totalWeeksForSlots),
      ],
    }),
    makeCourse({
      id: "demo-data-structures",
      name: "数据结构与算法",
      teacher: "陈屿",
      location: "计算机楼 205",
      tone: "teal",
      note: "实验课在周四晚，具体安排见课程群。",
      slots: [
        makeSlot({ day: 1, start: 5, end: 6, weekStart: 1, weekEnd: 16 }, totalWeeksForSlots),
        makeSlot({ day: 4, start: 7, end: 8, weekStart: 1, weekEnd: 16 }, totalWeeksForSlots),
      ],
    }),
    makeCourse({
      id: "demo-probability",
      name: "概率论与数理统计",
      teacher: "赵文清",
      location: "教一 302",
      tone: "olive",
      slots: [
        makeSlot({ day: 2, start: 7, end: 8, weekStart: 1, weekEnd: 16 }, totalWeeksForSlots),
      ],
    }),
    makeCourse({
      id: "demo-physics-lab",
      name: "大学物理实验",
      teacher: "周衡",
      location: "物理实验中心 B",
      tone: "slate",
      note: "单周上课，需提前完成预习报告。",
      slots: [
        makeSlot(
          { day: 3, start: 9, end: 10, weekStart: 3, weekEnd: 15, pattern: "odd" },
          totalWeeksForSlots,
        ),
      ],
    }),
    makeCourse({
      id: "demo-history",
      name: "中国近现代史纲要",
      teacher: "刘青",
      location: "教二 108",
      tone: "plum",
      slots: [
        makeSlot({ day: 5, start: 3, end: 4, weekStart: 1, weekEnd: 16 }, totalWeeksForSlots),
      ],
    }),
    makeCourse({
      id: "demo-pe",
      name: "体育 III · 羽毛球",
      teacher: "王锐",
      location: "风雨操场 2 号场",
      tone: "marigold",
      note: "穿运动鞋，自带球拍。",
      slots: [
        makeSlot({ day: 3, start: 7, end: 8, weekStart: 1, weekEnd: 15 }, totalWeeksForSlots),
      ],
    }),
    makeCourse({
      id: "demo-policy",
      name: "形势与政策",
      teacher: "何宁",
      location: "教三 201",
      tone: "rose",
      note: "双周上课，共 8 次。",
      slots: [
        makeSlot(
          { day: 5, start: 7, end: 8, weekStart: 4, weekEnd: 16, pattern: "even" },
          totalWeeksForSlots,
        ),
      ],
    }),
  ];

  const timestamp = new Date().toISOString();
  const timetable: Timetable = {
    id: "demo-timetable",
    name: "示例课表",
    semester: {
      name: getTermName(start),
      startDate: dateKey(start),
      totalWeeks,
      showWeekends: true,
      periods: period.map((item) => ({ ...item })),
    },
    periodProfileId: profile.id,
    courses,
    events: [],
    wallpaper: createDefaultWallpaper(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    version: 2,
    activeTimetableId: timetable.id,
    timetables: [timetable],
    periodProfiles,
    updatedAt: timestamp,
  };
}
