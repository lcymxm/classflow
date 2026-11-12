import {
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  User,
} from "lucide-react";
import type { CSSProperties } from "react";
import type {
  Period,
  ScheduleEvent,
  Semester,
  Session,
} from "../types";
import { toneColor } from "../types";
import type { CalendarDayInfo } from "../lib/holidays";
import {
  dateKey,
  formatMonthDay,
  getWeekdayNumber,
  isSameDay,
  timeToMinutes,
  WEEKDAYS,
} from "../lib/date";
import { formatWeeks } from "../lib/schedule";

interface DayViewProps {
  semester: Semester;
  week: number;
  currentWeek: number;
  dates: Date[];
  days: number[];
  sessions: Session[];
  events: ScheduleEvent[];
  dayStatuses: Record<number, CalendarDayInfo | null>;
  selectedDay: number;
  now: Date;
  onSelectDay: (day: number) => void;
  onSelectCourse: (course: Session["course"]) => void;
  onAddAt: (day: number, start: number) => void;
  onAddEvent: (date: string) => void;
  onSelectEvent: (event: ScheduleEvent) => void;
}

function sessionTime(session: Session, periods: Period[]): string {
  const start = periods[session.start - 1]?.start ?? "";
  const end = periods[session.end - 1]?.end ?? "";
  return `${start} – ${end}`;
}

function isOngoing(session: Session, periods: Period[], date: Date, now: Date): boolean {
  if (!isSameDay(date, now)) return false;
  const start = periods[session.start - 1]?.start;
  const end = periods[session.end - 1]?.end;
  if (!start || !end) return false;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= timeToMinutes(start) && nowMinutes < timeToMinutes(end);
}

