import { CalendarPlus, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { CalendarDayInfo } from "../lib/holidays";
import { formatWeekRange, WEEKDAYS } from "../lib/date";
import type {
  Period,
  ScheduleEvent,
  Semester,
  Session,
  WeekStats,
} from "../types";
import { toneColor } from "../types";
import { DayView } from "./DayView";
import { TodayRail } from "./TodayRail";

interface AgendaPageProps {
  now: Date;
  week: number;
  currentWeek: number;
  totalWeeks: number;
  semester: Semester;
  dates: Date[];
  days: number[];
  sessions: Session[];
  selectedDay: number;
  selectedEvents: ScheduleEvent[];
  weekEvents: ScheduleEvent[];
  dayStatuses: Record<number, CalendarDayInfo | null>;
  currentDates: Date[];
  currentSessions: Session[];
  currentPeriods: Period[];
  currentStats: WeekStats;
  currentDays: number[];
  currentDayStatuses: Record<number, CalendarDayInfo | null>;
  todayNumber: number;
  todayEvents: ScheduleEvent[];
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onSelectDay: (day: number) => void;
  onSelectCourse: (course: Session["course"]) => void;
  onAddAt: (day: number, start: number) => void;
  onAddEventAt: (date: string) => void;
  onSelectEvent: (event: ScheduleEvent) => void;
}

export function AgendaPage({
  now,
  week,
  currentWeek,
  totalWeeks,
  semester,
  dates,
  days,
  sessions,
  selectedDay,
  selectedEvents,
  weekEvents,
  dayStatuses,
  currentDates,
  currentSessions,
  currentPeriods,
  currentStats,
  currentDays,
  currentDayStatuses,
  todayNumber,
  todayEvents,
  onPrevWeek,
  onNextWeek,
  onToday,
  onSelectDay,
  onSelectCourse,
  onAddAt,
  onAddEventAt,
  onSelectEvent,
}: AgendaPageProps) {
  const selectedDate = dates[selectedDay - 1];
  const dateKey = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(
        selectedDate.getDate(),
      ).padStart(2, "0")}`
    : "";

  return (
    <div className="agenda-page">
      <section className="agenda-hero">
        <div>
          <p className="eyebrow">AGENDA</p>
          <h1>日程与单日表</h1>
          <p className="agenda-sub">
            {formatWeekRange(dates)} · 第 {week} 周 / 共 {totalWeeks} 周
          </p>
        </div>
        <div className="week-switcher" role="group" aria-label="切换周次">
          <button type="button" onClick={onPrevWeek} disabled={week <= 1} aria-label="上一周">
            <ChevronLeft size={18} />
          </button>
          <button
            className={`week-today ${week === currentWeek ? "is-current" : ""}`}
            type="button"
            onClick={onToday}
            disabled={week === currentWeek}
          >
            {week === currentWeek ? "本周" : "回到本周"}
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            disabled={week >= totalWeeks}
            aria-label="下一周"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <div className="agenda-layout">
        <div className="agenda-main">
          <section className="board agenda-board" aria-label="单日课表">
            <DayView
              semester={semester}
              week={week}
              currentWeek={currentWeek}
              dates={dates}
              days={days}
              sessions={sessions}
              events={selectedEvents}
              dayStatuses={dayStatuses}
              selectedDay={selectedDay}
              now={now}
              onSelectDay={onSelectDay}
              onSelectCourse={onSelectCourse}
              onAddAt={onAddAt}
              onAddEvent={(date) => onAddEventAt(date)}
              onSelectEvent={onSelectEvent}
            />
          </section>

          <section className="agenda-events" aria-label="本周日程列表">
            <div className="agenda-events-head">
              <div>
                <p className="eyebrow">THIS WEEK</p>
                <h2>本周日程</h2>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => onAddEventAt(dateKey)}
              >
                <Plus size={14} />
                添加日程
              </button>
            </div>
            {weekEvents.length > 0 ? (
              <div className="agenda-event-list">
                {weekEvents.map((event) => {
                  const [, month, date] = event.date.split("-");
                  const weekday = WEEKDAYS[new Date(`${event.date}T00:00:00`).getDay() === 0 ? 7 : new Date(`${event.date}T00:00:00`).getDay()].label;
                  return (
                    <button
                      className="agenda-event-item"
                      type="button"
                      key={event.id}
                      onClick={() => onSelectEvent(event)}
                    >
                      <span
                        className="agenda-event-dot"
                        style={{ background: toneColor(event.tone) }}
                        aria-hidden="true"
                      />
                      <span className="agenda-event-date">
                        <strong>
                          {Number(month)}/{Number(date)}
                        </strong>
                        <small>{weekday}</small>
                      </span>
                      <span className="agenda-event-copy">
                        <strong>{event.title}</strong>
                        {event.note ? <small>{event.note}</small> : null}
                      </span>
                      <span className="agenda-event-time">
                        {event.allDay ? "全天" : event.start}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="agenda-events-empty">
                <CalendarPlus size={17} />
                <span>这一周还没有日程。点右上角「添加日程」记一笔。</span>
              </div>
            )}
          </section>
        </div>

        <TodayRail
          now={now}
          currentWeek={currentWeek}
          totalWeeks={totalWeeks}
          weekDates={currentDates}
          sessions={currentSessions}
          periods={currentPeriods}
          stats={currentStats}
          days={currentDays}
          holiday={currentDayStatuses[todayNumber] ?? null}
          events={todayEvents}
          onSelectCourse={onSelectCourse}
          onSelectEvent={onSelectEvent}
          onAddEvent={() => onAddEventAt("")}
        />
      </div>
    </div>
  );
}
