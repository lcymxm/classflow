import { CalendarDays, ChevronRight, Clock, MapPin, Plus, User } from "lucide-react";
import type { CSSProperties } from "react";
import type { Course, Period, Semester, Session } from "../types";
import { toneColor } from "../types";
import { buildSessions, formatWeeks, sessionsForDay } from "../lib/schedule";
import {
  getWeekdayNumber,
  WEEKDAYS,
  formatMonthDay,
  isSameDay,
  timeToMinutes,
} from "../lib/date";

interface DayViewProps {
  semester: Semester;
  week: number;
  currentWeek: number;
  dates: Date[];
  courses: Course[];
  selectedDay: number;
  now: Date;
  onSelectDay: (day: number) => void;
  onSelectCourse: (course: Course) => void;
  onAddAt: (day: number, start: number) => void;
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
  courses,
  selectedDay,
  now,
  onSelectDay,
  onSelectCourse,
  onAddAt,
}: DayViewProps) {
  const visibleDays = semester.showWeekends ? WEEKDAYS : WEEKDAYS.slice(0, 5);
  const day = visibleDays.some((item) => item.index === selectedDay) ? selectedDay : visibleDays[0].index;
  const sessions = sessionsForDay(buildSessions(courses, week), day);
  const date = dates[day - 1];
  const today = getWeekdayNumber(now);
  const isToday = week === currentWeek && day === today;

  return (
    <div className="day-view">
      <div className="day-tabs" data-days={visibleDays.length} role="group" aria-label="选择星期">
        {visibleDays.map((item) => {
          const dayDate = dates[item.index - 1];
          const active = item.index === day;
          const todayMark = week === currentWeek && item.index === today;
          return (
            <button
              key={item.index}
              className={`day-tab ${active ? "is-active" : ""} ${todayMark ? "is-today" : ""}`}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectDay(item.index)}
            >
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
            {sessions.length > 0
              ? `${sessions.length} 节课 · 从 ${sessionTime(sessions[0], semester.periods).split(" – ")[0]} 开始`
              : "这一天暂时没有课。"}
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={() => onAddAt(day, 1)}>
          <Plus size={15} />
          在这天加课
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="day-empty">
          <span className="day-empty-icon">
            <CalendarDays size={22} />
          </span>
          <h3>{isToday ? "今天没有课" : "这一天是空的"}</h3>
          <p>{isToday ? "可以慢一点，也可以给自己加一节课。" : "留白也是一种安排。"}</p>
          <div className="button-row">
            <button className="primary-button" type="button" onClick={() => onAddAt(day, 1)}>
              <Plus size={16} />
              在这天加课
            </button>
          </div>
        </div>
      ) : (
        <div className="day-list">
          {sessions.map((session) => {
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
    </div>
  );
}
