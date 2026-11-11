export const COURSE_TONES = [
  { id: "clay", label: "陶土", hex: "#c5634b" },
  { id: "marigold", label: "麦黄", hex: "#c49334" },
  { id: "olive", label: "橄榄", hex: "#718a4b" },
  { id: "teal", label: "青绿", hex: "#3c847b" },
  { id: "sky", label: "远山", hex: "#557aa8" },
  { id: "plum", label: "梅紫", hex: "#8b6386" },
  { id: "rose", label: "胭脂", hex: "#b26478" },
  { id: "slate", label: "石板", hex: "#66767c" },
] as const;

export type ToneId = (typeof COURSE_TONES)[number]["id"];

export function toneColor(tone: ToneId): string {
  return COURSE_TONES.find((item) => item.id === tone)?.hex ?? COURSE_TONES[0].hex;
}

export type WeekPattern = "all" | "odd" | "even";

export interface Period {
  index: number;
  start: string;
  end: string;
}

export interface CourseSlot {
  id: string;
  day: number;
  start: number;
  end: number;
  weekStart: number;
  weekEnd: number;
  pattern: WeekPattern;
}

export interface Course {
  id: string;
  name: string;
  teacher: string;
  location: string;
  tone: ToneId;
  note: string;
  slots: CourseSlot[];
  createdAt: string;
  updatedAt: string;
}

export interface Semester {
  name: string;
  startDate: string;
  totalWeeks: number;
  showWeekends: boolean;
  periods: Period[];
}

export interface ScheduleData {
  version: 1;
  semester: Semester;
  courses: Course[];
  isDemo: boolean;
  updatedAt: string;
}

export interface Session {
  id: string;
  course: Course;
  slot: CourseSlot;
  day: number;
  start: number;
  end: number;
}

export interface LaidOutSession extends Session {
  column: number;
  columns: number;
}

export type Theme = "light" | "dark";
export type ViewMode = "week" | "day";
export type AppPage = "timetable" | "courses";

export interface Preferences {
  theme: Theme;
  view: ViewMode;
}

export interface NextSession {
  session: Session;
  date: Date;
  state: "ongoing" | "upcoming";
}

export interface WeekStats {
  courseCount: number;
  sessionCount: number;
  minutes: number;
  busiestDay: number | null;
  busiestCount: number;
}

export interface ImportResult {
  ok: boolean;
  message: string;
}
