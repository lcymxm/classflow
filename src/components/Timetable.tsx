import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { CalendarDays, CalendarPlus, Plus, Sparkles } from "lucide-react";
import type {
  Course,
  LaidOutSession,
  ScheduleEvent,
  Session,
  Semester,
} from "../types";
import { toneColor } from "../types";
import {
  formatWeeks,
  getPeriodNowProgress,
  groupSessionsByDay,
} from "../lib/schedule";
import { getWeekdayNumber, WEEKDAYS } from "../lib/date";
import type { CalendarDayInfo } from "../lib/holidays";

const ROW_HEIGHT = 58;

interface TimetableProps {
  semester: Semester;
  week: number;
  currentWeek: number;
  dates: Date[];
  days: number[];
  courses: Course[];
  sessions: Session[];
  dayStatuses: Record<number, CalendarDayInfo | null>;
  eventCounts: Record<number, number>;
  weekEvents: ScheduleEvent[];
  calendarSummary: { holidays: string[]; workdays: string[] };
  now: Date;
  onSelectCourse: (course: Course) => void;
  onSelectEvent: (event: ScheduleEvent) => void;
  onAddAt: (day: number, start: number) => void;
  onAddCourse: () => void;
}

function courseBlockStyle(session: LaidOutSession): CSSProperties {
  const top = (session.start - 1) * ROW_HEIGHT + 2;
  const height = (session.end - session.start + 1) * ROW_HEIGHT - 4;
  const left = `calc(${(session.column / session.columns) * 100}% + 3px)`;
  const width = `calc(${100 / session.columns}% - 6px)`;
  return {
    top,
    height,
    left,
    width,
    "--tone": toneColor(session.course.tone),
  } as CSSProperties;
}

