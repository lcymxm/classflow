import type { ScheduleData, Timetable } from "../types";
import { dateKey, getDateForSlot, parseDateKey, timeToMinutes } from "./date";
import { isHolidayDate } from "./holidays";
import { isSlotActiveInWeek } from "./schedule";
import { normalizeSchedule } from "./storage";
import { deliverTextFile, type ExportResult, type FileDelivery } from "./nativeFile";

interface ExportEnvelope {
  app: "kexu";
  version: 2;
  exportedAt: string;
  data: ScheduleData;
}

export function exportEnvelope(data: ScheduleData): ExportEnvelope {
  return {
    app: "kexu",
    version: 2,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function sanitizeFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim() || "课序";
}

function activeTimetable(data: ScheduleData): Timetable {
  return (
    data.timetables.find((timetable) => timetable.id === data.activeTimetableId) ??
    data.timetables[0]
  );
}

export async function downloadScheduleJson(data: ScheduleData): Promise<ExportResult> {
  const active = activeTimetable(data);
  const filename = `课序-${sanitizeFilename(active.semester.name)}-${dateKey(new Date())}.json`;
  const delivery = await deliverTextFile(
    filename,
    JSON.stringify(exportEnvelope(data), null, 2),
    "application/json;charset=utf-8",
  );
  return { filename, delivery };
}

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function icsLocalDate(date: Date, time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(
    hours,
  )}${pad(minutes)}00`;
}

function icsDateOnly(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function icsStamp(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
    date.getUTCDate(),
  )}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function foldLine(line: string): string {
  const encoder = new TextEncoder();
  let result = "";
  let current = "";
  for (const char of line) {
    const next = current + char;
    if (encoder.encode(next).length > 72) {
      result += `${current}\r\n `;
      current = char;
    } else {
      current = next;
    }
  }
  return result + current;
}

export function buildIcs(
  data: ScheduleData,
  autoHolidays = true,
): { content: string; count: number } {
  const active = activeTimetable(data);
  const { semester, courses, events } = active;
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClassFlow//Kexu 2.0//CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(`${active.name}·${semester.name}`)}`,
  ];
  let count = 0;

  for (const course of courses) {
    for (const slot of course.slots) {
      for (let week = slot.weekStart; week <= slot.weekEnd; week += 1) {
        if (!isSlotActiveInWeek(slot, week)) continue;
        const periodStart = semester.periods[slot.start - 1];
        const periodEnd = semester.periods[slot.end - 1];
        if (!periodStart || !periodEnd) continue;
        const date = getDateForSlot(semester.startDate, week, slot.day);
        if (autoHolidays && isHolidayDate(date)) continue;
        const description = [
          course.name,
          course.teacher ? `教师：${course.teacher}` : "",
          course.location ? `地点：${course.location}` : "",
          `第 ${week} 周 · 第 ${slot.start}${
            slot.end !== slot.start ? `–${slot.end}` : ""
          } 节`,
          course.note,
        ]
          .filter(Boolean)
          .join("\n");
        lines.push(
          "BEGIN:VEVENT",
          foldLine(`UID:${course.id}-${slot.id}-${week}@classflow`),
          `DTSTAMP:${icsStamp(now)}`,
          foldLine(`DTSTART:${icsLocalDate(date, periodStart.start)}`),
          foldLine(`DTEND:${icsLocalDate(date, periodEnd.end)}`),
          foldLine(`SUMMARY:${icsEscape(course.name)}`),
          foldLine(`LOCATION:${icsEscape(course.location)}`),
          foldLine(`DESCRIPTION:${icsEscape(description)}`),
          "END:VEVENT",
        );
        count += 1;
      }
    }
  }

  for (const event of events) {
    const date = parseDateKey(event.date);
    const description = [event.title, event.allDay ? "全天日程" : "日程", event.note]
      .filter(Boolean)
      .join("\n");
    lines.push(
      "BEGIN:VEVENT",
      foldLine(`UID:${event.id}@classflow-event`),
      `DTSTAMP:${icsStamp(now)}`,
      event.allDay
        ? `DTSTART;VALUE=DATE:${icsDateOnly(date)}`
        : foldLine(`DTSTART:${icsLocalDate(date, event.start)}`),
      event.allDay
        ? `DTEND;VALUE=DATE:${icsDateOnly(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1))}`
        : foldLine(`DTEND:${icsLocalDate(date, event.end)}`),
      foldLine(`SUMMARY:${icsEscape(event.title)}`),
      foldLine(`DESCRIPTION:${icsEscape(description)}`),
      "END:VEVENT",
    );
    count += 1;
  }

  lines.push("END:VCALENDAR");
  return { content: `${lines.join("\r\n")}\r\n`, count };
}

export async function downloadScheduleIcs(
  data: ScheduleData,
  autoHolidays = true,
): Promise<ExportResult & { count: number }> {
  const active = activeTimetable(data);
  const { content, count } = buildIcs(data, autoHolidays);
  const filename = `课序-${sanitizeFilename(active.semester.name)}.ics`;
  const delivery: FileDelivery = await deliverTextFile(
    filename,
    content,
    "text/calendar;charset=utf-8",
  );
  return { count, filename, delivery };
}

export async function readScheduleFile(file: File): Promise<{
  data: ScheduleData | null;
  message: string;
}> {
  if (file.size > 20 * 1024 * 1024) {
    return { data: null, message: "文件超过 20 MB，无法导入。" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { data: null, message: "文件不是有效的 JSON。" };
  }
  const data = normalizeSchedule(parsed);
  if (!data) {
    return { data: null, message: "没有找到可识别的课表数据。" };
  }
  const courseCount = data.timetables.reduce(
    (total, timetable) => total + timetable.courses.length,
    0,
  );
  const slotCount = data.timetables.reduce(
    (total, timetable) =>
      total + timetable.courses.reduce((sum, course) => sum + course.slots.length, 0),
    0,
  );
  if (courseCount === 0) {
    return { data, message: `已导入 ${data.timetables.length} 套空课表。` };
  }
  return {
    data,
    message: `已读取 ${data.timetables.length} 套课表、${courseCount} 门课程，共 ${slotCount} 个时间段。`,
  };
}

export function minutesToHoursLabel(minutes: number): string {
  if (minutes <= 0) return "0 学时";
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} 学时`;
}

export function durationFromPeriods(
  periods: Array<{ start: string; end: string }>,
  start: number,
  end: number,
): number {
  let total = 0;
  for (let index = start; index <= end; index += 1) {
    const period = periods[index - 1];
    if (period) total += Math.max(0, timeToMinutes(period.end) - timeToMinutes(period.start));
  }
  return total;
}
