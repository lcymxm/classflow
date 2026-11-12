import {
  ArrowUpRight,
  CalendarPlus,
  Clock,
  Coffee,
  MapPin,
  Sparkles,
} from "lucide-react";
import type { CSSProperties } from "react";
import type {
  Period,
  ScheduleEvent,
  Session,
  WeekStats,
} from "../types";
import { toneColor } from "../types";
import type { CalendarDayInfo } from "../lib/holidays";
import {
  formatDateWithWeekday,
  formatMonthDay,
  getWeekdayNumber,
  WEEKDAYS,
} from "../lib/date";
import { getNextSession, isSessionNow } from "../lib/schedule";

interface TodayRailProps {
  now: Date;
  currentWeek: number;
  totalWeeks: number;
  weekDates: Date[];
  sessions: Session[];
  periods: Period[];
  stats: WeekStats;
  days: number[];
  holiday: CalendarDayInfo | null;
  events: ScheduleEvent[];
  onSelectCourse: (course: Session["course"]) => void;
  onSelectEvent: (event: ScheduleEvent) => void;
  onAddEvent: () => void;
}

function countdownLabel(target: Date, now: Date, startTime: string): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const days = Math.round((targetDay.getTime() - today.getTime()) / 86_400_000);
  if (days === 1) return `明天 ${startTime} 开始`;
  if (days > 1) return `${target.getMonth() + 1}月${target.getDate()}日 ${startTime} 开始`;
  const minutes = Math.max(0, Math.round((target.getTime() - now.getTime()) / 60000));
  if (minutes < 60) return `${minutes} 分钟后`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} 小时 ${rest} 分钟后` : `${hours} 小时后`;
}

function endDate(session: Session, date: Date, periods: Period[]): Date {
  const end = periods[session.end - 1]?.end ?? "23:59";
  const [hours, minutes] = end.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
}

function startDate(session: Session, date: Date, periods: Period[]): Date {
  const start = periods[session.start - 1]?.start ?? "00:00";
  const [hours, minutes] = start.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
}

export function TodayRail({
  now,
  currentWeek,
  totalWeeks,
  weekDates,
  sessions,
  periods,
  stats,
  days,
  holiday,
  events,
  onSelectCourse,
  onSelectEvent,
  onAddEvent,
}: TodayRailProps) {
  const todayNumber = getWeekdayNumber(now);
  const todaySessions = sessions.filter((session) => session.day === todayNumber);
  const next = getNextSession(sessions, weekDates, periods, now);
  const maxDayCount = Math.max(1, ...days.map((day) => sessions.filter((s) => s.day === day).length));
  const nextStart = next ? startDate(next.session, next.date, periods) : null;
  const nextEnd = next ? endDate(next.session, next.date, periods) : null;

  return (
    <aside className="today-rail" aria-label="今日与本周">
      <section className="today-card">
        <div className="today-card-glow" aria-hidden="true" />
        <div className="today-head">
          <div>
            <p className="rail-eyebrow">TODAY</p>
            <h2>{WEEKDAYS[todayNumber - 1].label}</h2>
          </div>
          <div className="today-date">
            <strong>{now.getDate()}</strong>
            <span>{now.getMonth() + 1}月</span>
          </div>
        </div>
        <p className="today-full-date">{formatDateWithWeekday(now)}</p>

        <div className="today-divider" />

        {holiday ? (
          <div className={`today-holiday is-${holiday.kind}`}>
            <Sparkles size={17} />
            <div>
              <strong>{holiday.name}</strong>
              <span>{holiday.kind === "holiday" ? "今天放假，课程自动隐藏。" : "调休上班日。"}</span>
            </div>
          </div>
        ) : todaySessions.length === 0 ? (
          <div className="today-empty">
            <Coffee size={18} />
            <div>
              <strong>今天没有课</strong>
              <span>给自己留一点空白。</span>
            </div>
          </div>
        ) : (
          <ul className="today-list">
            {todaySessions.map((session) => {
              const start = periods[session.start - 1]?.start ?? "";
              const end = periods[session.end - 1]?.end ?? "";
              const active = isSessionNow(session, periods, now, now);
              return (
                <li key={session.id}>
                  <button
                    className={`today-class ${active ? "is-active" : ""}`}
                    type="button"
                    onClick={() => onSelectCourse(session.course)}
                  >
                    <span className="today-class-time">
                      {start}
                      <small>{end}</small>
                    </span>
                    <span
                      className="today-class-dot"
                      style={{ background: toneColor(session.course.tone) }}
                    />
                    <span className="today-class-copy">
                      <strong>{session.course.name}</strong>
                      <span>{session.course.location || "地点待定"}</span>
                    </span>
                    {active ? <span className="live-badge">现在</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {events.length > 0 ? (
          <div className="today-events">
            <div className="today-events-head">
              <span>今日日程</span>
              <button className="today-events-add" type="button" onClick={onAddEvent} aria-label="添加日程">
                <CalendarPlus size={13} />
              </button>
            </div>
            {events.map((event) => (
              <button
                className="today-event"
                type="button"
                key={event.id}
                style={{ "--tone": toneColor(event.tone) } as CSSProperties}
                onClick={() => onSelectEvent(event)}
              >
                <span className="today-event-time">
                  {event.allDay ? "全天" : event.start}
                </span>
                <span className="today-event-dot" aria-hidden="true" />
                <span className="today-event-title">{event.title}</span>
              </button>
            ))}
          </div>
        ) : (
          <button className="today-add-event" type="button" onClick={onAddEvent}>
            <CalendarPlus size={13} />
            添加一条今日日程
          </button>
        )}

        <p className="today-foot">
          {currentWeek} / {totalWeeks} 周 <span>·</span>{" "}
          {weekDates[0] ? formatMonthDay(weekDates[0]) : ""}
        </p>
      </section>

      <section className="rail-card next-card">
        <div className="rail-card-head">
          <p className="rail-eyebrow">{next?.state === "ongoing" ? "IN CLASS" : "UP NEXT"}</p>
          <span className="rail-icon">
            {next?.state === "ongoing" ? <ArrowUpRight size={15} /> : <Clock size={15} />}
          </span>
        </div>
        {next ? (
          <>
            <h3>{next.session.course.name}</h3>
            <p className="next-meta">
              <span>{WEEKDAYS[next.session.day - 1].label}</span>
              <span>
                {periods[next.session.start - 1]?.start} – {periods[next.session.end - 1]?.end}
              </span>
              {next.session.course.location ? (
                <span>
                  <MapPin size={11} />
                  {next.session.course.location}
                </span>
              ) : null}
            </p>
            <p className={`next-status ${next.state === "ongoing" ? "is-live" : ""}`}>
              {next.state === "ongoing" && nextEnd
                ? `还剩 ${Math.max(0, Math.round((nextEnd.getTime() - now.getTime()) / 60000))} 分钟`
                : nextStart
                  ? countdownLabel(
                      nextStart,
                      now,
                      periods[next.session.start - 1]?.start ?? "",
                    )
                  : ""}
            </p>
          </>
        ) : (
          <>
            <h3>本周已收尾</h3>
            <p className="next-empty">去喝杯水，或者提前看看下一周。</p>
          </>
        )}
      </section>

      <section className="rail-card week-summary">
        <div className="rail-card-head">
          <p className="rail-eyebrow">WEEK LOAD</p>
          <span className="summary-number">{stats.sessionCount} 节</span>
        </div>
        <div className="load-chart" aria-label="每日课程数量">
          {days.map((day) => {
            const count = sessions.filter((session) => session.day === day).length;
            return (
              <div className={`load-bar ${day === todayNumber ? "is-today" : ""}`} key={day}>
                <div className="load-track">
                  <span style={{ height: `${Math.max(6, (count / maxDayCount) * 100)}%` }} />
                </div>
                <small>{WEEKDAYS[day - 1].short}</small>
                <em>{count}</em>
              </div>
            );
          })}
        </div>
        <p className="week-summary-foot">
          {stats.busiestDay
            ? `最忙的是${WEEKDAYS[stats.busiestDay - 1].label}，${stats.busiestCount} 节课。`
            : "本周还没有安排课程。"}
        </p>
      </section>
    </aside>
  );
}
