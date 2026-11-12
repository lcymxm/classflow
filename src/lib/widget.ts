import { Capacitor, registerPlugin } from "@capacitor/core";
import type { ScheduleData } from "../types";
import {
  dateKey,
  formatMonthDay,
  getTermPosition,
  getWeekDates,
  getWeekdayNumber,
  WEEKDAYS,
} from "./date";
import { buildSessions } from "./schedule";
import { filterHolidaySessions, getCalendarInfo } from "./holidays";

interface WidgetClass {
  name: string;
  start: string;
  end: string;
  location: string;
}

interface WidgetEvent {
  title: string;
  start: string;
  end: string;
  allDay: boolean;
}

interface WidgetDay {
  date: string;
  label: string;
  week: number;
  termState: "before" | "during" | "after";
  holiday: string;
  workday: string;
  classes: WidgetClass[];
  events: WidgetEvent[];
}

export interface WidgetPayload {
  timetableName: string;
  today: string;
  updatedAt: string;
  days: WidgetDay[];
}

interface WidgetBridgePlugin {
  sync(options: { payload: string }): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>("WidgetBridge");

export function buildWidgetPayload(
  data: ScheduleData,
  autoHolidays: boolean,
  now = new Date(),
): WidgetPayload {
  const active =
    data.timetables.find((timetable) => timetable.id === data.activeTimetableId) ??
    data.timetables[0];
  const semester = active.semester;
  const days: WidgetDay[] = [];

  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const position = getTermPosition(semester.startDate, semester.totalWeeks, date);
    const weekday = getWeekdayNumber(date);
    const info = autoHolidays ? getCalendarInfo(date) : null;
    const weekDates = getWeekDates(semester.startDate, position.week);
    let classes: WidgetClass[] = [];

    if (position.state === "during") {
      const sessions = filterHolidaySessions(
        buildSessions(active.courses, position.week),
        weekDates,
        autoHolidays,
      )
        .filter((session) => session.day === weekday)
        .sort((a, b) => a.start - b.start);
      classes = sessions.map((session) => ({
        name: session.course.name,
        start: semester.periods[session.start - 1]?.start ?? "",
        end: semester.periods[session.end - 1]?.end ?? "",
        location: session.course.location,
      }));
    }

    const events = active.events
      .filter((event) => event.date === dateKey(date))
      .sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return a.start.localeCompare(b.start);
      })
      .slice(0, 4)
      .map((event) => ({
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
      }));

    days.push({
      date: dateKey(date),
      label: `${formatMonthDay(date)} ${WEEKDAYS[weekday - 1].label}`,
      week: position.week,
      termState: position.state,
      holiday: info?.kind === "holiday" ? info.name : "",
      workday: info?.kind === "workday" ? info.name : "",
      classes,
      events,
    });
  }

  return {
    timetableName: active.name,
    today: dateKey(now),
    updatedAt: new Date().toISOString(),
    days,
  };
}

export async function syncAndroidWidget(
  data: ScheduleData,
  autoHolidays: boolean,
): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  const payload = buildWidgetPayload(data, autoHolidays);
  await WidgetBridge.sync({ payload: JSON.stringify(payload) });
}
