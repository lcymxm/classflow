import type { Course, CourseSlot, ToneId } from "../types";
import { makeCourse, makeSlot } from "./factory";

export type TimetableTemplateId = "blank" | "stem" | "humanities" | "medical" | "exam";

export interface TimetableTemplate {
  id: TimetableTemplateId;
  name: string;
  description: string;
}

export const TIMETABLE_TEMPLATES: TimetableTemplate[] = [
  { id: "blank", name: "空白课表", description: "从零开始自己添加" },
  { id: "stem", name: "理工科", description: "高数、物理、程序、英语" },
  { id: "humanities", name: "文科", description: "文学、历史、英语、艺术" },
  { id: "medical", name: "医学", description: "解剖、生理、生化、医学英语" },
  { id: "exam", name: "考研备考", description: "政治、英语、数学、专业课" },
];

interface TemplateCourseSeed {
  name: string;
  teacher: string;
  location: string;
  tone: ToneId;
  slots: Array<[day: number, start: number, end: number]>;
}

const TEMPLATE_COURSES: Record<Exclude<TimetableTemplateId, "blank">, TemplateCourseSeed[]> = {
  stem: [
    {
      name: "高等数学 A（上）",
      teacher: "张明远",
      location: "教一 401",
      tone: "clay",
      slots: [
        [1, 1, 2],
        [3, 3, 4],
      ],
    },
    {
      name: "大学物理",
      teacher: "周衡",
      location: "教二 205",
      tone: "sky",
      slots: [
        [2, 3, 4],
        [4, 5, 6],
      ],
    },
    {
      name: "程序设计基础",
      teacher: "陈屿",
      location: "计算机楼 205",
      tone: "teal",
      slots: [
        [3, 5, 6],
        [5, 3, 4],
      ],
    },
    {
      name: "大学英语",
      teacher: "李珂",
      location: "外语楼 302",
      tone: "marigold",
      slots: [[4, 1, 2]],
    },
    {
      name: "体育 · 羽毛球",
      teacher: "王锐",
      location: "风雨操场",
      tone: "olive",
      slots: [[5, 7, 8]],
    },
  ],
  humanities: [
    {
      name: "现代汉语",
      teacher: "顾清",
      location: "文科楼 201",
      tone: "plum",
      slots: [
        [1, 3, 4],
        [3, 1, 2],
      ],
    },
    {
      name: "中国文学史",
      teacher: "沈砚",
      location: "文科楼 108",
      tone: "rose",
      slots: [[2, 1, 2]],
    },
    {
      name: "世界近代史",
      teacher: "何宁",
      location: "教二 301",
      tone: "clay",
      slots: [[4, 3, 4]],
    },
    {
      name: "大学英语",
      teacher: "林夏",
      location: "外语楼 205",
      tone: "sky",
      slots: [[3, 5, 6]],
    },
    {
      name: "艺术鉴赏",
      teacher: "苏禾",
      location: "艺术楼 102",
      tone: "olive",
      slots: [[5, 5, 6]],
    },
  ],
  medical: [
    {
      name: "系统解剖学",
      teacher: "许川",
      location: "医学楼 301",
      tone: "clay",
      slots: [
        [1, 1, 2],
        [3, 3, 4],
      ],
    },
    {
      name: "生理学",
      teacher: "洛宁",
      location: "医学楼 205",
      tone: "teal",
      slots: [[2, 3, 4]],
    },
    {
      name: "生物化学",
      teacher: "季安",
      location: "实验楼 B 302",
      tone: "olive",
      slots: [[4, 1, 2]],
    },
    {
      name: "医学英语",
      teacher: "林夏",
      location: "外语楼 205",
      tone: "sky",
      slots: [[3, 5, 6]],
    },
    {
      name: "体育 · 羽毛球",
      teacher: "王锐",
      location: "风雨操场",
      tone: "marigold",
      slots: [[5, 7, 8]],
    },
  ],
  exam: [
    {
      name: "考研政治",
      teacher: "肖宁",
      location: "图书馆 3F",
      tone: "clay",
      slots: [
        [1, 1, 2],
        [4, 1, 2],
      ],
    },
    {
      name: "考研英语",
      teacher: "周遥",
      location: "图书馆 3F",
      tone: "sky",
      slots: [
        [2, 1, 2],
        [5, 3, 4],
      ],
    },
    {
      name: "数学一",
      teacher: "张明远",
      location: "教一 401",
      tone: "teal",
      slots: [
        [3, 1, 2],
        [4, 5, 6],
      ],
    },
    {
      name: "专业课复习",
      teacher: "",
      location: "自习室",
      tone: "olive",
      slots: [
        [2, 5, 6],
        [3, 5, 6],
      ],
    },
  ],
};

export function createTemplateCourses(
  templateId: TimetableTemplateId,
  totalWeeks: number,
): Course[] {
  if (templateId === "blank") return [];
  const seeds = TEMPLATE_COURSES[templateId];
  const endWeek = Math.min(totalWeeks, 16);
  return seeds.map((seed) => {
    const slots: CourseSlot[] = seed.slots.map(([day, start, end]) =>
      makeSlot(
        {
          day,
          start,
          end,
          weekStart: 1,
          weekEnd: endWeek,
          pattern: "all",
        },
        totalWeeks,
      ),
    );
    return makeCourse({
      name: seed.name,
      teacher: seed.teacher,
      location: seed.location,
      tone: seed.tone,
      slots,
    });
  });
}