export function DayView({
  semester,
  week,
  currentWeek,
  dates,
  days,
  sessions,
  events,
  dayStatuses,
  selectedDay,
  now,
  onSelectDay,
  onSelectCourse,
  onAddAt,
  onAddEvent,
  onSelectEvent,
}: DayViewProps) {
  const visibleDays = days.map((index) => WEEKDAYS[index - 1]);
  const day = visibleDays.some((item) => item.index === selectedDay)
    ? selectedDay
    : visibleDays[0]?.index ?? 1;
  const daySessions = sessions.filter((session) => session.day === day);
  const date = dates[day - 1];
  const today = getWeekdayNumber(now);
  const isToday = week === currentWeek && day === today;
  const holiday = dayStatuses[day] ?? null;
  const dayEvents = events
    .filter((event) => !date || event.date === dateKey(date))
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return a.start.localeCompare(b.start);
    });

  return (
    <div className="day-view">
      <div className="day-tabs" data-days={visibleDays.length} role="group" aria-label="选择星期">
        {visibleDays.map((item) => {
          const dayDate = dates[item.index - 1];
          const active = item.index === day;
          const todayMark = week === currentWeek && item.index === today;
          const status = dayStatuses[item.index];
          return (
            <button
              key={item.index}
              className={`day-tab ${active ? "is-active" : ""} ${
                todayMark ? "is-today" : ""
              } ${status ? `is-${status.kind}` : ""}`}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectDay(item.index)}
            >
              {status ? (
                <span className={`day-tab-flag is-${status.kind}`}>{status.short}</span>
              ) : null}
              <span className="day-tab-en">{item.en}</span>
              <strong>{item.short}</strong>
              <span className="day-tab-date">{dayDate ? dayDate.getDate() : ""}</span>
              {todayMark ? <span className="day-tab-dot" /> : null}
            </button>
          );
        })}
      </div>

      <div className="day-summary">
        <div>
          <p className="eyebrow">
            {isToday ? "TODAY" : "DAY PLAN"} · {WEEKDAYS[day - 1].en}
          </p>
          <h2>
            {WEEKDAYS[day - 1].label}
            {date ? <span>{formatMonthDay(date)}</span> : null}
          </h2>
          <p className="day-summary-meta">
            {holiday
              ? `${holiday.name} · ${holiday.kind === "holiday" ? "放假，课程已自动隐藏" : "调休上班"}`
              : daySessions.length > 0
                ? `${daySessions.length} 节课 · 从 ${sessionTime(daySessions[0], semester.periods).split(" – ")[0]} 开始`
                : "这一天暂时没有课。"}
          </p>
        </div>
        <div className="day-summary-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => date && onAddEvent(dateKey(date))}
          >
            <CalendarPlus size={15} />
            添加日程
          </button>
          {!holiday ? (
            <button className="secondary-button" type="button" onClick={() => onAddAt(day, 1)}>
              <Plus size={15} />
              在这天加课
            </button>
          ) : null}
        </div>
      </div>

      {holiday ? (
        <div className={`day-holiday-banner is-${holiday.kind}`}>
          <CalendarDays size={17} />
          <div>
            <strong>{holiday.name}</strong>
            <span>
              {holiday.kind === "holiday"
                ? "这一天按法定节假日处理，课程不会显示。"
                : "调休工作日，周末照常显示。"}
            </span>
          </div>
        </div>
      ) : null}

      {daySessions.length === 0 ? (
        <div className={`day-empty ${dayEvents.length > 0 ? "has-events" : ""}`}>
          <span className="day-empty-icon">
            <CalendarDays size={22} />
          </span>
          <h3>{holiday?.kind === "holiday" ? "假期快乐" : isToday ? "今天没有课" : "这一天是空的"}</h3>
          <p>
            {holiday?.kind === "holiday"
              ? "不用赶课，给自己留一点时间。"
              : isToday
                ? "可以慢一点，也可以给自己加一节课。"
                : "留白也是一种安排。"}
          </p>
          {!holiday ? (
            <div className="button-row">
              <button className="primary-button" type="button" onClick={() => onAddAt(day, 1)}>
                <Plus size={16} />
                在这天加课
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="day-list">
          {daySessions.map((session) => {
            const ongoing = isOngoing(session, semester.periods, date, now);
            const start = semester.periods[session.start - 1]?.start ?? "";
            const end = semester.periods[session.end - 1]?.end ?? "";
            return (
              <button
                className={`day-course ${ongoing ? "is-ongoing" : ""}`}
                type="button"
                key={session.id}
                style={{ "--tone": toneColor(session.course.tone) } as CSSProperties}
                onClick={() => onSelectCourse(session.course)}
              >
                <span className="day-course-time">
                  <strong>{start}</strong>
                  <span>{end}</span>
                  <em>第 {session.start}{session.end !== session.start ? `–${session.end}` : ""} 节</em>
                </span>
                <span className="day-course-body">
                  <span className="day-course-topline">
                    <span className="day-course-name">{session.course.name}</span>
                    {ongoing ? <span className="live-badge">进行中</span> : null}
                  </span>
                  <span className="day-course-details">
                    {session.course.location ? (
                      <span>
                        <MapPin size={12} />
                        {session.course.location}
                      </span>
                    ) : null}
                    {session.course.teacher ? (
                      <span>
                        <User size={12} />
                        {session.course.teacher}
                      </span>
                    ) : null}
                    <span>
                      <Clock size={12} />
                      {formatWeeks(session.slot)}
                    </span>
                  </span>
                </span>
                <span className="day-course-more" aria-hidden="true">
                  <ChevronRight size={16} />
                </span>
              </button>
            );
          })}
        </div>
      )}

      <section className="day-events" aria-label="当天日程">
        <div className="day-section-head">
          <div>
            <p className="eyebrow">PERSONAL PLAN</p>
            <h3>当天日程</h3>
          </div>
          <button
            className="text-button"
            type="button"
            onClick={() => date && onAddEvent(dateKey(date))}
          >
            <Plus size={13} />
            添加日程
          </button>
        </div>
        {dayEvents.length > 0 ? (
          <div className="day-event-list">
            {dayEvents.map((event) => (
              <button
                className="day-event"
                type="button"
                key={event.id}
                style={{ "--tone": toneColor(event.tone) } as CSSProperties}
                onClick={() => onSelectEvent(event)}
              >
                <span className="day-event-time">
                  {event.allDay ? "全天" : event.start}
                </span>
                <span className="day-event-dot" aria-hidden="true" />
                <span className="day-event-copy">
                  <strong>{event.title}</strong>
                  {event.note ? <small>{event.note}</small> : null}
                </span>
                {!event.allDay ? <span className="day-event-end">{event.end}</span> : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="day-events-empty">还没有日程。小组讨论、交作业、社团活动都可以放进来。</p>
        )}
      </section>
    </div>
  );
}
