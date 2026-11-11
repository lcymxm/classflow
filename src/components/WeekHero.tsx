import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WeekStats } from "../types";
import { formatWeekRange } from "../lib/date";
import { minutesToHoursLabel } from "../lib/transfer";

interface WeekHeroProps {
  week: number;
  currentWeek: number;
  totalWeeks: number;
  dates: Date[];
  stats: WeekStats;
  termState: "before" | "during" | "after";
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function WeekHero({
  week,
  currentWeek,
  totalWeeks,
  dates,
  stats,
  termState,
  onPrev,
  onNext,
  onToday,
}: WeekHeroProps) {
  const atCurrentWeek = week === currentWeek;
  const isCurrent = atCurrentWeek && termState === "during";
  const statusLabel =
    termState === "before" ? "学期尚未开始" : termState === "after" ? "学期已结束" : null;

  return (
    <section className="week-hero">
      <div className="hero-copy">
        <p className="hero-kicker">
          <span className="kicker-line" />
          WEEK {String(week).padStart(2, "0")} / {String(totalWeeks).padStart(2, "0")}
        </p>
        <h1 className="hero-title">
          <span>第</span>
          <strong>{week}</strong>
          <span>周</span>
        </h1>
        <div className="hero-subline">
          <span className="hero-range">{formatWeekRange(dates)}</span>
          {statusLabel ? <span className="hero-status">{statusLabel}</span> : null}
          {isCurrent ? (
            <span className="hero-current">
              <span className="pulse-dot" aria-hidden="true" />
              本周
            </span>
          ) : null}
        </div>
        <div className="hero-stats" aria-label="本周概览">
          <span>
            <strong>{stats.courseCount}</strong> 门课程
          </span>
          <i aria-hidden="true" />
          <span>
            <strong>{stats.sessionCount}</strong> 节课
          </span>
          <i aria-hidden="true" />
          <span>{minutesToHoursLabel(stats.minutes)}</span>
        </div>
      </div>

      <div className="hero-actions">
        <div className="week-switcher" role="group" aria-label="切换周次">
          <button type="button" onClick={onPrev} disabled={week <= 1} aria-label="上一周">
            <ChevronLeft size={18} />
          </button>
          <button
            className={`week-today ${atCurrentWeek ? "is-current" : ""}`}
            type="button"
            onClick={onToday}
            disabled={atCurrentWeek}
          >
            {atCurrentWeek ? "本周" : "回到本周"}
          </button>
          <button type="button" onClick={onNext} disabled={week >= totalWeeks} aria-label="下一周">
            <ChevronRight size={18} />
          </button>
        </div>
        <p className="hero-hint">
          <kbd>←</kbd>
          <kbd>→</kbd>
          切换周次
        </p>
      </div>
    </section>
  );
}