export function Timetable({
  semester,
  week,
  currentWeek,
  dates,
  days,
  courses,
  sessions,
  dayStatuses,
  eventCounts,
  weekEvents,
  calendarSummary,
  now,
  onSelectCourse,
  onSelectEvent,
  onAddAt,
  onAddCourse,
}: TimetableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const byDay = useMemo(() => groupSessionsByDay(sessions), [sessions]);
  const todayNumber = getWeekdayNumber(now);
  const showNow = week === currentWeek && days.includes(todayNumber);
  const nowProgress = getPeriodNowProgress(semester.periods, now);
  const nowTop = nowProgress
    ? (nowProgress.period - 1 + nowProgress.fraction) * ROW_HEIGHT
    : null;
  const hasEvents = Object.values(eventCounts).some((count) => count > 0);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || week !== currentWeek || !days.includes(todayNumber)) return;
    if (window.innerWidth >= 900) return;
    const dayIndex = days.indexOf(todayNumber);
    if (dayIndex < 0) return;
    const dayWidth = (scroller.scrollWidth - 64) / days.length;
    const target = Math.max(0, 64 + dayWidth * dayIndex - scroller.clientWidth / 2 + dayWidth / 2);
    scroller.scrollTo({ left: target, behavior: "smooth" });
  }, [week, currentWeek, days, todayNumber]);

  if (courses.length === 0 && !hasEvents) {
    return (
      <div className="blank-board">
        <span className="blank-board-icon">
          <Sparkles size={22} />
        </span>
        <p className="eyebrow">A FRESH START</p>
        <h3>课表还是空的</h3>
        <p>先把学期和作息调好，再把第一门课放进来。</p>
        <button className="primary-button" type="button" onClick={onAddCourse}>
          <Plus size={16} />
          添加第一门课
        </button>
      </div>
    );
  }

  return (
    <div className="timetable-zone">
      {calendarSummary.holidays.length > 0 || calendarSummary.workdays.length > 0 ? (
        <div className="calendar-strip">
          <CalendarDays size={15} />
          <div>
            {calendarSummary.holidays.length > 0 ? (
              <span>
                <strong>{calendarSummary.holidays.join("、")}</strong> 放假，假期课程已自动隐藏。
              </span>
            ) : null}
            {calendarSummary.workdays.length > 0 ? (
              <span className="calendar-strip-workday">
                调休上班：{calendarSummary.workdays.join("、")}，周末仍会显示。
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {weekEvents.length > 0 ? (
        <div className="week-event-strip">
          <div className="week-event-strip-head">
            <CalendarDays size={14} />
            <span>本周日程</span>
            <em>{weekEvents.length}</em>
          </div>
          <div className="week-event-chips">
            {weekEvents.map((event) => {
              const [, month, date] = event.date.split("-");
              return (
                <button
                  className="week-event-chip"
                  type="button"
                  key={event.id}
                  style={{ "--tone": toneColor(event.tone) } as CSSProperties}
                  onClick={() => onSelectEvent(event)}
                >
                  <span className="week-event-chip-dot" />
                  <span className="week-event-chip-date">{Number(month)}/{Number(date)}</span>
                  <span className="week-event-chip-title">{event.title}</span>
                  <span className="week-event-chip-time">
                    {event.allDay ? "全天" : event.start}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {sessions.length === 0 ? (
        <div className="week-empty">
          <CalendarPlus size={16} />
          <span>
            {calendarSummary.holidays.length > 0
              ? "本周有法定节假日，相关课程已自动隐藏。"
              : "这一周还没有课。可能是课程不在本周的周次内。"}
          </span>
        </div>
      ) : null}

      <div className="week-overview" aria-label="一周课程一览">
        <div className="week-overview-head">
          <span>本周一览</span>
          <small>七天课程与完整教室</small>
        </div>
        {days.map((day) => {
          const date = dates[day - 1];
          const info = WEEKDAYS[day - 1];
          const status = dayStatuses[day] ?? null;
          const daySessions = byDay[day] ?? [];
          const isToday = showNow && day === todayNumber;
          const eventCount = eventCounts[day] ?? 0;
          return (
            <section
              className={`week-overview-day ${isToday ? "is-today" : ""} ${
                status ? `is-${status.kind}` : ""
              }`}
              key={day}
            >
              <div className="week-overview-day-head">
                <strong>{info.label}</strong>
                <span>
                  {date ? `${date.getMonth() + 1}/${date.getDate()}` : ""}
                </span>
                {status ? (
                  <em className={`day-status-tag is-${status.kind}`}>{status.short}</em>
                ) : null}
                {eventCount > 0 ? <em className="week-overview-event-count">{eventCount} 日程</em> : null}
                <span className="week-overview-day-count">
                  {daySessions.length > 0 ? `${daySessions.length} 节` : "没课"}
                </span>
              </div>
              {daySessions.length > 0 ? (
                <div className="week-overview-courses">
                  {daySessions.map((session) => {
                    const start = semester.periods[session.start - 1];
                    const end = semester.periods[session.end - 1];
                    return (
                      <button
                        className="week-overview-course"
                        type="button"
                        key={session.id}
                        style={{ "--tone": toneColor(session.course.tone) } as CSSProperties}
                        onClick={() => onSelectCourse(session.course)}
                      >
                        <span className="week-overview-time">
                          <strong>{start?.start ?? ""}</strong>
                          <span>{end?.end ?? ""}</span>
                        </span>
                        <span className="week-overview-copy">
                          <strong>{session.course.name}</strong>
                          <span className="week-overview-location">
                            {session.course.location || "地点待定"}
                          </span>
                          <span className="week-overview-meta">
                            {session.course.teacher ? `${session.course.teacher} · ` : ""}
                            第 {session.start}
                            {session.end !== session.start ? `–${session.end}` : ""} 节 ·{" "}
                            {formatWeeks(session.slot)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span className="week-overview-empty">
                  {status?.kind === "holiday" ? "今天放假" : "这一天没有课"}
                </span>
              )}
            </section>
          );
        })}
      </div>

      <div className="timetable-scroll" ref={scrollRef}>
        <div
          className="timetable"
          style={
            {
              "--row-height": `${ROW_HEIGHT}px`,
              "--day-count": days.length,
            } as CSSProperties
          }
        >
          <div className="tt-head">
            <div className="tt-corner">
              <span>节次</span>
              <small>TIME</small>
            </div>
            {days.map((day) => {
              const info = WEEKDAYS[day - 1];
              const date = dates[day - 1];
              const isToday = showNow && day === todayNumber;
              const status = dayStatuses[day] ?? null;
              const eventCount = eventCounts[day] ?? 0;
              return (
                <div
                  className={`tt-day-head ${isToday ? "is-today" : ""} ${
                    status ? `is-${status.kind}` : ""
                  }`}
                  key={day}
                  title={status ? status.name : undefined}
                >
                  {status ? (
                    <span className={`day-status-tag is-${status.kind}`}>{status.short}</span>
                  ) : null}
                  <span className="day-en">{info.en}</span>
                  <span className="day-label">{info.label}</span>
                  <span className="day-date">
                    {date ? `${date.getMonth() + 1}/${date.getDate()}` : ""}
                  </span>
                  {eventCount > 0 ? (
                    <span className="day-event-count" title={`${eventCount} 条日程`}>
                      <CalendarDays size={9} />
                      {eventCount}
                    </span>
                  ) : null}
                  {isToday ? <span className="day-now-dot" aria-label="今天" /> : null}
                </div>
              );
            })}
          </div>

          <div className="tt-body">
            <div className="tt-times" aria-hidden="true">
              {semester.periods.map((period) => (
                <div className="tt-time" key={period.index}>
                  <b>{String(period.index).padStart(2, "0")}</b>
                  <span>{period.start}</span>
                  <small>{period.end}</small>
                </div>
              ))}
            </div>

            <div
              className="tt-cols"
              style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
            >
              {days.map((day) => {
                const isToday = showNow && day === todayNumber;
                const status = dayStatuses[day] ?? null;
                const holiday = status?.kind === "holiday";
                return (
                  <div
                    className={`tt-col ${isToday ? "is-today" : ""} ${
                      status ? `is-${status.kind}` : ""
                    }`}
                    key={day}
                  >
                    {semester.periods.map((period) => (
                      <button
                        className="tt-slot"
                        type="button"
                        key={period.index}
                        onClick={() => onAddAt(day, period.index)}
                        disabled={holiday}
                        aria-label={
                          holiday
                            ? `${WEEKDAYS[day - 1].label}第 ${period.index} 节，法定节假日`
                            : `${WEEKDAYS[day - 1].label}第 ${period.index} 节，添加课程`
                        }
                      >
                        {!holiday ? (
                          <span className="tt-slot-plus">
                            <Plus size={12} />
                          </span>
                        ) : null}
                      </button>
                    ))}

                    {holiday ? (
                      <span className="holiday-column-label">{status.name}</span>
                    ) : null}

                    {byDay[day].map((session) => {
                      const duration = session.end - session.start + 1;
                      const ongoing =
                        isToday &&
                        nowProgress !== null &&
                        nowProgress.period >= session.start &&
                        nowProgress.period <= session.end;
                      const conflict = session.columns > 1;
                      return (
                        <button
                          className={`course-block ${ongoing ? "is-ongoing" : ""} ${
                            conflict ? "is-conflict" : ""
                          }`}
                          type="button"
                          style={courseBlockStyle(session)}
                          key={session.id}
                          onClick={() => onSelectCourse(session.course)}
                          title={`${session.course.name}｜${session.course.location || "未填地点"}`}
                        >
                          <span className="course-block-top">
                            <span className="course-block-name">{session.course.name}</span>
                            {conflict ? (
                              <span className="conflict-mark" title="时间冲突">
                                !
                              </span>
                            ) : null}
                            {ongoing && !conflict ? <span className="live-dot" /> : null}
                          </span>
                          <span className="course-block-meta">
                            {session.course.location || "地点待定"}
                          </span>
                          {duration > 2 && session.course.teacher ? (
                            <span className="course-block-foot">
                              {session.course.teacher} · {formatWeeks(session.slot)}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}

                    {isToday && nowTop !== null ? (
                      <span className="now-line" style={{ top: nowTop }} aria-hidden="true">
                        <i />
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
