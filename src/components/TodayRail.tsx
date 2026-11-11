import { ArrowUpRight, Clock, Coffee, MapPin } from "lucide-react";
import type { Period, Session, WeekStats } from "../types";
import { toneColor } from "../types";
import {
  formatDateWithWeekday,
  formatMonthDay,
  getWeekdayNumber,
  WEEKDAYS,
} from "../lib/date";
import { daysForSemester, getNextSession, isSessionNow } from "../lib/schedule";

interface TodayRailProps {
  now: Date;
  currentWeek: number;
  totalWeeks: number;
  weekDates: Date[];
  sessions: Session[];
  periods: Period[];
  stats: WeekStats;
  showWeekends: boolean;
  onSelectCourse: (course: Session["course"]) => void;
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
  showWeekends,
  onSelectCourse,
}: TodayRailProps) {
  const todayNumber = getWeekdayNumber(now);
  const todaySessions = sessions.filter((session) => session.day === todayNumber);
  const next = getNextSession(sessions, weekDates, periods, now);
  const visibleDays = daysForSemester(showWeekends);
  const maxDayCount = Math.max(1, ...visibleDays.map((day) => sessions.filter((s) => s.day === day).length));
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

        {todaySessions.length === 0 ? (
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
        <p className="today-foot">
          {currentWeek} / {totalWeeks} 周 <span>·</span> {weekDates[0] ? formatMonthDay(weekDates[0]) : ""}
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
          {visibleDays.map((day) => {
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
