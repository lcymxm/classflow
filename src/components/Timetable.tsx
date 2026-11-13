import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CalendarDays, CalendarPlus, Plus, Sparkles } from "lucide-react";
import type { Course, LaidOutSession, Session, Semester } from "../types";
import { toneColor } from "../types";
import { formatWeeks, getPeriodNowProgress, groupSessionsByDay } from "../lib/schedule";
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
  calendarSummary: { holidays: string[]; workdays: string[] };
  now: Date;
  onSelectCourse: (course: Course) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
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
  calendarSummary,
  now,
  onSelectCourse,
  onPrevWeek,
  onNextWeek,
  onAddAt,
  onAddCourse,
}: TimetableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [swiping, setSwiping] = useState(false);
  const swipeStart = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const byDay = useMemo(() => groupSessionsByDay(sessions), [sessions]);
  const todayNumber = getWeekdayNumber(now);
  const showNow = week === currentWeek && days.includes(todayNumber);
  const nowProgress = getPeriodNowProgress(semester.periods, now);
  const nowTop = nowProgress
    ? (nowProgress.period - 1 + nowProgress.fraction) * ROW_HEIGHT
    : null;

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

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" || event.button !== 0) return;
    swipeStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) setSwiping(true);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    setSwiping(false);
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    suppressClick.current = true;
    if (dx < 0 && week < semester.totalWeeks) onNextWeek();
    if (dx > 0 && week > 1) onPrevWeek();
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 400);
  };

  const onClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick.current = false;
  };

  if (courses.length === 0) {
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

  const renderGrid = (gridDays: number[], keyPrefix: string) => (
    <div
      className="timetable"
      key={keyPrefix}
      style={
        {
          "--row-height": `${ROW_HEIGHT}px`,
          "--day-count": gridDays.length,
        } as CSSProperties
      }
    >
      <div className="tt-head">
        <div className="tt-corner">
          <span>节次</span>
          <small>TIME</small>
        </div>
        {gridDays.map((day) => {
          const info = WEEKDAYS[day - 1];
          const date = dates[day - 1];
          const isToday = showNow && day === todayNumber;
          const status = dayStatuses[day] ?? null;
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
          style={{ gridTemplateColumns: `repeat(${gridDays.length}, minmax(0, 1fr))` }}
        >
          {gridDays.map((day) => {
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

                {holiday ? <span className="holiday-column-label">{status.name}</span> : null}

                {(byDay[day] ?? []).map((session) => {
                  const ongoing =
                    isToday &&
                    nowProgress !== null &&
                    nowProgress.period >= session.start &&
                    nowProgress.period <= session.end;
                  const conflict = session.columns > 1;
                  const single = session.start === session.end;
                  return (
                    <button
                      className={`course-block ${ongoing ? "is-ongoing" : ""} ${
                        conflict ? "is-conflict" : ""
                      } ${single ? "is-single" : ""}`}
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
                      {session.course.teacher ? (
                        <span className="course-block-teacher">@{session.course.teacher}</span>
                      ) : null}
                      <span className="course-block-weeks">
                        {formatWeeks(session.slot)} · 第 {session.start}
                        {session.end !== session.start ? `–${session.end}` : ""} 节
                      </span>
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
  );

  return (
    <div
      className={`timetable-zone ${swiping ? "is-swiping" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        swipeStart.current = null;
        setSwiping(false);
      }}
      onClickCapture={onClickCapture}
    >
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

      <div className="timetable-scroll" ref={scrollRef}>
        {renderGrid(days, "full-week")}
      </div>

    </div>
  );
}
