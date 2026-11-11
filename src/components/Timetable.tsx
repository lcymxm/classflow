import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { CalendarPlus, Plus, Sparkles } from "lucide-react";
import type { Course, LaidOutSession, Semester } from "../types";
import { toneColor } from "../types";
import {
  daysForSemester,
  formatWeeks,
  getPeriodNowProgress,
  groupSessionsByDay,
  buildSessions,
} from "../lib/schedule";
import { getWeekdayNumber, WEEKDAYS } from "../lib/date";

const ROW_HEIGHT = 58;

interface TimetableProps {
  semester: Semester;
  week: number;
  currentWeek: number;
  dates: Date[];
  courses: Course[];
  now: Date;
  onSelectCourse: (course: Course) => void;
  onAddAt: (day: number, start: number) => void;
  onAddCourse: () => void;
}

function courseBlockStyle(session: LaidOutSession): CSSProperties {
  const top = (session.start - 1) * ROW_HEIGHT + 4;
  const height = (session.end - session.start + 1) * ROW_HEIGHT - 8;
  const left = `calc(${(session.column / session.columns) * 100}% + 4px)`;
  const width = `calc(${100 / session.columns}% - 8px)`;
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
  courses,
  now,
  onSelectCourse,
  onAddAt,
  onAddCourse,
}: TimetableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => daysForSemester(semester.showWeekends), [semester.showWeekends]);
  const sessions = useMemo(() => buildSessions(courses, week), [courses, week]);
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

  if (courses.length === 0) {
    return (
      <div className="blank-board">
        <span className="blank-board-icon">
          <Sparkles size={22} />
        </span>
        <p className="eyebrow">A FRESH START</p>
        <h3>课表还是空的</h3>
        <p>把第一门课放进来，这一周就开始有形状了。</p>
        <button className="primary-button" type="button" onClick={onAddCourse}>
          <Plus size={16} />
          添加第一门课
        </button>
      </div>
    );
  }

  return (
    <div className="timetable-zone">
      {sessions.length === 0 ? (
        <div className="week-empty">
          <CalendarPlus size={16} />
          <span>这一周还没有课。可能是课程不在本周的周次内，点空白格也可以直接添加。</span>
        </div>
      ) : null}

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
              return (
                <div className={`tt-day-head ${isToday ? "is-today" : ""}`} key={day}>
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
              style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
            >
              {days.map((day) => {
                const isToday = showNow && day === todayNumber;
                return (
                  <div className={`tt-col ${isToday ? "is-today" : ""}`} key={day}>
                    {semester.periods.map((period) => (
                      <button
                        className="tt-slot"
                        type="button"
                        key={period.index}
                        onClick={() => onAddAt(day, period.index)}
                        aria-label={`${WEEKDAYS[day - 1].label}第 ${period.index} 节，添加课程`}
                      >
                        <span className="tt-slot-plus">
                          <Plus size={12} />
                        </span>
                      </button>
                    ))}

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
                          className={`course-block ${ongoing ? "is-ongoing" : ""} ${conflict ? "is-conflict" : ""}`}
                          type="button"
                          style={courseBlockStyle(session)}
                          key={session.id}
                          onClick={() => onSelectCourse(session.course)}
                          title={`${session.course.name}｜${session.course.location || "未填地点"}`}
                        >
                          <span className="course-block-top">
                            <span className="course-block-name">{session.course.name}</span>
                            {conflict ? <span className="conflict-mark" title="时间冲突">!</span> : null}
                            {ongoing && !conflict ? <span className="live-dot" /> : null}
                          </span>
                          {duration > 1 ? (
                            <span className="course-block-meta">
                              {session.course.location || "地点待定"}
                            </span>
                          ) : null}
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
