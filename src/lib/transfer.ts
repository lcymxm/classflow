import type { ScheduleData } from "../types";
import { dateKey, getDateForSlot, timeToMinutes } from "./date";
import { isSlotActiveInWeek } from "./schedule";
import { normalizeSchedule } from "./storage";
import { deliverTextFile, type ExportResult, type FileDelivery } from "./nativeFile";

interface ExportEnvelope {
  app: "kexu";
  version: 1;
  exportedAt: string;
  data: ScheduleData;
}

export function exportEnvelope(data: ScheduleData): ExportEnvelope {
  return {
    app: "kexu",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function sanitizeFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim() || "课序";
}

export async function downloadScheduleJson(data: ScheduleData): Promise<ExportResult> {
  const filename = `课序-${sanitizeFilename(data.semester.name)}-${dateKey(new Date())}.json`;
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

export function buildIcs(data: ScheduleData): { content: string; count: number } {
  const { semester, courses } = data;
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClassFlow//Kexu 1.0//CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(semester.name)}`,
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
        const description = [
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

  lines.push("END:VCALENDAR");
  return { content: `${lines.join("\r\n")}\r\n`, count };
}

export async function downloadScheduleIcs(
  data: ScheduleData,
): Promise<ExportResult & { count: number }> {
  const { content, count } = buildIcs(data);
  const filename = `课序-${sanitizeFilename(data.semester.name)}.ics`;
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
  if (file.size > 5 * 1024 * 1024) {
    return { data: null, message: "文件超过 5 MB，无法导入。" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { data: null, message: "文件不是有效的 JSON。" };
  }
  const data = normalizeSchedule(parsed, false);
  if (!data) {
    return { data: null, message: "没有找到可识别的课表数据。" };
  }
  if (data.courses.length === 0) {
    return { data, message: "备份里没有课程，已导入空课表。" };
  }
  return {
    data,
    message: `已读取 ${data.courses.length} 门课程，共 ${data.courses.reduce(
      (total, course) => total + course.slots.length,
      0,
    )} 个时间段。`,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
